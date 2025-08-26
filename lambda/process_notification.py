import json
import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

sns = boto3.client('sns')
SNS_TOPIC_ARN = 'arn:aws:sns:ap-south-1:674911868513:TaskNotifications'

@xray_recorder.capture('process_notification')
def lambda_handler(event, context):
    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            task_id = body['taskId']
            user_email = body['userEmail']
            message = f"Task {task_id} completed!"
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Message=message,
                Subject='Task Completion',
                MessageAttributes={'email': {'DataType': 'String', 'StringValue': user_email}}
            )
        except Exception as e:
            print(f"Error: {str(e)}")
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps({'message': 'Processed'})
    }