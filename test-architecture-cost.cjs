const assert = require('node:assert/strict');
const test = require('node:test');
const {archClouds, archCost} = require('./dist/architecture-cost.js');

const nodes = (...types) => types.map((type, id) => ({id, type}));
const usage = {hours: 100, storage: 60, egress: 10, requests: 5e6, inputTokens: 2e6, outputTokens: 3e6};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, actual + ' vs ' + expected);

test('empty and device-only drawings are free even with monthly usage', () => {
  for (const provider of Object.keys(archClouds)) {
    assert.deepEqual(archCost(provider, [], usage).lines, []);
    const device = archCost(provider, nodes('client'), usage);
    assert.equal(device.lines.length, 1);
    assert.equal(device.total, 0);
    assert.ok(device.lines.every(line => line.amount === 0));
  }
});

test('same monthly workload and VM count across three providers', () => {
  const drawing = nodes('client', 'api', 'gateway', 'sql', 'kv', 'cache', 'queue', 'worker', 'llm', 'retriever', 'vector');
  for (const [provider, vmRate, gateway] of [['aws', .0418, 17.5], ['azure', .0416, 12], ['gcp', .03350571, 9]]) {
    const result = archCost(provider, drawing, usage);
    close(result.total, 8 * 100 * vmRate + gateway + 6 + .9 + 14);
    close(result.total, result.lines.reduce((sum, line) => sum + line.amount, 0));
    assert.ok(result.lines.every(line => line.label && line.detail && Number.isFinite(line.amount)));
    assert.ok(result.notes.some(note => note.includes(archClouds[provider].region)));
  }
});

test('replicas multiply VM hours and share disk, egress, ingress calls and inference', () => {
  const first = archCost('aws', nodes('sql', 'vector', 'llm', 'gateway'), usage);
  const next = archCost('aws', nodes('sql', 'sql', 'vector', 'llm', 'llm', 'gateway', 'gateway'), usage);
  close(next.total - first.total, usage.hours * .0418);
  for (const result of [first, next]) {
    close(result.lines.filter(line => line.label.startsWith('Disco de dados')).reduce((n, line) => n + line.amount, 0), 6);
    assert.equal(result.lines.filter(line => line.label === 'Saída para a internet').length, 1);
  }
  close(next.lines.find(line => line.label.startsWith('Disco de dados · PostgreSQL ×')).amount, 4);
});

test('gateway pricing applies progressive monthly tiers once across replicas', () => {
  const gateways = nodes('gateway', 'gateway');
  for (const [provider, calls, amount] of [
    ['aws', 333e6, 1165.5], ['aws', 1e9, 3033.1], ['aws', 15e9, 36353.1],
    ['aws', 20e9, 48253.1], ['aws', 20.001e9, 48254.61],
    ['gcp', 2e6, 0], ['gcp', 2.5e6, 1.5], ['gcp', 1.001e9, 2995.5],
    ['azure', 1e6, 0], ['azure', 1.5e6, 1.5]
  ]) close(archCost(provider, gateways, {requests: calls}).total, amount);
});

test('shared assumptions are overridable independently of published VM pricing', () => {
  const drawing = nodes('sql', 'llm');
  const rates = {storage: .25, egress: .5, inputTokens: 0, outputTokens: 2};
  const value = archCost('azure', drawing, {...usage, rates});
  close(value.total, 100 * .0416 + 60 * .25 + 10 * .5 + 3 * 2);
});

test('unmapped and malformed inputs keep the result finite', () => {
  assert.throws(() => archCost('unknown', []), RangeError);
  const result = archCost('gcp', [null, {type:'unknown'}, ...nodes('api')], {
    hours: '4', egress: -3, storage: NaN, requests: Infinity, outputTokens: 'abc'
  });
  close(result.total, 4 * .03350571);
  assert.ok(result.notes.some(note => note.includes('2 bloco(s) sem modelo')));
});
