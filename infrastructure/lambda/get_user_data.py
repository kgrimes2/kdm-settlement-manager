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
    Get user settlement data
    Expects: settlement_id in path parameters or all settlements if not provided
    Returns: Single settlement or all settlements for user
    """
    try:
        log_request(event)
        
        user_id = extract_user_id(event)
        path_parameters = event.get('pathParameters') or {}
        settlement_id = path_parameters.get('settlement_id')
        
        logger.info(f"Fetching data | user_id={user_id} | settlement_id={settlement_id}")
        
        if settlement_id:
            # Get specific settlement
            logger.debug(f"Querying single settlement: {settlement_id}")
            response = user_data_table.get_item(
                Key={
                    'user_id': user_id,
                    'settlement_id': settlement_id
                }
            )
            
            item = response.get('Item')
            if not item:
                logger.warning(f"Settlement not found | user_id={user_id} | settlement_id={settlement_id}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                    },
                    'body': json.dumps({'error': 'Settlement not found'})
                }
            
            logger.info(f"Successfully retrieved settlement | settlement_id={settlement_id}")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps(item, cls=DecimalEncoder)
            }
        else:
            # Get all settlements for user
            logger.debug(f"Querying all settlements for user: {user_id}")
            response = user_data_table.query(
                KeyConditionExpression='user_id = :user_id',
                ExpressionAttributeValues={
                    ':user_id': user_id
                }
            )
            
            items = response.get('Items', [])
            logger.info(f"Successfully retrieved {len(items)} settlements | user_id={user_id}")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps(items, cls=DecimalEncoder)
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
