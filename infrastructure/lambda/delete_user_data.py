import json
import boto3
import os
import logging
import traceback
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
user_data_table = dynamodb.Table(os.environ['USER_DATA_TABLE'])

def log_request(event):
    """Log incoming request details"""
    logger.info({
        'type': 'REQUEST',
        'method': event.get('httpMethod'),
        'path': event.get('path'),
        'timestamp': datetime.now().isoformat()
    })

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
    Delete user settlement data
    Expects: settlement_id in path parameters
    Returns: Confirmation with deleted settlement_id
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
        
        logger.info(f"Deleting data | user_id={user_id} | settlement_id={settlement_id}")
        
        # Delete item from DynamoDB
        user_data_table.delete_item(
            Key={
                'user_id': user_id,
                'settlement_id': settlement_id
            }
        )
        
        logger.info(f"Successfully deleted data | user_id={user_id} | settlement_id={settlement_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data deleted successfully',
                'user_id': user_id,
                'settlement_id': settlement_id
            })
        }
            
    except ValueError as e:
        logger.error(f"Validation error | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 401,
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        logger.error(f"Unexpected error | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
