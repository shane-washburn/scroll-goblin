"""Deploy using the caller's existing AWS CLI credentials; never reads credentials."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
REGION = 'eu-north-1'
STACK = 'scroll-goblins-quantum'


def aws(*args):
    p = subprocess.run(['aws', *args, '--region', REGION, '--output', 'json'], check=True, capture_output=True, text=True)
    return json.loads(p.stdout) if p.stdout.strip() else None


def main():
    account = aws('sts', 'get-caller-identity')['Account']
    bucket = f'scroll-goblins-code-{account}-{REGION}'
    try:
        aws('s3api', 'head-bucket', '--bucket', bucket)
    except subprocess.CalledProcessError:
        aws('s3api', 'create-bucket', '--bucket', bucket, '--create-bucket-configuration', f'LocationConstraint={REGION}')
    aws('s3api', 'put-public-access-block', '--bucket', bucket, '--public-access-block-configuration',
        'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true')
    with tempfile.TemporaryDirectory(prefix='goblin-deploy-') as tmp:
        archive = Path(tmp) / 'lambda.zip'
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            z.write(ROOT / 'handler.py', 'handler.py')
        code_key = 'lambda/' + hashlib.sha256(archive.read_bytes()).hexdigest() + '.zip'
        aws('s3api', 'put-object', '--bucket', bucket, '--key', code_key, '--body', str(archive))
        subprocess.run(['aws', 'cloudformation', 'deploy', '--region', REGION,
                        '--stack-name', STACK, '--template-file', str(ROOT / 'template.yaml'),
                        '--capabilities', 'CAPABILITY_IAM', '--no-fail-on-empty-changeset',
                        '--parameter-overrides', f'CodeBucket={bucket}', f'CodeKey={code_key}'], check=True)
    outputs = aws('cloudformation', 'describe-stacks', '--stack-name', STACK)['Stacks'][0]['Outputs']
    print(json.dumps({x['OutputKey']: x['OutputValue'] for x in outputs}, indent=2))


if __name__ == '__main__':
    main()
