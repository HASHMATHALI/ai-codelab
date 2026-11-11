/* JavaScript execution off the main thread.
 *
 * User code runs in this Web Worker: it has no access to the page's DOM,
 * cookies or localStorage, and an infinite loop only hangs the worker, which
 * the main thread terminates after a time limit.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function format(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

const TYPESCRIPT_URL = 'https://cdn.jsdelivr.net/npm/typescript@5.5.4/lib/typescript.js';
let tsLoaded = false;

/** Strips types with the real TypeScript compiler (loaded on first use). */
function transpile(source) {
  if (!tsLoaded) {
    importScripts(TYPESCRIPT_URL);
    tsLoaded = true;
  }
  /* global ts */
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, strict: false },
  }).outputText;
}

self.onmessage = async (event) => {
  const { id, tests, language } = event.data;
  let { code } = event.data;
  const logs = [];
  const capture = {
    log: (...a) => logs.push(a.map(format).join(' ')),
    info: (...a) => logs.push(a.map(format).join(' ')),
    debug: (...a) => logs.push(a.map(format).join(' ')),
    warn: (...a) => logs.push('[WARN] ' + a.map(format).join(' ')),
    error: (...a) => logs.push('[ERROR] ' + a.map(format).join(' ')),
    table: (data) => logs.push(format(data)),
  };
  const silent = { log() {}, info() {}, debug() {}, warn() {}, error() {}, table() {} };

  try {
    if (language === 'typescript') {
      self.postMessage({ id, type: 'status', message: 'Loading the TypeScript compiler (first run only)…' });
      code = transpile(code);
    }
    // AsyncFunction lets user code (and test expressions) use top-level await.
    await new AsyncFunction('console', code)(capture);

    const results = [];
    for (const test of tests || []) {
      try {
        const expression = test.input.trim().replace(/;+$/, '');
        const value = await new AsyncFunction('console', `${code}\nreturn (${expression});`)(silent);
        let json;
        try {
          json = JSON.stringify(value);
        } catch {
          json = undefined;
        }
        results.push({ ok: true, value: { json: json === undefined ? null : json, str: String(value), repr: String(value) } });
      } catch (err) {
        results.push({ ok: false, error: err && err.message ? err.message : String(err) });
      }
    }
    self.postMessage({ id, type: 'done', logs, tests: results });
  } catch (err) {
    self.postMessage({ id, type: 'error', logs, error: err && err.stack ? err.stack : String(err) });
  }
};
