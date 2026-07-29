import json
import boto3
import os
import logging
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
TICKETS_TABLE = os.environ.get('TICKETS_TABLE')
HISTORY_TABLE = os.environ.get('HISTORY_TABLE')

def lambda_handler(event, context):
    """
    DELETE /history?machine_id=EDGE-NODE-001
    Deletes all RESOLVED tickets and all telemetry history for the specific machine.
    """
    logger.info("Received DELETE request for history")

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        query_params = event.get('queryStringParameters') or {}
        machine_id = query_params.get('machine_id')

        if not machine_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps("Missing machine_id parameter")}

        # Delete RESOLVED tickets from TICKETS_TABLE
        deleted_tickets_count = 0
        if TICKETS_TABLE:
            tickets_table = dynamodb.Table(TICKETS_TABLE)
            # Scan for resolved tickets for this machine
            response = tickets_table.scan(
                FilterExpression=Attr('MachineID').eq(machine_id) & Attr('Status').eq('RESOLVED')
            )
            for item in response.get('Items', []):
                tickets_table.delete_item(Key={'TicketID': item['TicketID']})
                deleted_tickets_count += 1
                
        # Delete history from HISTORY_TABLE
        deleted_history_count = 0
        if HISTORY_TABLE:
            history_table = dynamodb.Table(HISTORY_TABLE)
            # Query the table if MachineID is Partition Key
            response = history_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('MachineID').eq(machine_id)
            )
            for item in response.get('Items', []):
                history_table.delete_item(Key={
                    'MachineID': item['MachineID'],
                    'Timestamp': item['Timestamp']
                })
                deleted_history_count += 1

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                "message": f"Successfully cleared history for {machine_id}",
                "deleted_tickets": deleted_tickets_count,
                "deleted_telemetry": deleted_history_count
            })
        }

    except Exception as e:
        logger.error(f"Error deleting history: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(f"Internal Server Error: {str(e)}")
        }
