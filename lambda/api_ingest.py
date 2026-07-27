import json
import boto3
import os
import uuid
import logging
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

MACHINES_TABLE    = os.environ.get('MACHINES_TABLE')
TICKETS_TABLE     = os.environ.get('TICKETS_TABLE')
HISTORY_TABLE     = os.environ.get('HISTORY_TABLE')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')
WS_ENDPOINT       = os.environ.get('WS_ENDPOINT', '')


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def broadcast_to_connections(payload_dict):
    """Push a JSON message to every connected WebSocket client."""
    if not CONNECTIONS_TABLE or not WS_ENDPOINT:
        return

    client = boto3.client('apigatewaymanagementapi', endpoint_url=WS_ENDPOINT)
    table  = dynamodb.Table(CONNECTIONS_TABLE)

    response = table.scan()
    items    = response.get('Items', [])
    machine_id = payload_dict.get('machine_id')

    msg = json.dumps({"type": "TELEMETRY_UPDATE", "data": payload_dict}, cls=DecimalEncoder)

    for item in items:
        conn_id    = item.get('ConnectionId')
        role       = item.get('Role')
        sub_machine = item.get('MachineID')

        if role == 'Admin' or (role == 'Operator' and sub_machine == machine_id):
            try:
                client.post_to_connection(ConnectionId=conn_id, Data=msg.encode('utf-8'))
            except client.exceptions.GoneException:
                table.delete_item(Key={'ConnectionId': conn_id})
            except Exception as e:
                logger.error(f"Broadcast failed to {conn_id}: {e}")


def lambda_handler(event, context):
    try:
        body = event.get('body')
        if body:
            payload = json.loads(body) if isinstance(body, str) else body
        else:
            payload = event

        machine_id  = payload.get('machine_id', 'UNKNOWN')
        status      = payload.get('status', 'HEALTHY')
        temperature = float(payload.get('temperature', 0.0))
        vibration   = float(payload.get('vibration', 0.0))

        timestamp = datetime.utcnow()
        last_ping = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        dec_temp = Decimal(str(round(temperature, 4)))
        dec_vib  = Decimal(str(round(vibration, 4)))

        # 1. Upsert machine state
        if MACHINES_TABLE:
            dynamodb.Table(MACHINES_TABLE).put_item(Item={
                'MachineID':  machine_id,
                'Name':       payload.get('name', f'Edge Node {machine_id}'),
                'Location':   payload.get('location', 'Factory Floor'),
                'x':          str(payload.get('x', 50)),
                'y':          str(payload.get('y', 50)),
                'Status':     status,
                'Temperature': dec_temp,
                'Vibration':  dec_vib,
                'PowerKW':    Decimal(str(round(float(payload.get('power_kw', 0.0)), 4))),
                'RPM':        Decimal(str(int(payload.get('rpm', 0)))),
                'Firmware':   payload.get('firmware', 'v1.0.0'),
                'IPAddress':  payload.get('ip_address', '127.0.0.1'),
                'LastPing':   last_ping
            })

        # 2. Append to history
        if HISTORY_TABLE:
            dynamodb.Table(HISTORY_TABLE).put_item(Item={
                'MachineID':   machine_id,
                'Timestamp':   last_ping,
                'Temperature': dec_temp,
                'Vibration':   dec_vib,
                'Status':      status
            })

        # 3. Auto-generate tickets for anomalies
        is_anomaly = ('CRITICAL' in status or 'ERROR' in status or 'PREDICTIVE' in status)
        if TICKETS_TABLE and is_anomaly:
            ticket_table = dynamodb.Table(TICKETS_TABLE)

            # Use proper boto3 Attr filter — NOT a raw string
            res = ticket_table.scan(
                FilterExpression=Attr('MachineID').eq(machine_id) & Attr('Status').eq('OPEN')
            )

            if len(res.get('Items', [])) == 0:
                ticket_id = f"INC-{str(uuid.uuid4())[:8].upper()}"
                priority  = 'P1' if 'CRITICAL' in status else 'P2'

                if 'CRITICAL' in status or temperature > 95:
                    runbook = ("1. IMMEDIATELY isolate machine power.\n"
                               "2. Check coolant fluid levels and thermal sensor.\n"
                               "3. Notify supervisor before restarting.")
                elif 'ERROR' in status:
                    runbook = ("1. Check power feed and circuit breakers.\n"
                               "2. Inspect for physical damage or loose connections.\n"
                               "3. Run diagnostic self-test before restart.")
                else:
                    runbook = "AI DIAGNOSTIC: Schedule preventive maintenance within 24 hours."

                ticket_table.put_item(Item={
                    'TicketID':    ticket_id,
                    'MachineID':   machine_id,
                    'CreatedAt':   last_ping,
                    'Priority':    priority,
                    'Status':      'OPEN',
                    'MachineState': status,
                    'Description': f"Anomaly detected on {machine_id}: {status}. Temp: {temperature}°C",
                    'AIRunbook':   runbook
                })
                logger.info(f"Ticket created: {ticket_id} for {machine_id} ({status})")

                # Alert all connected admins via WebSocket
                broadcast_to_connections({
                    "action":     "NEW_TICKET",
                    "ticket_id":  ticket_id,
                    "machine_id": machine_id,
                    "priority":   priority,
                    "status":     status
                })

        # 4. Broadcast live telemetry to connected clients
        broadcast_to_connections({
            "machine_id":  machine_id,
            "status":      status,
            "temperature": temperature,
            "vibration":   vibration,
            "power_kw":    float(payload.get('power_kw', 0.0)),
            "rpm":         int(payload.get('rpm', 0)),
            "x":           payload.get('x', 50),
            "y":           payload.get('y', 50),
            "lastPing":    last_ping
        })

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Processed', 'machine': machine_id, 'status': status})
        }

    except Exception as e:
        logger.error(f"FATAL error processing telemetry: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
