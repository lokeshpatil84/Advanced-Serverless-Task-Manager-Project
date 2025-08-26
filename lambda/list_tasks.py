import json
import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

@xray_recorder.capture('list_tasks')
def lambda_handler(event, context):
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        response = table.scan(
            FilterExpression="userId = :userId and archived = :archived",
            ExpressionAttributeValues={':userId': user_id, ':archived': False}
        )
        items = response.get('Items', [])
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps(items)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({'error': str(e)})
        }