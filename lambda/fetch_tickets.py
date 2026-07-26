import json
import boto3
import os
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    API Gateway triggers this function. 
    It scans the DynamoDB tickets table and returns all OPEN tickets to the Frontend UI.
    """
    logger.info("Fetching tickets for Web Portal...")
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    try:
        if not DYNAMODB_TICKET_TABLE:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps("Table name not configured.")}

        table = dynamodb.Table(DYNAMODB_TICKET_TABLE)
        
        # In a real app we'd use Query, but Scan is fine for a small demo table
        response = table.scan()
        tickets = response.get('Items', [])
        
        # Sort tickets by CreatedAt (newest first)
        tickets.sort(key=lambda x: x.get('CreatedAt', ''), reverse=True)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(tickets, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.error(f"Error fetching tickets: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(f"Internal Server Error: {str(e)}")
        }
