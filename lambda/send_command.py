import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

iot_client = boto3.client('iot-data')
dynamodb = boto3.resource('dynamodb')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE')

def log_audit(action, machine_id, user):
    """Writes an immutable log entry to the Audit table."""
    if AUDIT_TABLE:
        try:
            table = dynamodb.Table(AUDIT_TABLE)
            table.put_item(Item={
                'Timestamp': str(datetime.utcnow().timestamp()),
                'Action': action,
                'MachineID': machine_id,
                'User': user,
                'ReadableTime': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
            })
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

def lambda_handler(event, context):
    """
    API Gateway triggers this function via POST /commands
    Body: { "machine_id": "PLASMA-GEN-001", "command": "EMERGENCY_STOP" }
    """
    logger.info(f"Received Command Request: {event.get('body')}")
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }

    try:
        body = json.loads(event.get('body', '{}'))
        machine_id = body.get('machine_id')
        command = body.get('command')
        user = event.get('headers', {}).get('Authorization', 'Guest')

        if not machine_id or not command:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps("Missing machine_id or command")}

        # Cloud-to-Device Messaging via MQTT
        topic = f"mfg/factory/commands/{machine_id}"
        payload = json.dumps({"command": command, "issuer": user})
        
        iot_client.publish(
            topic=topic,
            qos=1,
            payload=payload.encode('utf-8')
        )
        
        logger.info(f"Successfully published {command} to {topic}")
        log_audit(f"COMMAND_{command}", machine_id, user)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': f"Command {command} successfully sent to {machine_id}."})
        }

    except Exception as e:
        logger.error(f"Error sending command: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(f"Internal Server Error: {str(e)}")
        }
