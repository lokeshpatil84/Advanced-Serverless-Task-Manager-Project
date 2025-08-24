import json
import boto3
import uuid
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all
patch_all()

s3 = boto3.client('s3')
BUCKET_NAME = '<attachments-bucket-name>'  # Replace e.g., task-manager-attachments-xyz123

@xray_recorder.capture('get_presigned_url')
def lambda_handler(event, context):
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        body = json.loads(event['body'])
        file_name = body['fileName']
        object_key = f"{user_id}/{uuid.uuid4()}/{file_name}"
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': BUCKET_NAME, 'Key': object_key},
            ExpiresIn=3600
        )
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'presignedUrl': presigned_url, 'objectKey': object_key})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }