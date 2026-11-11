/* Real Python (and SQLite) execution in the browser via Pyodide.
 *
 * Runs in a dedicated Web Worker so user code can never freeze the page; the
 * main thread terminates this worker if a run exceeds its time limit.
 */
/* global importScripts, loadPyodide */
const PYODIDE_VERSION = '0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReady = null;
let sqliteReady = null;

function getPyodide() {
  if (!pyodideReady) {
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    pyodideReady = loadPyodide({ indexURL: PYODIDE_BASE });
  }
  return pyodideReady;
}

// Evaluates one test expression in the user's namespace and reports the value
// in several textual forms so it can be compared with the expected string.
const TEST_HARNESS = `
import json as __json
def __codelab_eval(expr, ns):
    value = eval(expr, ns)
    try:
        as_json = __json.dumps(value, separators=(",", ":"))
    except Exception:
        as_json = None
    return __json.dumps({"json": as_json, "str": str(value), "repr": repr(value)})
`;

// Runs a SQL script statement by statement against an in-memory SQLite database
// and prints every result set as a table.
const SQL_RUNNER = `
import sqlite3 as __sqlite3
def __codelab_sql(script):
    con = __sqlite3.connect(":memory:")
    cur = con.cursor()
    buffer = ""
    shown = 0
    for line in script.splitlines(keepends=True):
        buffer += line
        if not __sqlite3.complete_statement(buffer):
            continue
        statement, buffer = buffer.strip(), ""
        if not statement or statement == ";":
            continue
        cur.execute(statement)
        if cur.description:
            headers = [d[0] for d in cur.description]
            rows = cur.fetchmany(200)
            cells = [headers] + [["NULL" if v is None else str(v) for v in row] for row in rows]
            widths = [max(len(r[i]) for r in cells) for i in range(len(headers))]
            line_of = lambda r: "| " + " | ".join(c.ljust(w) for c, w in zip(r, widths)) + " |"
            rule = "+-" + "-+-".join("-" * w for w in widths) + "-+"
            print(rule); print(line_of(headers)); print(rule)
            for r in cells[1:]:
                print(line_of(r))
            print(rule)
            print(f"({len(rows)} row{'s' if len(rows) != 1 else ''}{', truncated at 200' if len(rows) == 200 else ''})\\n")
            shown += 1
        elif cur.rowcount > 0:
            print(f"OK, {cur.rowcount} row{'s' if cur.rowcount != 1 else ''} affected")
    if buffer.strip():
        cur.execute(buffer)
    con.commit()
    if shown == 0:
        print("Script ran. No SELECT statement returned rows to display.")
`;

function cleanTraceback(message) {
  // Drop Pyodide's internal frames; keep the part that points at the user's code.
  const lines = String(message).split('\n');
  const start = lines.findIndex((l) => l.includes('File "<exec>"') || l.includes('File "<string>"'));
  return (start > 0 ? ['Traceback (most recent call last):', ...lines.slice(start)] : lines).join('\n').trim();
}

self.onmessage = async (event) => {
  const { id, mode, code, tests } = event.data;
  const logs = [];
  try {
    self.postMessage({ id, type: 'status', message: 'Loading the Python runtime (about 10 MB, first run only)…' });
    const pyodide = await getPyodide();
    pyodide.setStdout({ batched: (line) => logs.push(line) });
    pyodide.setStderr({ batched: (line) => logs.push(line) });

    // A fresh namespace per run so one execution cannot leak state into the next.
    const namespace = pyodide.globals.get('dict')();
    self.postMessage({ id, type: 'status', message: 'Running…' });

    if (mode === 'sql') {
      if (!sqliteReady) sqliteReady = pyodide.loadPackage('sqlite3');
      await sqliteReady;
      pyodide.runPython(SQL_RUNNER, { globals: namespace });
      namespace.get('__codelab_sql')(code);
      self.postMessage({ id, type: 'done', logs, tests: [] });
      return;
    }

    await pyodide.loadPackagesFromImports(code);
    await pyodide.runPythonAsync(code, { globals: namespace });

    const results = [];
    if (tests && tests.length) {
      pyodide.runPython(TEST_HARNESS, { globals: namespace });
      const evaluate = namespace.get('__codelab_eval');
      for (const test of tests) {
        try {
          results.push({ ok: true, value: JSON.parse(evaluate(test.input, namespace)) });
        } catch (err) {
          results.push({ ok: false, error: cleanTraceback(err.message).split('\n').pop() });
        }
      }
    }
    self.postMessage({ id, type: 'done', logs, tests: results });
  } catch (err) {
    const trace = cleanTraceback(err && err.message ? err.message : err);
    // For SQL the Python frames are noise: only the database's own message matters.
    const lastLine = trace.split(String.fromCharCode(10)).pop();
    const sqlMessage = lastLine.replace(/^sqlite3\.\w+:\s*/, 'SQL error: ');
    self.postMessage({ id, type: 'error', logs, error: mode === 'sql' ? sqlMessage : trace });
  }
};
