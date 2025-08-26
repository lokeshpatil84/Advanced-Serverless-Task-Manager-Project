import json
import boto3
import uuid
from datetime import datetime
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

@xray_recorder.capture('create_task')
def lambda_handler(event, context):
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        body = json.loads(event['body'])
        task_id = str(uuid.uuid4())
        title = body['title']
        status = body.get('status', 'pending')
        created_at = datetime.utcnow().isoformat()
        attachment_key = body.get('attachmentKey')

        table.put_item(
            Item={
                'taskId': task_id,
                'userId': user_id,
                'title': title,
                'status': status,
                'createdAt': created_at,
                'attachmentKey': attachment_key,
                'notificationSent': False,
                'archived': False
            }
        )
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({'taskId': task_id, 'title': title, 'status': status})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({'error': str(e)})
        }