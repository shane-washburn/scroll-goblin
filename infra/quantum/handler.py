"""Real QPU entropy pool. Public requests can consume, never submit paid jobs."""
import json
import os
import time
import uuid
import hashlib
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError

TABLE = os.environ['TABLE']
BUCKET = os.environ['BUCKET']
DEVICE = os.environ['DEVICE']
ddb = boto3.resource('dynamodb')
table = ddb.Table(TABLE)
client = boto3.client('dynamodb')
braket = boto3.client('braket')
s3 = boto3.client('s3')
serializer = TypeSerializer()


def pack(item):
    return {k: serializer.serialize(v) for k, v in item.items()}


def key(pk, sk='STATE'):
    return {'pk': pk, 'sk': sk}


def read(pk, sk='STATE'):
    return table.get_item(Key=key(pk, sk), ConsistentRead=True).get('Item')


def response(status, body):
    return {'statusCode': status, 'headers': {'content-type': 'application/json', 'cache-control': 'no-store'}, 'body': json.dumps(body)}


def replenish():
    # IAM-only invocation. No public route dispatches here. A stable client token
    # makes retries safe even if Lambda times out after Braket accepts the task.
    day = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    task_key = 'TASK#' + day
    existing = read(task_key)
    if existing and existing.get('arn'):
        return {'taskArn': existing['arn'], 'existing': True}
    task = braket.create_quantum_task(
        clientToken=str(uuid.uuid5(uuid.NAMESPACE_URL, BUCKET + day)),
        deviceArn=DEVICE, shots=1000, outputS3Bucket=BUCKET,
        outputS3KeyPrefix='measurements/' + day,
        action=json.dumps({'braketSchemaHeader': {'name': 'braket.ir.openqasm.program', 'version': '1'},
                          'source': 'OPENQASM 3.0; qubit[8] q; bit[8] c; ' +
                          ' '.join('h q[%d];' % i for i in range(8)) + ' c = measure q;'}))
    table.put_item(Item={**key(task_key), 'arn': task['quantumTaskArn'], 'imported': False})
    return {'taskArn': task['quantumTaskArn'], 'shots': 1000}


def poll():
    tasks = table.scan(FilterExpression='begins_with(pk, :p) AND imported = :f',
                       ExpressionAttributeValues={':p': 'TASK#', ':f': False})
    # Normally there is one outstanding task. Paginate even when the pool grows.
    rows = tasks['Items']
    while tasks.get('LastEvaluatedKey'):
        tasks = table.scan(FilterExpression='begins_with(pk, :p) AND imported = :f',
                           ExpressionAttributeValues={':p': 'TASK#', ':f': False},
                           ExclusiveStartKey=tasks['LastEvaluatedKey'])
        rows.extend(tasks['Items'])
    statuses = []
    for record in rows:
        task = braket.get_quantum_task(quantumTaskArn=record['arn'])
        statuses.append(task['status'])
        if task['status'] in ('FAILED', 'CANCELLED'):
            table.update_item(Key=key(record['pk']), UpdateExpression='SET imported = :t, taskStatus = :s',
                              ExpressionAttributeValues={':t': True, ':s': task['status']})
        if task['status'] != 'COMPLETED':
            continue
        obj = s3.get_object(Bucket=task['outputS3Bucket'], Key=task['outputS3Directory'] + '/results.json')
        result = json.loads(obj['Body'].read())
        measurements = result['measurements']
        if not measurements or any(len(row) != 8 or any(b not in (0, 1) for b in row) for row in measurements):
            raise ValueError('Unexpected measurement format')
        for start in range(0, len(measurements), 50):
            marker = key('IMPORT#' + record['arn'], str(start))
            if table.get_item(Key=marker, ConsistentRead=True).get('Item'):
                continue
            # Import marker + shots commit atomically. A repeated poll can never
            # reinsert measurements which have already been consumed.
            writes = [{'Put': {'TableName': TABLE, 'Item': pack(marker), 'ConditionExpression': 'attribute_not_exists(pk)'}}]
            for i, bits in enumerate(measurements[start:start + 50], start):
                item = {**key('POOL', record['pk'] + '#%05d' % i), 'bits': ''.join(map(str, bits)),
                        'taskArn': record['arn'], 'deviceArn': DEVICE, 'shot': i,
                        'measuredAt': task['endedAt'].isoformat()}
                writes.append({'Put': {'TableName': TABLE, 'Item': pack(item)}})
            try:
                client.transact_write_items(TransactItems=writes)
            except client.exceptions.TransactionCanceledException:
                if not table.get_item(Key=marker, ConsistentRead=True).get('Item'):
                    raise
        table.update_item(Key=key(record['pk']), UpdateExpression='SET imported = :t', ExpressionAttributeValues={':t': True})
    return {'statuses': statuses}


