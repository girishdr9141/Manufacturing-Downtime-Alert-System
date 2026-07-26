import json
import boto3
import os
import uuid
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

DYNAMODB_MACHINE_TABLE = os.environ.get('DYNAMODB_MACHINE_TABLE')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')

def lambda_handler(event, context):
    logger.info(f"Received telemetry data: {json.dumps(event)}")
    
    try:
        # Support both API Gateway proxy integration (body) and direct invocation
        body = event.get('body')
        if body:
            if isinstance(body, str):
                payload = json.loads(body)
            else:
                payload = body
        else:
            payload = event

        machine_id = payload.get('machine_id', 'UNKNOWN')
        status = payload.get('status', 'HEALTHY')
        temperature = payload.get('temperature', 0.0)
        vibration = payload.get('vibration', 0.0)
        
        timestamp = datetime.utcnow()
        last_ping = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        # 1. Update Machine State
        if DYNAMODB_MACHINE_TABLE:
            table = dynamodb.Table(DYNAMODB_MACHINE_TABLE)
            table.put_item(Item={
                'MachineID': machine_id,
                'Name': payload.get('name', f'Edge Node {machine_id}'),
                'Location': payload.get('location', 'Factory Floor'),
                'x': str(payload.get('x', 50)),
                'y': str(payload.get('y', 50)),
                'Status': status,
                'Temperature': str(temperature),
                'Vibration': str(vibration),
                'PowerKW': str(payload.get('power_kw', 0.0)),
                'RPM': str(payload.get('rpm', 0)),
                'Firmware': payload.get('firmware', 'v1.0.0'),
                'IPAddress': payload.get('ip_address', '127.0.0.1'),
                'LastPing': last_ping
            })
            logger.info(f"Updated Machine State: {machine_id}")

        # 2. Automatically Create Tickets for Anomalies
        if DYNAMODB_TICKET_TABLE and status in ['ERROR', 'CRITICAL_WARNING', 'PREDICTIVE_MAINTENANCE_REQUIRED', 'ERROR_POWER_LOSS']:
            # First, check if there is already an OPEN ticket for this machine
            ticket_table = dynamodb.Table(DYNAMODB_TICKET_TABLE)
            response = ticket_table.scan(
                FilterExpression="MachineID = :m and #s = :s",
                ExpressionAttributeNames={"#s": "Status"},
                ExpressionAttributeValues={":m": machine_id, ":s": "OPEN"}
            )
            
            if len(response.get('Items', [])) == 0:
                # No open ticket, create one!
                ticket_id = f"INC-{str(uuid.uuid4())[:8].upper()}"
                
                description = f"Machine entered state {status}."
                if "PREDICTIVE" in status:
                    description = f"PREDICTIVE MAINTENANCE ALERT: Vibration reached {vibration}Hz. Replace bearings immediately."
                elif "OVERHEAT" in status or temperature > 95:
                    description = f"OVERHEAT ALERT: Temperature reached {temperature}C."
                elif "POWER" in status:
                    description = f"POWER FAILURE DETECTED."

                # AI Diagnostic Engine (Simulated)
                runbook = "AI DIAGNOSTIC: Standard visual inspection required."
                if "CRITICAL" in status or temperature > 95:
                    runbook = "AI DIAGNOSTIC: 1. Immediately isolate power. 2. Check coolant fluid levels. 3. Inspect primary cooling fan for blockages. 4. If fan is clear, replace thermal sensor."
                elif "ERROR_POWER" in status:
                    runbook = "AI DIAGNOSTIC: 1. Verify main breaker panel. 2. Test input voltage across phases. 3. If voltage is present, replace internal PSU."
                elif "PREDICTIVE" in status:
                    runbook = "AI DIAGNOSTIC: 1. Vibration anomaly detected in primary drive shaft. 2. Schedule downtime within 48 hours. 3. Replace ceramic bearings. 4. Re-calibrate alignment."

                ticket_table.put_item(Item={
                    'TicketID': ticket_id,
                    'MachineID': machine_id,
                    'CreatedAt': last_ping,
                    'Priority': 'P1' if 'CRITICAL' in status or 'POWER' in status else 'P2',
                    'Status': 'OPEN',
                    'ReportedTemperature': str(temperature),
                    'MachineState': status,
                    'Description': description,
                    'AIRunbook': runbook
                })
                logger.info(f"Created Automated Ticket: {ticket_id}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({'message': 'Telemetry processed successfully'})
        }

    except Exception as e:
        logger.error(f"Error processing telemetry: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
