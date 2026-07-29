import json
import boto3
import os
import logging
import random
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE')

def log_audit(action, ticket_id, user):
    """Writes an immutable log entry to the Audit table."""
    if AUDIT_TABLE:
        try:
            table = dynamodb.Table(AUDIT_TABLE)
            table.put_item(Item={
                'Timestamp': str(datetime.utcnow().timestamp()),
                'Action': action,
                'TicketID': ticket_id,
                'User': user,
                'ReadableTime': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
            })
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

def lambda_handler(event, context):
    """
    API Gateway triggers this function via PUT /tickets
    Body: { "ticket_id": "INC-1234", "action": "RESOLVE", "assigned_to": "John Doe" }
    """
    logger.info(f"Received PUT request: {event.get('body')}")
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }

    try:
        if not DYNAMODB_TICKET_TABLE:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps("Table name not configured.")}

        body = json.loads(event.get('body', '{}'))
        ticket_id = body.get('ticket_id')
        action = body.get('action')
        assigned_to = body.get('assigned_to')
        user = event.get('headers', {}).get('Authorization', 'Guest') # Simulated Auth User

        if not ticket_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps("Missing ticket_id")}

        table = dynamodb.Table(DYNAMODB_TICKET_TABLE)

        if action == 'RESOLVE':
            # Generate random resolution notes
            resolution_notes_list = [
                "Recalibrated thermal sensors and flushed coolant system.",
                "Replaced worn bearings and verified RPM stability during load test.",
                "Cleared hardware fault cache and restarted edge telemetry agent.",
                "Tightened mechanical couplings and verified vibration limits.",
                "Performed emergency OTA firmware rollback to stable version.",
                "Inspected power feed, replaced blown fuse, and restored full power."
            ]
            final_note = body.get('notes') or random.choice(resolution_notes_list)
            
            # Update ticket status to RESOLVED
            table.update_item(
                Key={'TicketID': ticket_id},
                UpdateExpression="set #s = :s, ResolvedAt = :r, ResolvedBy = :u, ResolutionNotes = :n",
                ExpressionAttributeNames={'#s': 'Status'},
                ExpressionAttributeValues={
                    ':s': 'RESOLVED', 
                    ':r': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'), 
                    ':u': user,
                    ':n': final_note
                }
            )
            log_audit("TICKET_RESOLVED", ticket_id, user)
            
        elif action == 'ASSIGN':
            # Assign ticket to a technician
            table.update_item(
                Key={'TicketID': ticket_id},
                UpdateExpression="set AssignedTo = :a",
                ExpressionAttributeValues={':a': assigned_to}
            )
            log_audit(f"TICKET_ASSIGNED_TO_{assigned_to}", ticket_id, user)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': f"Ticket {ticket_id} successfully updated."})
        }

    except Exception as e:
        logger.error(f"Error updating ticket: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(f"Internal Server Error: {str(e)}")
        }
