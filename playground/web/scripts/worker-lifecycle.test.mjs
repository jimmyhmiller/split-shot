import test from 'node:test';
import assert from 'node:assert/strict';
import { specialize, cancelSpecialization } from '../src/pe.js';

test('changing source terminates stale specialization and resolves the new request', async () => {
  const original = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() { workers.push(this); }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
  };
  try {
    const first = specialize('first');
    const rejected = assert.rejects(first, /worker was restarted/);
    const second = specialize('second');
    assert.equal(workers.length, 2);
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[1].message.src, 'second');
    workers[1].onmessage({ data: { id: workers[1].message.id, ok: true, result: { js: 'result' } } });
    await rejected;
    assert.deepEqual(await second, { js: 'result' });
  } finally {
    cancelSpecialization();
    globalThis.Worker = original;
  }
});

test('cancelling work for a saved result terminates without starting a worker', async () => {
  const original = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() { workers.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  };
  try {
    cancelSpecialization();
    assert.equal(workers.length, 0);
    const running = specialize('slow');
    const rejected = assert.rejects(running, /worker was restarted/);
    cancelSpecialization();
    await rejected;
    assert.equal(workers.length, 1);
    assert.equal(workers[0].terminated, true);
  } finally {
    cancelSpecialization();
    globalThis.Worker = original;
  }
});
