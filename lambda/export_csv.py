import json
import boto3
import os
import csv
import io
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE')

def log_audit(action, user):
    """Writes an immutable log entry to the Audit table."""
    if AUDIT_TABLE:
        try:
            table = dynamodb.Table(AUDIT_TABLE)
            table.put_item(Item={
                'Timestamp': str(datetime.utcnow().timestamp()),
                'Action': action,
                'User': user,
                'ReadableTime': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
            })
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

def lambda_handler(event, context):
    """
    API Gateway triggers this function via GET /export
    Returns a downloadable CSV file of all tickets.
    """
    logger.info("Generating CSV Export...")
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "text/csv",
        "Content-Disposition": f"attachment; filename=manufacturing_report_{int(datetime.utcnow().timestamp())}.csv"
    }

    try:
        table = dynamodb.Table(DYNAMODB_TICKET_TABLE)
        response = table.scan()
        tickets = response.get('Items', [])
        
        user = event.get('headers', {}).get('Authorization', 'Manager')
        log_audit("DATA_EXPORTED_CSV", user)

        if not tickets:
            return {'statusCode': 200, 'headers': headers, 'body': "No data available."}

        # Generate CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers based on the keys of the first ticket (adding common ones first to ensure order)
        header_keys = ['TicketID', 'MachineID', 'Status', 'MachineState', 'Priority', 'CreatedAt', 'ResolvedAt', 'ResolvedBy', 'AssignedTo']
        writer.writerow(header_keys)

        for t in tickets:
            row = [t.get(key, 'N/A') for key in header_keys]
            writer.writerow(row)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': output.getvalue()
        }

    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {"Access-Control-Allow-Origin": "*"},
            'body': json.dumps(f"Internal Server Error: {str(e)}")
        }
