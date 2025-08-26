import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

@xray_recorder.capture('archive_tasks')
def lambda_handler(event, context):
    try:
        response = table.scan(
            FilterExpression="status = :status and archived = :archived",
            ExpressionAttributeValues={':status': 'completed', ':archived': False}
        )
        for item in response.get('Items', []):
            table.update_item(
                Key={'taskId': item['taskId'], 'userId': item['userId']},
                UpdateExpression="set archived = :archived",
                ExpressionAttributeValues={':archived': True}
            )
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({'archived': len(response.get('Items', []))})
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