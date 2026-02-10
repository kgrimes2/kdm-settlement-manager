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
    Get user settlement data
    Expects: settlement_id in path parameters or all settlements if not provided
    """
    try:
        user_id = extract_user_id(event)
        path_parameters = event.get('pathParameters') or {}
        settlement_id = path_parameters.get('settlement_id')
        
        logger.info(f"Fetching data for user: {user_id}, settlement: {settlement_id}")
        
        if settlement_id:
            # Get specific settlement
            response = user_data_table.get_item(
                Key={
                    'user_id': user_id,
                    'settlement_id': settlement_id
                }
            )
            
            item = response.get('Item')
            if not item:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Settlement not found'})
                }
            
            return {
                'statusCode': 200,
                'body': json.dumps(item, cls=DecimalEncoder)
            }
        else:
            # Get all settlements for user
            response = user_data_table.query(
                KeyConditionExpression='user_id = :user_id',
                ExpressionAttributeValues={
                    ':user_id': user_id
                }
            )
            
            items = response.get('Items', [])
            return {
                'statusCode': 200,
                'body': json.dumps(items, cls=DecimalEncoder)
            }
            
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            'statusCode': 401,
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        logger.error(f"Error fetching user data: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
