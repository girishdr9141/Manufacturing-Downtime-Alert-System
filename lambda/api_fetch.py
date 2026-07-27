import json
import boto3
import os
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
MACHINES_TABLE = os.environ.get('MACHINES_TABLE')
TICKETS_TABLE = os.environ.get('TICKETS_TABLE')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    logger.info("Fetching initial dashboard data...")

    try:
        machines = []
        if MACHINES_TABLE:
            m_table = dynamodb.Table(MACHINES_TABLE)
            m_res = m_table.scan()
            for item in m_res.get('Items', []):
                machines.append({
                    'id': item.get('MachineID'),
                    'name': item.get('Name'),
                    'location': item.get('Location'),
                    'x': float(item.get('x', 0)),
                    'y': float(item.get('y', 0)),
                    'status': item.get('Status'),
                    'temperature': float(item.get('Temperature', 0)),
                    'vibration': float(item.get('Vibration', 0)),
                    'power_kw': float(item.get('PowerKW', 0)),
                    'rpm': int(item.get('RPM', 0)),
                    'firmware': item.get('Firmware'),
                    'ip_address': item.get('IPAddress'),
                    'lastPing': item.get('LastPing')
                })

        tickets = []
        if TICKETS_TABLE:
            t_table = dynamodb.Table(TICKETS_TABLE)
            t_res = t_table.scan()
            for item in t_res.get('Items', []):
                tickets.append({
                    'ticket_id': item.get('TicketID'),
                    'machine_id': item.get('MachineID'),
                    'priority': item.get('Priority'),
                    'status': item.get('Status'),
                    'description': item.get('Description'),
                    'ai_runbook': item.get('AIRunbook'),
                    'created_at': item.get('CreatedAt')
                })

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,GET'
            },
            'body': json.dumps({'machines': machines, 'tickets': tickets}, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.error(f"Error fetching data: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
