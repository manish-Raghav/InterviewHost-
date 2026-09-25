// Child-process entry point for the built-in JavaScript judge.
// Receives { code, inputs, timeoutMs } over IPC and replies with { results }.
import vm from 'node:vm';

const MAX_OUTPUT_CHARS = 20000;

// Runs inside every fresh context: exposes `input` and a `console` that buffers output.
const prelude = (input) => `
var input = ${JSON.stringify(String(input))};
var __logs = [];
var __size = 0;
var __fmt = function (a) {
  if (typeof a === 'string') return a;
  try { return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); }
  catch (e) { return String(a); }
};
var __write = function () {
  if (__size > ${MAX_OUTPUT_CHARS}) return;
  var line = Array.prototype.map.call(arguments, __fmt).join(' ');
  __size += line.length + 1;
  __logs.push(line);
};
var console = { log: __write, info: __write, error: function () {}, warn: function () {} };
`;

function describeError(err) {
  try {
    const name = err && err.name ? String(err.name) : 'Error';
    const message = err && err.message ? String(err.message) : String(err);
    return `${name}: ${message}`.slice(0, 500);
  } catch {
    return 'Unknown error';
  }
}

async function runCase(script, input, timeoutMs) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
  });
  const started = Date.now();
  try {
    vm.runInContext(prelude(input), context);
    script.runInContext(context, { timeout: timeoutMs });
    // Let already-queued promise callbacks settle before reading the buffered output.
    await new Promise((resolve) => setImmediate(resolve));
    const stdout = vm.runInContext('__logs.join("\\n")', context);
    return { ok: true, stdout: String(stdout).slice(0, MAX_OUTPUT_CHARS), ms: Date.now() - started };
  } catch (err) {
    const timedOut = err && err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';
    return {
      ok: false,
      stdout: '',
      error: timedOut ? `Time limit exceeded (${timeoutMs}ms)` : describeError(err),
      ms: Date.now() - started,
    };
  }
}

process.on('message', async ({ code, inputs, timeoutMs }) => {
  let script;
  try {
    script = new vm.Script(code, { filename: 'solution.js' });
  } catch (err) {
    const error = describeError(err);
    process.send({ results: inputs.map(() => ({ ok: false, stdout: '', error, ms: 0 })) });
    return;
  }

  const results = [];
  for (const input of inputs) {
    results.push(await runCase(script, input, timeoutMs));
  }
  process.send({ results });
});

// If the API process goes away, don't linger.
process.on('disconnect', () => process.exit(0));
