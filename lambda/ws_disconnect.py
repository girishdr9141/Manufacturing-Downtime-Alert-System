import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')

def lambda_handler(event, context):
    connection_id = event.get('requestContext', {}).get('connectionId')
    logger.info(f"WebSocket Disconnect: {connection_id}")
    
    if CONNECTIONS_TABLE:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        try:
            table.delete_item(Key={'ConnectionId': connection_id})
        except Exception as e:
            logger.error(f"Failed to delete connection: {e}")
            
    return {'statusCode': 200, 'body': 'Disconnected.'}
