import json
import boto3
import os
import uuid
import logging
import urllib.request
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
DYNAMODB_TICKET_TABLE = os.environ.get('DYNAMODB_TICKET_TABLE')
DISCORD_WEBHOOK_URL = os.environ.get('DISCORD_WEBHOOK_URL')

def send_discord_alert(machine_id, status, temperature, ticket_id):
    """Sends a beautifully formatted rich embed to Discord (ChatOps)."""
    if not DISCORD_WEBHOOK_URL:
        return
        
    color = 16711680 if "CRITICAL" in status or "ERROR" in status else 16753920 # Red for Error, Orange for Predictive
    
    payload = {
        "content": "🚨 **New Automated IT Alert** 🚨",
        "embeds": [{
            "title": f"Machine Incident: {machine_id}",
            "description": f"Automated alert triggered by IoT Rule. A ticket has been created.",
            "color": color,
            "fields": [
                {"name": "Status", "value": f"`{status}`", "inline": True},
                {"name": "Temperature", "value": f"{temperature}°C", "inline": True},
                {"name": "Ticket ID", "value": f"[{ticket_id}](https://aws.amazon.com)", "inline": False}
            ],
            "footer": {"text": "ADTEC DX Manufacturing System"}
        }]
    }
    
    req = urllib.request.Request(DISCORD_WEBHOOK_URL, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        urllib.request.urlopen(req)
        logger.info("Successfully sent Discord webhook.")
    except Exception as e:
        logger.error(f"Failed to send Discord webhook: {e}")

def lambda_handler(event, context):
    logger.info(f"Received anomalous telemetry data: {json.dumps(event)}")
    
    try:
        machine_id = event.get('machine_id', 'UNKNOWN')
        temperature = event.get('temperature_celsius', 0.0)
        vibration = event.get('vibration_hz', 0.0)
        status = event.get('status', 'UNKNOWN')
        timestamp = event.get('timestamp', int(datetime.utcnow().timestamp()))
        
        incident_time = datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S UTC')
        ticket_id = f"INC-{str(uuid.uuid4())[:8].upper()}"
        
        description = f"Machine entered state {status}."
        if "PREDICTIVE" in status:
            description = f"PREDICTIVE MAINTENANCE ALERT: Vibration reached {vibration}Hz. Replace bearings immediately."

        # 1. DynamoDB Ticket
        if DYNAMODB_TICKET_TABLE:
            
            # --- AI Diagnostic Engine (Simulated) ---
            runbook = "AI DIAGNOSTIC: Standard visual inspection required."
            if "CRITICAL" in status:
                runbook = "AI DIAGNOSTIC: 1. Immediately isolate power to the RF generator. 2. Check coolant fluid levels (>80%). 3. Inspect primary cooling fan for blockages. 4. If fan is clear, replace thermal sensor T-04."
            elif "ERROR_POWER" in status:
                runbook = "AI DIAGNOSTIC: 1. Verify main breaker panel B-12. 2. Test input voltage across phases. 3. If voltage is present, replace internal power supply unit (PSU-A1)."
            elif "PREDICTIVE" in status:
                runbook = "AI DIAGNOSTIC: 1. Vibration anomaly detected in primary drive shaft. 2. Schedule downtime within 48 hours. 3. Replace ceramic bearings. 4. Re-calibrate alignment."
            # ----------------------------------------
            
            table = dynamodb.Table(DYNAMODB_TICKET_TABLE)
            table.put_item(Item={
                'TicketID': ticket_id,
                'MachineID': machine_id,
                'CreatedAt': incident_time,
                'Priority': 'HIGH',
                'Status': 'OPEN',
                'ReportedTemperature': str(temperature),
                'MachineState': status,
                'Description': description,
                'AIRunbook': runbook
            })
            logger.info(f"Created Ticket: {ticket_id}")

        # 2. SNS Alert
        if SNS_TOPIC_ARN:
            sns_client.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"ALERT: {machine_id} ({status})",
                Message=f"Machine: {machine_id}\nStatus: {status}\nTemp: {temperature}C\nVibration: {vibration}Hz\nTicket: {ticket_id}\n\n{description}"
            )
            
        # 3. ChatOps Discord Alert
        send_discord_alert(machine_id, status, temperature, ticket_id)

        return {'statusCode': 200, 'body': json.dumps('Incident processed successfully')}

    except Exception as e:
        logger.error(f"Error processing incident: {str(e)}")
        raise e
