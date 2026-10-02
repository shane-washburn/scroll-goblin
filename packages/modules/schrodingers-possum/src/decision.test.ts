import assert from 'node:assert/strict';
import test from 'node:test';
import { DilemmaSchema, type PossumDecision } from '@scroll-goblin/shared';
import { DecisionError, measureDecision, narrateDecision, readDecision, saveDecision } from './decision';

const dilemma = { question: 'What should I do?', optionA: 'Go outside', optionB: 'Read a book', tone: 'sincere' as const };
const hardware = { source: 'hardware', result: 1, taskArn: 'arn:aws:braket:eu-north-1:123:quantum-task/test',
  deviceArn: 'arn:aws:braket:eu-north-1::device/qpu/iqm/Garnet', shot: 12, batchShots: 1000,
  circuitQubits: 8, bitIndex: 0, measuredAt: '2026-10-01T10:00:00Z' } as const;
const id = '3846357c-d5aa-4008-a1b4-d2d01ab306ca';
const response = (data: unknown, status = 200) => (async () => new Response(JSON.stringify(data), { status })) as typeof fetch;

test('accepts trimmed options and rejects indistinguishable choices', () => {
  assert.equal(DilemmaSchema.parse({ ...dilemma, optionA: '  Go outside  ' }).optionA, 'Go outside');
  assert.equal(DilemmaSchema.safeParse({ ...dilemma, optionA: ' Book ', optionB: 'ＢＯＯＫ' }).success, false);
  assert.equal(DilemmaSchema.safeParse({ ...dilemma, optionB: ' ' }).success, false);
});

test('hardware is preserved with the real batch and shot metadata', async () => {
  let body = '';
  const fake: typeof fetch = async (_url, init) => { body = String(init?.body); return new Response(JSON.stringify(hardware)); };
  const result = await measureDecision(id, '/oracle', new AbortController().signal, fake);
  assert.deepEqual(result, hardware);
  assert.deepEqual(JSON.parse(body), { action: 'flip', decision: id });
  assert.equal('bits' in result, false);
});

test('availability failure produces an explicitly classical result without a fake receipt', async () => {
  const result = await measureDecision(id, '/oracle', new AbortController().signal, response({}, 503));
  assert.equal(result.source, 'classical');
  assert.ok(result.result === 0 || result.result === 1);
  assert.equal('taskArn' in result, false);
});

test('validation and rate limits never silently fall back to a new coin flip', async () => {
  for (const status of [400, 403, 429]) {
    await assert.rejects(measureDecision(id, '/oracle', new AbortController().signal, response({}, status)),
      error => error instanceof DecisionError && error.status === status);
  }
});

test('navigation aborts never consume a classical fallback or accept a late response', async () => {
  const controller = new AbortController();
  const fake: typeof fetch = async () => { controller.abort(); return new Response(JSON.stringify(hardware)); };
  await assert.rejects(measureDecision(id, '/oracle', controller.signal, fake), { name: 'AbortError' });
});

test('saved winner survives a failed narrator, reload, and successful narration retry', async () => {
  let stored = '';
  const storage = { setItem: (_key: string, value: string) => { stored = value; }, getItem: () => stored };
  const decision: PossumDecision = { id, dilemma, createdAt: Date.now(), measurement: hardware };
  saveDecision(decision, storage);
  const restored = readDecision(storage)!;
  const fallback = await narrateDecision(restored, '/narrate', 'en-US', new AbortController().signal, response({}, 503));
  assert.equal(fallback.source, 'written');
  let sent: { result?: number } = {};
  const fake: typeof fetch = async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ wisdom: 'Find a cozy chapter.', alternate_timeline: 'The garden can wait.', source: 'gemini' }));
  };
  const story = await narrateDecision(restored, '/narrate', 'en-US', new AbortController().signal, fake);
  assert.equal(sent.result, 1); assert.equal(story.source, 'gemini');
  assert.deepEqual(restored.measurement, hardware);
});

test('corrupt, expired, and story-without-measurement saves are ignored', () => {
  for (const value of ['not json', JSON.stringify({ id, dilemma, createdAt: 1 }),
    JSON.stringify({ id, dilemma, createdAt: Date.now(), narration: { source: 'gemini', wisdom: 'Hi', alternate_timeline: 'Bye' } })]) {
    assert.equal(readDecision({ getItem: () => value }), null);
  }
});
