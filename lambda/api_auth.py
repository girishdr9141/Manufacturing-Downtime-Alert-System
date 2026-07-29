import json
import os
import hashlib
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('USERS_TABLE', 'MfgUsersTable')
table = dynamodb.Table(table_name)

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        'body': json.dumps(body)
    }

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))
    
    # Handle preflight CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
        
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return cors_response(400, {'message': 'Email and password are required'})
            
        if action == 'SIGNUP':
            role = body.get('role', 'Operator')
            machine_id = body.get('machine_id', 'EDGE-NODE-001')
            
            # Check if user exists
            try:
                existing = table.get_item(Key={'Email': email})
                if 'Item' in existing:
                    return cors_response(400, {'message': 'User already exists'})
            except ClientError as e:
                print(e)
                
            # Create user
            item = {
                'Email': email,
                'PasswordHash': hash_password(password),
                'Role': role,
                'MachineID': machine_id
            }
            table.put_item(Item=item)
            return cors_response(201, {'message': 'User created successfully', 'role': role, 'machine_id': machine_id})
            
        elif action == 'LOGIN':
            # Get user
            response = table.get_item(Key={'Email': email})
            item = response.get('Item')
            
            if not item:
                return cors_response(401, {'message': 'Invalid email or password'})
                
            # Verify password
            if item.get('PasswordHash') != hash_password(password):
                return cors_response(401, {'message': 'Invalid email or password'})
                
            return cors_response(200, {
                'message': 'Login successful',
                'role': item.get('Role', 'Operator'),
                'machine_id': item.get('MachineID', 'EDGE-NODE-001')
            })
            
        else:
            return cors_response(400, {'message': 'Invalid action. Must be LOGIN or SIGNUP'})
            
    except Exception as e:
        print(f"Error processing auth: {e}")
        return cors_response(500, {'message': 'Internal server error'})
