import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')

def lambda_handler(event, context):
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    # We can pass query parameters to map connection to a specific role/machine
    # ws://api...?role=Admin
    # ws://api...?role=Operator&machine_id=EDGE-NODE-001
    query_params = event.get('queryStringParameters', {})
    role = query_params.get('role', 'Unknown')
    machine_id = query_params.get('machine_id', 'NONE')
    
    logger.info(f"New WebSocket Connect: {connection_id} | Role: {role} | Machine: {machine_id}")
    
    if CONNECTIONS_TABLE:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.put_item(Item={
            'ConnectionId': connection_id,
            'Role': role,
            'MachineID': machine_id
        })
        
    return {'statusCode': 200, 'body': 'Connected.'}
