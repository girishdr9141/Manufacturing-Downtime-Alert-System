import json
import boto3
import os
import logging
import uuid
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE')

def log_audit(action, ticket_id):
    if AUDIT_TABLE:
        try:
            table = dynamodb.Table(AUDIT_TABLE)
            table.put_item(Item={
                'Timestamp': str(datetime.utcnow().timestamp()),
                'Action': action,
                'TicketID': ticket_id,
                'User': 'AI_Agent',
                'ReadableTime': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")

def lambda_handler(event, context):
    """
    Triggered by DynamoDB Streams when a new ticket is INSERTED.
    Simulates a Generative AI Agent reading the ticket error and 
    attaching a step-by-step Runbook to the ticket.
    """
    logger.info("AI Diagnostic Engine Triggered via DynamoDB Stream.")
    
    if not DYNAMODB_TICKET_TABLE:
        return
        
    table = dynamodb.Table(DYNAMODB_TICKET_TABLE)

    try:
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb'].get('NewImage', {})
                ticket_id = new_image.get('TicketID', {}).get('S')
                status = new_image.get('MachineState', {}).get('S', '')
                
                logger.info(f"Analyzing Ticket {ticket_id} for AI Runbook generation...")

                # Simulate AI generating a runbook based on the error state
                runbook = ""
                if "CRITICAL" in status:
                    runbook = "AI DIAGNOSTIC: 1. Immediately isolate power to the RF generator. 2. Check coolant fluid levels (Expected > 80%). 3. Inspect primary cooling fan for blockages. 4. If fan is clear, replace thermal sensor T-04."
                elif "ERROR_POWER" in status:
                    runbook = "AI DIAGNOSTIC: 1. Verify main breaker panel B-12. 2. Test input voltage across phases (Expected 480V). 3. If voltage is present, replace internal power supply unit (PSU-A1)."
                elif "PREDICTIVE" in status:
                    runbook = "AI DIAGNOSTIC: 1. Vibration anomaly detected in primary drive shaft. 2. Schedule downtime within 48 hours. 3. Replace ceramic bearings (Part #BR-992). 4. Re-calibrate alignment."
                else:
                    runbook = "AI DIAGNOSTIC: Standard visual inspection required."

                # Update the ticket with the AI Runbook
                table.update_item(
                    Key={'TicketID': ticket_id},
                    UpdateExpression="set AIRunbook = :r",
                    ExpressionAttributeValues={':r': runbook}
                )
                
                logger.info(f"Successfully attached AI Runbook to ticket {ticket_id}")
                log_audit("AI_RUNBOOK_GENERATED", ticket_id)
                
        return {'statusCode': 200, 'body': 'AI Diagnostics complete'}

    except Exception as e:
        logger.error(f"Error in AI Diagnostics: {str(e)}")
        raise e
