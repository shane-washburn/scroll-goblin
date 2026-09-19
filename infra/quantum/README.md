# Scroll Goblins quantum oracle

Deployed stack: `scroll-goblins-quantum`, region `eu-north-1` (Stockholm).

API: `https://5o1vmqmw04.execute-api.eu-north-1.amazonaws.com/oracle`

This service runs eight independent Hadamard gates and measures all eight qubits
on IQM Garnet through Amazon Braket. There is **no simulator fallback**. Each
shot is consumed once; unused bits within that shot are discarded. Hardware
noise can bias measurements, so 50/50 and 1/8 are ideal target probabilities,
not certified randomness claims.

## Infrastructure

- Python 3.12 Lambda using the runtime's boto3; no container/notebook required.
- Private S3 bucket for original Braket results, retained on stack deletion.
- DynamoDB pool, session state, idempotent event responses and rate limits.
- API Gateway HTTP API, throttled to 5 requests/sec, burst 20, with explicit CORS.
- EventBridge checks for completed tasks every five minutes. It **never submits
  new jobs**. CloudWatch logs expire after 14 days.
- IAM restricts job submission to Garnet. Braket's authorization also uses an
  account-qualified device ARN, hence both ARN forms in the policy.

## Deploy and replenish

Requires AWS CLI v2 authenticated to the intended account. Check the account
with `aws sts get-caller-identity`. Braket's console agreement must be accepted
and service setup complete in that account before the first hardware task.

```sh
python3 infra/quantum/deploy.py
aws cloudformation describe-stacks --stack-name scroll-goblins-quantum \
  --region eu-north-1 --query 'Stacks[0].Outputs'
```

Invoke the `FunctionName` output with this payload to submit a batch:

```sh
aws lambda invoke --region eu-north-1 \
  --function-name <FunctionName> --cli-binary-format raw-in-base64-out \
  --payload '{"operation":"replenish"}' /tmp/goblin-batch.json
cat /tmp/goblin-batch.json
```

A batch is fixed at **1,000 shots**, approximately **$1.75 in Braket fees** at
Garnet's checked September 2026 rate ($0.30/task + $0.00145/shot), plus AWS
storage/API fees. The service reuses a stable daily Braket client token and
stored task record: repeated invocations on the same UTC day do not create new
paid jobs. No automatic paid replenishment is enabled. AWS credits must cover
Braket in the billed account. Rate limits and daily limits are not global AWS
billing caps; direct administrative use of Braket is outside this service.

Garnet advertises weekday execution windows. ONLINE does not mean immediate
execution. Query the task ARN from the batch response with
`aws braket get-quantum-task --quantum-task-arn <arn> --region eu-north-1`.
The importer will populate the pool once the task completes. Manual import uses
`{"operation":"poll"}` on the same Lambda; it does not spend QPU credits.

## Public protocol

`POST /oracle`, JSON body:

- Start: `{"action":"start","session":"<random UUID>","mode":"chaos","seq":0}`.
  Returns faction, color and provenance. Frontend assignments allow later
  selection of any tier; only chaos actually requests verdicts.
- Verdict: `{"action":"verdict","session":"<same UUID>","seq":1,"round":6,"declaration":false}`.
  Increments sequence once per result. After round five, the first three bits
  being `000` ends the game. The fourth bit picks white or black. A declaration
  always ends the game using the fourth bit for its winner.

Keep a session UUID private; it is a capability for a casual, unranked match.
Retries use the **same session and sequence** and receive the same response.
Round checks are monotonic and once per completed round; declarations can
happen earlier. An empty pool returns 503 and does not spend an event number.
Public routes cannot submit jobs. Starts are limited to 20/IP/hour and verdicts
to 300/IP/hour. Sessions expire after seven days; expired games need a restart.
The server validates event ordering, not chess moves; this is not a ranked
anti-cheat service. CORS is not authentication.

Pool deletion, session advancement, and cached response creation are one
DynamoDB transaction. Each import chunk and its permanent import marker are
also one transaction: an importer retry cannot resurrect consumed shots.
Unused future bits never reach the browser.

## Tests

```sh
python3 -m venv /tmp/goblin-tests
/tmp/goblin-tests/bin/pip install boto3 'moto[dynamodb,s3]'
cd infra/quantum
/tmp/goblin-tests/bin/python -m unittest -v test_handler
```

Tests use mocked AWS services only; they cover empty pools, assignment and
verdict retry safety, declaration endings, event ordering, rate limits,
restricted public operations, bounded replenishment, and import replay safety.
