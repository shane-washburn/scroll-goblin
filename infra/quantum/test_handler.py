"""Run with boto3 and moto[dynamodb,s3] installed. No real AWS calls."""
import importlib
import json
import os
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import Mock, patch

os.environ.update(AWS_DEFAULT_REGION='eu-north-1', AWS_ACCESS_KEY_ID='testing', AWS_SECRET_ACCESS_KEY='testing',
                  TABLE='test-pool', BUCKET='amazon-braket-test', DEVICE='arn:aws:braket:eu-north-1::device/qpu/iqm/Garnet')
from moto import mock_aws
import boto3


class QuantumTests(unittest.TestCase):
    def setUp(self):
        self.mock = mock_aws(); self.mock.start()
        self.h = importlib.reload(importlib.import_module('handler'))
        self.h.ddb.create_table(TableName='test-pool', BillingMode='PAY_PER_REQUEST',
            KeySchema=[{'AttributeName': 'pk', 'KeyType': 'HASH'}, {'AttributeName': 'sk', 'KeyType': 'RANGE'}],
            AttributeDefinitions=[{'AttributeName': 'pk', 'AttributeType': 'S'}, {'AttributeName': 'sk', 'AttributeType': 'S'}])
        self.session = str(uuid.uuid4())

    def tearDown(self):
        self.mock.stop()

    def shot(self, n, bits='01010000'):
        self.h.table.put_item(Item={'pk': 'POOL', 'sk': str(n), 'bits': bits, 'taskArn': 'task',
                                   'deviceArn': os.environ['DEVICE'], 'shot': n, 'measuredAt': '2026-09-19T00:00:00Z'})

    def start(self):
        return self.h.consume({'action': 'start', 'session': self.session, 'mode': 'chaos', 'seq': 0})

    def test_no_entropy_does_not_fake_results(self):
        self.assertEqual(self.start()['statusCode'], 503)

    def test_assignment_retry_is_idempotent(self):
        self.shot(0); self.shot(1)
        first = self.start(); second = self.start()
        self.assertEqual(first['statusCode'], 200)
        self.assertEqual(first, second)
        body = json.loads(first['body'])
        self.assertEqual((body['faction'], body['color']), ('goblins', 'b'))
        self.assertEqual(self.h.table.query(KeyConditionExpression='pk = :p', ExpressionAttributeValues={':p': 'POOL'})['Count'], 1)
        self.assertNotIn('bits', body)

    def test_round_gate_and_verdict_retry(self):
        self.shot(0); self.start(); self.shot(1, '00000000')
        event = {'action': 'verdict', 'session': self.session, 'seq': 1, 'round': 5, 'declaration': False}
        self.assertEqual(self.h.consume(event)['statusCode'], 400)
        event['round'] = 6
        first = self.h.consume(event)
        self.assertEqual(first['statusCode'], 200)
        self.assertEqual(first, self.h.consume(event))
        self.assertEqual(json.loads(first['body'])['winner'], 'w')
        self.assertEqual(self.h.consume({**event, 'seq': 2, 'round': 7})['statusCode'], 409)

    def test_declaration_always_ends_and_randomizes_winner(self):
        self.shot(0); self.start(); self.shot(1, '11110000')
        result = self.h.consume({'action': 'verdict', 'session': self.session, 'seq': 1, 'round': 0, 'declaration': True})
        self.assertEqual(json.loads(result['body'])['winner'], 'b')

    def test_continue_and_no_duplicate_rounds(self):
        self.shot(0); self.start(); self.shot(1, '11100000')
        event = {'action': 'verdict', 'session': self.session, 'seq': 1, 'round': 6, 'declaration': False}
        self.assertFalse(json.loads(self.h.consume(event)['body'])['ended'])
        self.assertEqual(self.h.consume({**event, 'seq': 2})['statusCode'], 400)

    def test_public_requests_cannot_replenish(self):
        with patch.object(self.h, 'replenish') as submit:
            res = self.h.handler({'requestContext': {'http': {'sourceIp': '127.0.0.1'}}, 'body': '{"operation":"replenish"}'}, None)
            self.assertEqual(res['statusCode'], 400); submit.assert_not_called()

    def test_daily_submission_is_idempotent(self):
        with patch.object(self.h, 'braket') as b:
            b.create_quantum_task.return_value = {'quantumTaskArn': 'arn:task:first'}
            self.h.replenish(); self.h.replenish()
            self.assertEqual(b.create_quantum_task.call_count, 1)
            self.assertEqual(b.create_quantum_task.call_args.kwargs['shots'], 1000)

    def test_invalid_public_payload(self):
        res = self.h.handler({'requestContext': {'http': {'sourceIp': '127.0.0.1'}}, 'body': '[]'}, None)
        self.assertEqual(res['statusCode'], 400)

    def test_one_shot_cannot_start_two_sessions(self):
        self.shot(0)
        self.assertEqual(self.start()['statusCode'], 200)
        self.session = str(uuid.uuid4())
        self.assertEqual(self.start()['statusCode'], 503)

    def test_rate_limit(self):
        for _ in range(20): self.assertTrue(self.h.rate_limit('ip', 'start'))
        self.assertFalse(self.h.rate_limit('ip', 'start'))

    def test_import_retry_never_restores_used_shots(self):
        self.h.s3.create_bucket(Bucket=os.environ['BUCKET'], CreateBucketConfiguration={'LocationConstraint': 'eu-north-1'})
        self.h.s3.put_object(Bucket=os.environ['BUCKET'], Key='result/results.json', Body=json.dumps({'measurements': [[0]*8, [1]*8]}))
        self.h.table.put_item(Item={'pk': 'TASK#test', 'sk': 'STATE', 'arn': 'test-task', 'imported': False})
        with patch.object(self.h, 'braket') as b:
            b.get_quantum_task.return_value = {'status': 'COMPLETED', 'outputS3Bucket': os.environ['BUCKET'], 'outputS3Directory': 'result', 'endedAt': datetime.now(timezone.utc)}
            self.h.poll()
            self.assertEqual(self.start()['statusCode'], 200)
            # Simulate a crash after import/consumption but before marking task done.
            self.h.table.update_item(Key={'pk': 'TASK#test', 'sk': 'STATE'}, UpdateExpression='SET imported = :f', ExpressionAttributeValues={':f': False})
            self.h.poll()
            remaining = self.h.table.query(KeyConditionExpression='pk = :p', ExpressionAttributeValues={':p': 'POOL'})['Count']
            self.assertEqual(remaining, 1)

if __name__ == '__main__': unittest.main()
