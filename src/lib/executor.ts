import { ExecutionResult, LabChallenge, SupportedLanguage } from '@/types';

/**
 * Real in-browser execution.
 *
 * - JavaScript / TypeScript run in a Web Worker (no DOM, cookie or storage access).
 * - Python runs on Pyodide (CPython compiled to WebAssembly) in a Web Worker.
 * - SQL runs on SQLite through the same Python runtime.
 * - Other languages have no browser runtime, and the result says so plainly
 *   instead of inventing output.
 *
 * Every run has a time limit; on expiry the worker is terminated, so an
 * infinite loop can never freeze the page.
 */

type WorkerKind = 'python' | 'js';

interface TestValue {
  json: string | null;
  str: string;
  repr: string;
}
interface WorkerTest {
  ok: boolean;
  value?: TestValue;
  error?: string;
}
interface WorkerReply {
  id: number;
  type: 'status' | 'done' | 'error';
  message?: string;
  logs?: string[];
  tests?: WorkerTest[];
  error?: string;
}

const RUN_LIMIT_MS = 10_000;
/** A first run may also download its runtime, so it gets longer. */
const COLD_START_LIMIT_MS = 60_000;

const workers: Partial<Record<WorkerKind, Worker>> = {};
const warmed: Partial<Record<WorkerKind, boolean>> = {};
let nextId = 1;

function getWorker(kind: WorkerKind): Worker {
  if (!workers[kind]) {
    workers[kind] = new Worker(kind === 'python' ? '/workers/python-worker.js' : '/workers/js-worker.js');
  }
  return workers[kind]!;
}

function discardWorker(kind: WorkerKind) {
  workers[kind]?.terminate();
  delete workers[kind];
  delete warmed[kind];
}

/** True when the reported value matches the expected string of a test case. */
export function matchesExpected(value: TestValue, expected: string): boolean {
  const want = expected.trim();
  if (value.json === want || value.str === want || value.repr === want) return true;
  // Tolerate formatting differences such as spacing or key order in JSON.
  try {
    const a = JSON.parse(want);
    const b = value.json === null ? undefined : JSON.parse(value.json);
    return b !== undefined && canonical(a) === canonical(b);
  } catch {
    return false;
  }
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function runInWorker(
  kind: WorkerKind,
  payload: Record<string, unknown>,
  onStatus?: (message: string) => void
): Promise<WorkerReply> {
  return new Promise((resolve) => {
    const worker = getWorker(kind);
    const id = nextId++;
    // The first run of a runtime may download it (Pyodide, or the TypeScript compiler).
    const limit = !warmed[kind] ? COLD_START_LIMIT_MS : RUN_LIMIT_MS;

    const finish = (reply: WorkerReply) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      resolve(reply);
    };
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== id) return;
      if (event.data.type === 'status') {
        onStatus?.(event.data.message ?? '');
        return;
      }
      warmed[kind] = true;
      finish(event.data);
    };
    const onError = (event: ErrorEvent) => {
      discardWorker(kind);
      finish({ id, type: 'error', logs: [], error: event.message || 'The runtime failed to start. Check your network connection.' });
    };
    const timer = setTimeout(() => {
      discardWorker(kind);
      finish({
        id,
        type: 'error',
        logs: [],
        error: `Stopped after ${limit / 1000} seconds. Look for an infinite loop or unbounded recursion.`,
      });
    }, limit);

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, ...payload });
  });
}

const NO_RUNTIME: Partial<Record<SupportedLanguage, string>> = {
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Go',
};

export async function executeCodeInBrowser(
  code: string,
  language: SupportedLanguage,
  challenge: LabChallenge | null,
  onStatus?: (message: string) => void
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const elapsed = () => Math.round(performance.now() - startTime);

  if (language === 'html' || language === 'css') {
    return { output: 'Rendered in the Web Preview tab.', executionTimeMs: elapsed(), status: 'success', isActualExecution: true };
  }

  if (NO_RUNTIME[language]) {
    return {
      output:
        `${NO_RUNTIME[language]} cannot be executed in the browser, so nothing was run.\n` +
        'Debug Code still works: it analyses the source statically and with the AI model.',
      executionTimeMs: elapsed(),
      status: 'idle',
      isActualExecution: false,
    };
  }

  const tests = (challenge?.testCases ?? []).filter((tc) => tc.input);
  const reply =
    language === 'python' || language === 'sql'
      ? await runInWorker('python', { mode: language, code, tests: language === 'python' ? tests : [] }, onStatus)
      : await runInWorker('js', { code, tests, language }, onStatus);

  const output = (reply.logs ?? []).join('\n');
  if (reply.type === 'error') {
    return { output, error: reply.error, executionTimeMs: elapsed(), status: 'error', isActualExecution: true };
  }

  const testResults: NonNullable<ExecutionResult['testResults']> = (reply.tests ?? []).map((result, i) => {
    const tc = tests[i];
    if (!result.ok || !result.value) {
      return { passed: false, name: tc.description, expected: tc.expected, error: result.error };
    }
    return {
      passed: matchesExpected(result.value, tc.expected),
      name: tc.description,
      actual: result.value.json ?? result.value.repr,
      expected: tc.expected,
    };
  });

  return {
    output: output || (testResults.length > 0 ? 'Ran with test assertions; no console output.' : 'Ran successfully with no console output.'),
    executionTimeMs: elapsed(),
    status: testResults.some((t) => !t.passed) ? 'error' : 'success',
    isActualExecution: true,
    testResults,
  };
}
