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


def get_settlement_data(item):
    """
    Get settlement data from either S3 (new) or DynamoDB (legacy).
    Supports migration from old storage format to new.
    """
    # Check if data is stored in S3 (new format)
    if 's3_key' in item:
        s3_key = item['s3_key']
        try:
            logger.info(f"Retrieving data from S3 | key={s3_key}")
            response = s3_client.get_object(Bucket=user_data_bucket, Key=s3_key)
            data_str = response['Body'].read().decode('utf-8')
            data = json.loads(data_str)
            logger.info(f"Successfully retrieved data from S3 | key={s3_key}")
            return data
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.error(f"S3 object not found | key={s3_key}")
                raise ValueError(f"Settlement data not found in S3: {s3_key}")
            else:
                logger.error(f"Failed to retrieve from S3 | key={s3_key} | error={str(e)}")
                raise
    # Check if data is stored in DynamoDB (legacy format)
    elif 'data' in item:
        logger.info(f"Retrieving data from DynamoDB (legacy format) | settlement_id={item.get('settlement_id')}")
        data_str = item['data']
        try:
            data = json.loads(data_str)
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse legacy data | error={str(e)}")
            raise ValueError("Invalid settlement data format")
    else:
        logger.error(f"No data found in item | keys={list(item.keys())}")
        raise ValueError("Settlement data not found (no 's3_key' or 'data' field)")


def lambda_handler(event, context):
    """
    Get user settlement data from S3 or DynamoDB (legacy)
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

            # Get the actual settlement data (from S3 or DynamoDB)
            try:
                settlement_data = get_settlement_data(item)
            except ValueError as e:
                logger.error(f"Failed to retrieve settlement data | error={str(e)}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                    },
                    'body': json.dumps({'error': str(e)})
                }

            # Return in the old DynamoDB format with 'data' as a JSON string
            # This maintains compatibility with the frontend
            response_item = {
                'user_id': item.get('user_id', user_id),
                'settlement_id': item.get('settlement_id', settlement_id),
                'data': json.dumps(settlement_data),  # Data as JSON string (old format)
                'updated_at': item.get('updated_at', datetime.now().isoformat())
            }

            logger.info(f"Successfully retrieved settlement | settlement_id={settlement_id}")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps(response_item, cls=DecimalEncoder)
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
            logger.info(f"Found {len(items)} settlement metadata records | user_id={user_id}")

            # Retrieve all settlements and return them in the old DynamoDB format
            # Each item has 'data' as a JSON string for frontend compatibility
            result_items = []

            for item in items:
                try:
                    settlement_data = get_settlement_data(item)

                    # Format as old DynamoDB item structure
                    result_item = {
                        'user_id': item.get('user_id', user_id),
                        'settlement_id': item.get('settlement_id', 'unknown'),
                        'data': json.dumps(settlement_data),  # Data as JSON string (old format)
                        'updated_at': item.get('updated_at', datetime.now().isoformat())
                    }
                    result_items.append(result_item)

                except Exception as e:
                    settlement_id = item.get('settlement_id', 'unknown')
                    logger.error(f"Failed to retrieve settlement | settlement_id={settlement_id} | error={str(e)}")
                    # Continue with other settlements instead of failing completely
                    continue

            logger.info(f"Successfully retrieved {len(result_items)} settlements | user_id={user_id}")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps(result_items, cls=DecimalEncoder)
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
