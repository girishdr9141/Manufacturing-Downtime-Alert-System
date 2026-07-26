import json
import boto3
import os
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_MACHINE_TABLE = os.environ.get('DYNAMODB_MACHINE_TABLE')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    logger.info("Fetching all machines...")

    if not DYNAMODB_MACHINE_TABLE:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DYNAMODB_MACHINE_TABLE environment variable not set'})
        }

    try:
        table = dynamodb.Table(DYNAMODB_MACHINE_TABLE)
        response = table.scan()
        items = response.get('Items', [])
        
        # Format the items back into frontend types
        machines = []
        for item in items:
            status_raw = item.get('Status', 'HEALTHY')
            # Normalize status to match frontend types (HEALTHY, WARNING, ERROR)
            frontend_status = 'HEALTHY'
            if status_raw in ['ERROR', 'CRITICAL_WARNING', 'ERROR_POWER_LOSS']:
                frontend_status = 'ERROR'
            elif status_raw in ['WARNING', 'PREDICTIVE_MAINTENANCE_REQUIRED']:
                frontend_status = 'WARNING'
                
            machines.append({
                'id': item.get('MachineID'),
                'name': item.get('Name'),
                'location': item.get('Location'),
                'x': float(item.get('x', 50)),
                'y': float(item.get('y', 50)),
                'status': frontend_status,
                'temperature': float(item.get('Temperature', 0)),
                'vibration': float(item.get('Vibration', 0)),
                'power_kw': float(item.get('PowerKW', 0)),
                'rpm': int(item.get('RPM', 0)),
                'firmware': item.get('Firmware', 'Unknown'),
                'lastPing': item.get('LastPing'),
                'ip_address': item.get('IPAddress')
            })

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,GET'
            },
            'body': json.dumps({'machines': machines}, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.error(f"Error fetching machines: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
