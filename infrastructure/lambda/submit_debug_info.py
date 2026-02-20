import json
import boto3
import os
import logging
import traceback
from datetime import datetime
import base64
import hashlib

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
debug_bucket = os.environ['DEBUG_BUCKET']

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

def generate_submission_id(user_id):
    """Generate unique submission ID from timestamp and user_id hash"""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
    user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:8]
    return f"{timestamp}_{user_hash}"

def lambda_handler(event, context):
    """
    Submit debug information to S3
    Expects: errors, localStorage, userContext, metadata in request body
    Returns: Confirmation with submission_id
    """
    try:
        log_request(event)

        user_id = extract_user_id(event)

        body = json.loads(event.get('body', '{}'))
        data_size = len(json.dumps(body))
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
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': f'Payload too large ({data_size_mb:.2f} MB). Maximum allowed size is {max_size_mb} MB.'
                })
            }

        # Generate submission ID and S3 path
        submission_id = generate_submission_id(user_id)
        now = datetime.utcnow()
        s3_key = f"submissions/{now.year}/{now.month:02d}/{submission_id}.json"

        # Prepare submission data
        submission_data = {
            'submission_id': submission_id,
            'user_id': user_id,
            'timestamp': now.isoformat(),
            'errors': body.get('errors', []),
            'localStorage': body.get('localStorage', {}),
            'userContext': body.get('userContext'),
            'metadata': body.get('metadata', {})
        }

        logger.info(f"Storing debug submission | user_id={user_id} | submission_id={submission_id} | size={data_size} bytes ({data_size_mb:.2f} MB)")

        # Store in S3
        s3_client.put_object(
            Bucket=debug_bucket,
            Key=s3_key,
            Body=json.dumps(submission_data, indent=2),
            ContentType='application/json',
            ServerSideEncryption='AES256'
        )

        logger.info(f"Successfully stored debug submission | user_id={user_id} | submission_id={submission_id} | s3_key={s3_key}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Debug report submitted successfully',
                'submission_id': submission_id
            })
        }

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON | error={str(e)} | traceback={traceback.format_exc()}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
