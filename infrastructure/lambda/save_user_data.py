import json
import boto3
import os
import logging
import traceback
from datetime import datetime
from decimal import Decimal
import base64
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
user_data_table = dynamodb.Table(os.environ['USER_DATA_TABLE'])
user_data_bucket = os.environ['USER_DATA_BUCKET']

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
    Save or update user settlement data to S3
    DynamoDB stores metadata only (user_id, settlement_id, s3_key, size, updated_at)
    S3 stores the actual settlement data
    """
    user_id = None
    settlement_id = None

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

        body = json.loads(event.get('body', '{}'))
        data_str = json.dumps(body)
        data_size = len(data_str.encode('utf-8'))
        data_size_mb = data_size / (1024 * 1024)
        max_size_mb = 10

        # Reject payloads larger than 10MB
        if data_size_mb > max_size_mb:
            logger.warning(f"Payload too large | user_id={user_id} | size={data_size_mb:.2f}MB | max={max_size_mb}MB")
            return {
                'statusCode': 413,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': f'Payload too large ({data_size_mb:.2f} MB). Maximum allowed size is {max_size_mb} MB.'
                })
            }

        logger.info(f"Saving data | user_id={user_id} | settlement_id={settlement_id} | size={data_size} bytes ({data_size_mb:.2f} MB)")

        # S3 key for the settlement data
        s3_key = f"{user_id}/{settlement_id}.json"

        # Store data in S3
        try:
            s3_client.put_object(
                Bucket=user_data_bucket,
                Key=s3_key,
                Body=data_str,
                ContentType='application/json',
                Metadata={
                    'user_id': user_id,
                    'settlement_id': settlement_id
                }
            )
            logger.info(f"Stored data in S3 | bucket={user_data_bucket} | key={s3_key}")
        except ClientError as e:
            logger.error(f"Failed to store data in S3 | error={str(e)}")
            raise

        # Store metadata in DynamoDB
        item = {
            'user_id': user_id,
            'settlement_id': settlement_id,
            's3_key': s3_key,
            'size': data_size,
            'updated_at': datetime.utcnow().isoformat(),
        }

        try:
            user_data_table.put_item(Item=item)
            logger.info(f"Stored metadata in DynamoDB | user_id={user_id} | settlement_id={settlement_id}")
        except ClientError as e:
            logger.error(f"Failed to store metadata in DynamoDB | error={str(e)}")
            # Try to clean up S3 object if DynamoDB fails
            try:
                s3_client.delete_object(Bucket=user_data_bucket, Key=s3_key)
                logger.info(f"Cleaned up S3 object after DynamoDB failure | key={s3_key}")
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up S3 object | error={str(cleanup_error)}")
            raise

        logger.info(f"Successfully saved data | user_id={user_id} | settlement_id={settlement_id} | s3_key={s3_key}")

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
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"AWS client error | error_code={error_code} | error={error_message} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Storage error: {error_message}'})
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
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
