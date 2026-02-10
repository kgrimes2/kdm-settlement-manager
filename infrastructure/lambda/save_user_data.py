import json
import boto3
import os
import logging
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
user_data_table = dynamodb.Table(os.environ['USER_DATA_TABLE'])

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o) if o % 1 else int(o)
        return super().default(o)

def extract_user_id(event):
    """Extract user ID from authorization header or request context"""
    # From API Gateway authorization
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    user_id = claims.get('sub')
    
    if not user_id:
        raise ValueError('User ID not found in authorization context')
    
    return user_id

def lambda_handler(event, context):
    """
    Save or update user settlement data
    Expects: settlement_id in path parameters, data in request body
    """
    try:
        user_id = extract_user_id(event)
        path_parameters = event.get('pathParameters') or {}
        settlement_id = path_parameters.get('settlement_id')
        
        if not settlement_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'settlement_id is required'})
            }
        
        body = json.loads(event.get('body', '{}'))
        
        logger.info(f"Saving data for user: {user_id}, settlement: {settlement_id}")
        
        # Prepare item with user_id and settlement_id
        item = {
            'user_id': user_id,
            'settlement_id': settlement_id,
            'data': body,
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        # Put item to DynamoDB
        user_data_table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data saved successfully',
                'user_id': user_id,
                'settlement_id': settlement_id
            })
        }
            
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            'statusCode': 401,
            'body': json.dumps({'error': str(e)})
        }
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        logger.error(f"Error saving user data: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
