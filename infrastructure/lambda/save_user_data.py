import json
import boto3
import os
import logging
import traceback
from datetime import datetime
from decimal import Decimal
import base64

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
user_data_table = dynamodb.Table(os.environ['USER_DATA_TABLE'])

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o) if o % 1 else int(o)
        return super().default(o)

def log_request(event):
    """Log incoming request details"""
    logger.info({
        'type': 'REQUEST',
        'method': event.get('httpMethod'),
        'path': event.get('path'),
        'timestamp': datetime.now().isoformat()
    })

def extract_user_id(event):
    """Extract user ID from JWT token in Authorization header"""
    # Try to get from API Gateway authorizer context first (if using authorizer)
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    user_id = claims.get('sub')
    
    if user_id:
        return user_id
    
    # Otherwise, extract from JWT token directly
    auth_header = event.get('headers', {}).get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise ValueError('Missing or invalid Authorization header')
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    try:
        # Decode JWT (without verification for now - API Gateway handles verification)
        # JWT format: header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError('Invalid JWT format')
        
        # Decode payload (add padding if needed)
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        user_id = claims.get('sub')
        
        if not user_id:
            raise ValueError('User ID not found in token')
        
        logger.info(f"Extracted user_id from token: {user_id}")
        return user_id
        
    except Exception as e:
        logger.error(f"Failed to extract user ID from token: {e}")
        raise ValueError(f'Invalid token: {e}')


def lambda_handler(event, context):
    """
    Save or update user settlement data
    Expects: settlement_id in path parameters, data in request body
    Returns: Confirmation with user_id and settlement_id
    """
    try:
        log_request(event)
        
        user_id = extract_user_id(event)
        path_parameters = event.get('pathParameters') or {}
        settlement_id = path_parameters.get('settlement_id')
        
        if not settlement_id:
            logger.warning(f"Missing settlement_id | user_id={user_id}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'settlement_id is required'})
            }
        
        body = json.loads(event.get('body', '{}'))
        data_size = len(json.dumps(body))
        
        logger.info(f"Saving data | user_id={user_id} | settlement_id={settlement_id} | size={data_size} bytes")
        
        # Prepare item with user_id and settlement_id
        item = {
            'user_id': user_id,
            'settlement_id': settlement_id,
            'data': body,
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        # Put item to DynamoDB
        user_data_table.put_item(Item=item)
        
        logger.info(f"Successfully saved data | user_id={user_id} | settlement_id={settlement_id}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Data saved successfully',
                'user_id': user_id,
                'settlement_id': settlement_id
            })
        }
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except ValueError as e:
        logger.error(f"Validation error | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        logger.error(f"Unexpected error | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
