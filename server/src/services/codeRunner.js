import { fork } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const RUNNER_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runner', 'jsRunner.js');

export const AUTO_JUDGED_LANGUAGES = ['javascript'];

// Ignore trailing whitespace on each line and blank lines at the start/end.
const normalize = (text) =>
  String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

/**
 * Executes the code in a throw-away child process (empty environment, 64 MB heap,
 * killed on timeout). NOTE: this keeps a runaway submission away from the API server,
 * but it is not a hardened sandbox. For real candidates use an isolated executor such
 * as Judge0 / Piston / Docker + gVisor and swap it in here.
 */
function runInChild({ code, inputs, perCaseTimeoutMs }) {
  return new Promise((resolve) => {
    const child = fork(RUNNER_PATH, [], {
      execArgv: ['--max-old-space-size=64'],
      env: {},
      cwd: os.tmpdir(),
      silent: true,
    });
    child.stdout?.resume();
    child.stderr?.resume();

    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      child.kill('SIGKILL');
      resolve(payload);
    };

    const killTimer = setTimeout(
      () => finish({ timedOut: true, results: [] }),
      perCaseTimeoutMs * inputs.length + 1500
    );

    child.on('message', (msg) => finish({ results: msg.results || [] }));
    child.on('error', (err) => finish({ crashed: true, error: err.message, results: [] }));
    child.on('exit', () => finish({ crashed: true, error: 'The runner stopped unexpectedly', results: [] }));

    child.send({ code, inputs, timeoutMs: perCaseTimeoutMs });
  });
}

const pending = (message, total) => ({ status: 'pending', passed: 0, total, message, details: [] });

export async function runCode({ code, language, testCases = [] }) {
  const total = testCases.length;

  if (!AUTO_JUDGED_LANGUAGES.includes(language)) {
    return pending(
      `Automatic judging is only available for JavaScript. This ${language} submission was saved for manual review.`,
      total
    );
  }
  if (!total) {
    return pending('This question has no test cases, so the submission was saved for manual review.', 0);
  }

  const run = await runInChild({
    code,
    inputs: testCases.map((tc) => tc.input ?? ''),
    perCaseTimeoutMs: config.codeTimeoutMs,
  });

  const details = testCases.map((tc, i) => {
    const r =
      run.results[i] ||
      { ok: false, stdout: '', error: run.timedOut ? 'Time limit exceeded' : run.error || 'Execution failed' };
    const passed = r.ok && normalize(r.stdout) === normalize(tc.expectedOutput);

    const detail = { index: i + 1, passed, isHidden: Boolean(tc.isHidden), ms: r.ms ?? 0 };
    if (!tc.isHidden) {
      detail.input = tc.input ?? '';
      detail.expected = tc.expectedOutput;
      detail.actual = r.stdout ?? '';
    }
    if (r.error) detail.error = r.error;
    return detail;
  });

  const passedCount = details.filter((d) => d.passed).length;
  const status = passedCount === total ? 'passed' : details.every((d) => d.error) ? 'error' : 'failed';

  return {
    status,
    passed: passedCount,
    total,
    message: status === 'passed' ? 'All test cases passed.' : `${passedCount} of ${total} test cases passed.`,
    details,
  };
}

// Free execution: no question, no test cases — just run the code once and hand back
// whatever it printed (or the error it threw). Used when a candidate wants to sanity-check
// their code before any question has been sent.
export async function runFreeform({ code, language }) {
  if (!AUTO_JUDGED_LANGUAGES.includes(language)) {
    return {
      mode: 'free',
      status: 'pending',
      stdout: '',
      message: `Direct execution is only available for JavaScript. Switch the language to JavaScript to run code here.`,
    };
  }

  const run = await runInChild({ code, inputs: [''], perCaseTimeoutMs: config.codeTimeoutMs });
  const r = run.results[0] || {
    ok: false,
    stdout: '',
    error: run.timedOut ? 'Time limit exceeded' : run.error || 'Execution failed',
  };

  return {
    mode: 'free',
    status: r.ok ? 'ran' : 'error',
    stdout: r.stdout ?? '',
    error: r.error,
    ms: r.ms ?? 0,
  };
}
