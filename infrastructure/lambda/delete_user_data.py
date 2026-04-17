import json
import boto3
import os
import logging
import traceback
from datetime import datetime
import base64
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
user_data_table = dynamodb.Table(os.environ['USER_DATA_TABLE'])
user_data_bucket = os.environ['USER_DATA_BUCKET']

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
    Delete user settlement data from both S3 and DynamoDB
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
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'settlement_id is required'})
            }

        logger.info(f"Deleting data | user_id={user_id} | settlement_id={settlement_id}")

        # First, get the item to check if it has an S3 key
        try:
            response = user_data_table.get_item(
                Key={
                    'user_id': user_id,
                    'settlement_id': settlement_id
                }
            )
            item = response.get('Item')
        except Exception as e:
            logger.error(f"Failed to get item from DynamoDB | error={str(e)}")
            item = None

        # If item exists and has an S3 key, delete from S3
        if item and 's3_key' in item:
            s3_key = item['s3_key']
            try:
                logger.info(f"Deleting S3 object | key={s3_key}")
                s3_client.delete_object(Bucket=user_data_bucket, Key=s3_key)
                logger.info(f"Successfully deleted S3 object | key={s3_key}")
            except ClientError as e:
                error_code = e.response['Error']['Code']
                # If the object doesn't exist, that's okay - we're deleting anyway
                if error_code != 'NoSuchKey':
                    logger.error(f"Failed to delete S3 object | key={s3_key} | error={str(e)}")
                    # Continue with DynamoDB deletion even if S3 delete fails
                else:
                    logger.warning(f"S3 object not found (already deleted?) | key={s3_key}")

        # Delete metadata from DynamoDB
        try:
            user_data_table.delete_item(
                Key={
                    'user_id': user_id,
                    'settlement_id': settlement_id
                }
            )
            logger.info(f"Successfully deleted DynamoDB item | user_id={user_id} | settlement_id={settlement_id}")
        except Exception as e:
            logger.error(f"Failed to delete from DynamoDB | error={str(e)}")
            raise

        logger.info(f"Successfully deleted data | user_id={user_id} | settlement_id={settlement_id}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
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