def rate_limit(ip, action):
    window = int(time.time()) // 3600
    item_key = key('RATE#' + hashlib.sha256(ip.encode()).hexdigest()[:24], str(window) + action)
    item = table.update_item(Key=item_key, UpdateExpression='SET expires = :ttl ADD requests :one',
                             ExpressionAttributeValues={':ttl': (window + 2) * 3600, ':one': 1}, ReturnValues='ALL_NEW')['Attributes']
    return item['requests'] <= (20 if action == 'start' else 300)


def consume(body):
    session = str(uuid.UUID(body['session']))
    mode = body.get('mode', '')
    action = body['action']
    seq = body.get('seq', 0)
    if type(seq) is not int or seq < 0 or seq > 250:
        return response(400, {'error': 'Invalid event number'})
    pk = 'SESSION#' + session
    saved = read(pk, str(seq))
    if saved:
        return response(200, json.loads(saved['response']))
    state = read(pk)
    if action == 'start':
        if seq != 0 or mode not in ('easy', 'medium', 'hard', 'chaos') or state:
            return response(400, {'error': 'Invalid match initialization'})
    elif action == 'verdict':
        if type(body.get('declaration', False)) is not bool:
            return response(400, {'error': 'Invalid declaration'})
        if not state or state['mode'] != 'chaos' or state.get('ended') or seq != state['seq'] + 1:
            return response(409, {'error': 'Match event is out of sequence'})
        if type(body.get('round')) is not int or body['round'] < state.get('round', 0):
            return response(400, {'error': 'Invalid round'})
        if not body.get('declaration') and (body['round'] < 6 or body['round'] <= state.get('round', 0)):
            return response(400, {'error': 'The Universe checks once per round, after round five'})
    else:
        return response(400, {'error': 'Unknown action'})
    for _ in range(8):
        pool = table.query(KeyConditionExpression='pk = :p', ExpressionAttributeValues={':p': 'POOL'}, Limit=1, ConsistentRead=True)['Items']
        if not pool:
            return response(503, {'error': 'The Universe is recharging. Please try again soon.'})
        shot = pool[0]
        bits = shot['bits']
        proof = {k: shot[k] for k in ('taskArn', 'deviceArn', 'measuredAt')}
        proof['shot'] = int(shot['shot'])
        if action == 'start':
            answer = {'session': session, 'faction': 'goblins' if bits[0] == '0' else 'hedgelings',
                      'color': 'w' if bits[1] == '0' else 'b', 'proof': proof}
            next_state = {**key(pk), 'mode': mode, 'seq': 0, 'round': 0, 'ended': False}
            condition = 'attribute_not_exists(pk)'
            values = None
        else:
            ended = bool(body.get('declaration')) or bits[:3] == '000'
            answer = {'ended': ended, 'winner': ('w' if bits[3] == '0' else 'b') if ended else None, 'proof': proof}
            next_state = {**state, 'seq': seq, 'round': body['round'], 'ended': ended}
            condition = 'seq = :previous'
            values = {':previous': serializer.serialize(seq - 1)}
        next_state['expires'] = int(time.time()) + 86400 * 7
        put_state = {'TableName': TABLE, 'Item': pack(next_state), 'ConditionExpression': condition}
        if values:
            put_state['ExpressionAttributeValues'] = values
        try:
            client.transact_write_items(TransactItems=[
                {'Delete': {'TableName': TABLE, 'Key': pack(key('POOL', shot['sk'])), 'ConditionExpression': 'attribute_exists(pk)'}},
                {'Put': put_state},
                {'Put': {'TableName': TABLE, 'Item': pack({**key(pk, str(seq)), 'response': json.dumps(answer), 'expires': next_state['expires']}), 'ConditionExpression': 'attribute_not_exists(pk)'}}])
            return response(200, answer)
        except client.exceptions.TransactionCanceledException:
            saved = read(pk, str(seq))
            if saved:
                return response(200, json.loads(saved['response']))
    return response(503, {'error': 'The Universe is busy. Retry this same action.'})


def handler(event, context):
    if 'requestContext' not in event:
        if event.get('operation') == 'replenish':
            return replenish()
        if event.get('operation') == 'poll':
            return poll()
        raise ValueError('Unknown administrative operation')
    try:
        raw = event.get('body') or '{}'
        if len(raw) > 2048:
            return response(413, {'error': 'Request too large'})
        body = json.loads(raw)
        if not isinstance(body, dict):
            return response(400, {'error': 'Invalid request'})
        ip = event['requestContext'].get('http', {}).get('sourceIp', 'unknown')
        if body.get('action') not in ('start', 'verdict'):
            return response(400, {'error': 'Unknown action'})
        if not rate_limit(ip, body['action']):
            return response(429, {'error': 'The Universe needs a breather. Try again later.'})
        return consume(body)
    except (ValueError, KeyError, TypeError):
        return response(400, {'error': 'Invalid request'})
    except ClientError:
        return response(503, {'error': 'The Universe is unavailable. Retry shortly.'})
