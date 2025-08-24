import json
import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')
sqs = boto3.client('sqs')
SQS_QUEUE_URL = 'https://sqs.ap-south-1.amazonaws.com/674911868513/TaskCompletionQueue'  # Replace <your-account-id>

@xray_recorder.capture('update_task')
def lambda_handler(event, context):
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        task_id = event['pathParameters']['taskId']
        body = json.loads(event['body'])
        update_expr = "set title = :title, status = :status"
        expr_values = {':title': body.get('title'), ':status': body.get('status')}
        if 'attachmentKey' in body:
            update_expr += ", attachmentKey = :attachmentKey"
            expr_values[':attachmentKey'] = body['attachmentKey']

        table.update_item(
            Key={'taskId': task_id, 'userId': user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values
        )

        if body.get('status') == 'completed':
            user_email = 'lokeshpatil8484@gmail.com'  # Replace with your real email for testing
            sqs.send_message(
                QueueUrl=SQS_QUEUE_URL,
                MessageBody=json.dumps({'taskId': task_id, 'userEmail': user_email})
            )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Updated'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }