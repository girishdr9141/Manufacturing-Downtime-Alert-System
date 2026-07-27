import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE')

def lambda_handler(event, context):
    connection_id = event.get('requestContext', {}).get('connectionId')
    domain_name = event.get('requestContext', {}).get('domainName')
    stage = event.get('requestContext', {}).get('stage')
    endpoint_url = f"https://{domain_name}/{stage}"
    
    body = event.get('body', '{}')
    payload = json.loads(body)
    
    command = payload.get('command')
    target_machine_id = payload.get('machine_id')
    
    logger.info(f"Received WS Command {command} for {target_machine_id} from {connection_id}")

    # Log to Audit Table
    if AUDIT_TABLE:
        dynamodb.Table(AUDIT_TABLE).put_item(Item={
            'Timestamp': str(datetime.utcnow().timestamp()),
            'Action': f"C2D_CMD:{command}",
            'Target': target_machine_id,
            'Initiator': connection_id
        })

    # Broadcast to the specific Operator
    if CONNECTIONS_TABLE:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        client = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
        
        response = table.scan()
        for item in response.get('Items', []):
            conn_id = item.get('ConnectionId')
            role = item.get('Role')
            sub_machine = item.get('MachineID')
            
            # Send the command to the Operator screen of the targeted machine
            if role == 'Operator' and sub_machine == target_machine_id:
                msg = json.dumps({
                    "type": "C2D_COMMAND",
                    "command": command,
                    "machine_id": target_machine_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
                try:
                    client.post_to_connection(ConnectionId=conn_id, Data=msg.encode('utf-8'))
                    logger.info(f"Routed command to Operator on {conn_id}")
                except client.exceptions.GoneException:
                    table.delete_item(Key={'ConnectionId': conn_id})
                except Exception as e:
                    logger.error(f"Failed to route command to {conn_id}: {e}")

    return {'statusCode': 200, 'body': 'Command routed.'}
