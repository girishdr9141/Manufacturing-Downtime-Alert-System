import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
ARCHIVE_BUCKET_NAME = os.environ.get('ARCHIVE_BUCKET_NAME')

def lambda_handler(event, context):
    """
    Triggered by a DynamoDB Stream when a ticket is updated to RESOLVED.
    Archives the ticket to S3 Cold Storage for compliance.
    """
    logger.info("DynamoDB Stream Triggered for Archiving.")
    
    if not ARCHIVE_BUCKET_NAME:
        logger.warning("ARCHIVE_BUCKET_NAME not set. Skipping archive.")
        return

    try:
        for record in event['Records']:
            if record['eventName'] == 'MODIFY':
                new_image = record['dynamodb'].get('NewImage', {})
                status = new_image.get('Status', {}).get('S', '')
                
                # Check if it was just changed to RESOLVED
                old_image = record['dynamodb'].get('OldImage', {})
                old_status = old_image.get('Status', {}).get('S', '')

                if status == 'RESOLVED' and old_status != 'RESOLVED':
                    ticket_id = new_image.get('TicketID', {}).get('S', 'UNKNOWN')
                    
                    # Convert DynamoDB JSON to standard JSON for archiving
                    archive_data = {k: list(v.values())[0] for k, v in new_image.items()}
                    
                    file_key = f"archives/{datetime.utcnow().year}/{datetime.utcnow().month}/TICKET_{ticket_id}.json"
                    
                    s3.put_object(
                        Bucket=ARCHIVE_BUCKET_NAME,
                        Key=file_key,
                        Body=json.dumps(archive_data, indent=2)
                    )
                    logger.info(f"Successfully archived {ticket_id} to S3://{ARCHIVE_BUCKET_NAME}/{file_key}")
                    
        return {'statusCode': 200, 'body': 'Archiving complete'}

    except Exception as e:
        logger.error(f"Error archiving ticket: {str(e)}")
        raise e
