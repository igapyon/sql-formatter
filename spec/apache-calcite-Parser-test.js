'use strict';

const { CalciteLexer, CalciteParser } = require('./apache-calcite-Parser');

const cases = [
  { name: 'select-basic', sql: 'SELECT 1', fn: 'SqlStmtList' },
  { name: 'select-with-from', sql: 'SELECT a FROM t', fn: 'SqlStmtList' },
  { name: 'select-where', sql: 'SELECT a FROM t WHERE b = 1', fn: 'SqlStmtList' },
  { name: 'select-group-by', sql: 'SELECT a, COUNT(*) FROM t GROUP BY a', fn: 'SqlStmtList' },
  { name: 'select-window', sql: 'SELECT a FROM t WINDOW w AS (PARTITION BY a)', fn: 'SqlStmtList' },
  { name: 'cte', sql: 'WITH t AS (SELECT 1) SELECT * FROM t', fn: 'SqlStmtList' },
  { name: 'insert-values', sql: 'INSERT INTO t(a) VALUES (1)', fn: 'SqlStmtList' },
  { name: 'update', sql: 'UPDATE t SET a = 1 WHERE b = 2', fn: 'SqlStmtList' },
  { name: 'delete', sql: 'DELETE FROM t WHERE a IN (1,2,3)', fn: 'SqlStmtList' },
  { name: 'merge', sql: 'MERGE INTO t USING u ON t.id = u.id WHEN MATCHED THEN UPDATE SET a = 1', fn: 'SqlStmtList' },
  { name: 'json-value', sql: "SELECT JSON_VALUE(doc, '$.a' RETURNING VARCHAR) FROM t", fn: 'SqlStmtList' },
  { name: 'date-diff', sql: 'SELECT DATE_DIFF(d1, d2, DAY) FROM t', fn: 'SqlStmtList' },
  { name: 'match-recognize', sql: 'SELECT * FROM t MATCH_RECOGNIZE (PATTERN (A) DEFINE A AS a > 0)', fn: 'SqlStmtList' },
  { name: 'match-recognize-partition-order', sql: 'SELECT * FROM t MATCH_RECOGNIZE (PARTITION BY a ORDER BY b MEASURES CLASSIFIER() AS c PATTERN (A B) DEFINE A AS a > 0, B AS b > 0)', fn: 'SqlStmtList' },
  { name: 'match-recognize-after-skip', sql: 'SELECT * FROM t MATCH_RECOGNIZE (AFTER MATCH SKIP TO NEXT ROW PATTERN (A) DEFINE A AS a > 0)', fn: 'SqlStmtList' },
  { name: 'pivot', sql: 'SELECT * FROM t PIVOT (SUM(x) FOR y IN (1))', fn: 'SqlStmtList' },
  { name: 'pivot-multi-values', sql: 'SELECT * FROM t PIVOT (SUM(x) FOR y IN (1 AS one, 2 AS two))', fn: 'SqlStmtList' },
  { name: 'pivot-multi-aggs', sql: 'SELECT * FROM t PIVOT (SUM(x) AS sx, COUNT(*) FOR y IN (1))', fn: 'SqlStmtList' },
  { name: 'unpivot', sql: 'SELECT * FROM t UNPIVOT (v FOR c IN (a))', fn: 'SqlStmtList' },
  { name: 'window-order-frame', sql: 'SELECT a FROM t WINDOW w AS (PARTITION BY a ORDER BY b ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)', fn: 'SqlStmtList' },
  { name: 'window-range', sql: 'SELECT a FROM t WINDOW w AS (ORDER BY a RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)', fn: 'SqlStmtList' },
  { name: 'window-allow-partial', sql: 'SELECT a FROM t WINDOW w AS (ORDER BY b ALLOW PARTIAL)', fn: 'SqlStmtList' },
  { name: 'lexer-line-comment', sql: 'SELECT 1 -- trailing comment', fn: 'SqlStmtList' },
  { name: 'lexer-block-comment', sql: 'SELECT /* block */ 1', fn: 'SqlStmtList' },
  { name: 'lexer-quoted-ident-double', sql: 'SELECT "Select" FROM "From"', fn: 'SqlStmtList' },
  { name: 'lexer-quoted-ident-backtick', sql: 'SELECT `a` FROM `b`', fn: 'SqlStmtList' },
  { name: 'lexer-string-escape', sql: "SELECT 'a''b' FROM t", fn: 'SqlStmtList' },
  { name: 'lexer-number-exponent', sql: 'SELECT 1.2e-3 FROM t', fn: 'SqlStmtList' },
  { name: 'lexer-number-leading-dot', sql: 'SELECT .5 FROM t', fn: 'SqlStmtList' },
  { name: 'ddl-set', sql: 'SET foo = 1', fn: 'SqlStmtList' },
  { name: 'ddl-reset', sql: 'RESET foo', fn: 'SqlStmtList' },
  { name: 'ddl-reset-all', sql: 'RESET ALL', fn: 'SqlStmtList' },
  { name: 'ddl-alter-system-set', sql: 'ALTER SYSTEM SET foo = ON', fn: 'SqlStmtList' },
  { name: 'ddl-alter-session-reset', sql: 'ALTER SESSION RESET foo', fn: 'SqlStmtList' },
  { name: 'ddl-explain', sql: 'EXPLAIN PLAN INCLUDING ATTRIBUTES WITH TYPE AS JSON FOR SELECT 1', fn: 'SqlStmtList' },
  { name: 'ddl-describe-table', sql: 'DESCRIBE TABLE t', fn: 'SqlStmtList' },
  { name: 'ddl-describe-database', sql: 'DESCRIBE DATABASE db', fn: 'SqlStmtList' },
  { name: 'ddl-describe-statement', sql: 'DESCRIBE STATEMENT SELECT 1', fn: 'SqlStmtList' },
  { name: 'ddl-call', sql: 'CALL foo(1)', fn: 'SqlStmtList' },
  { name: 'select-join-inner', sql: 'SELECT * FROM a JOIN b ON a.id = b.id', fn: 'SqlStmtList' },
  { name: 'select-join-left', sql: 'SELECT * FROM a LEFT JOIN b ON a.id = b.id', fn: 'SqlStmtList' },
  { name: 'select-join-using', sql: 'SELECT * FROM a JOIN b USING (id)', fn: 'SqlStmtList' },
  { name: 'select-join-natural', sql: 'SELECT * FROM a NATURAL JOIN b', fn: 'SqlStmtList' },
  { name: 'select-join-cross', sql: 'SELECT * FROM a CROSS JOIN b', fn: 'SqlStmtList' },
  { name: 'select-join-comma', sql: 'SELECT * FROM a, b', fn: 'SqlStmtList' },
  { name: 'select-setop-union', sql: 'SELECT a FROM t UNION SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'select-setop-intersect', sql: 'SELECT a FROM t INTERSECT SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'select-setop-except', sql: 'SELECT a FROM t EXCEPT SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'select-order-limit', sql: 'SELECT a FROM t ORDER BY a LIMIT 10', fn: 'SqlStmtList' },
  { name: 'select-offset-limit', sql: 'SELECT a FROM t ORDER BY a OFFSET 5 LIMIT 10', fn: 'SqlStmtList' },
  { name: 'select-fetch', sql: 'SELECT a FROM t ORDER BY a FETCH FIRST 3 ROWS ONLY', fn: 'SqlStmtList' },
  { name: 'select-values', sql: 'VALUES (1), (2)', fn: 'SqlStmtList' },
  { name: 'select-table', sql: 'TABLE t', fn: 'SqlStmtList' },
  { name: 'select-case', sql: 'SELECT CASE WHEN a > 0 THEN 1 ELSE 0 END FROM t', fn: 'SqlStmtList' },
  { name: 'select-cast', sql: 'SELECT CAST(a AS INTEGER) FROM t', fn: 'SqlStmtList' },
  { name: 'select-coalesce', sql: 'SELECT COALESCE(a, 0) FROM t', fn: 'SqlStmtList' },
  { name: 'select-json-exists', sql: "SELECT JSON_EXISTS(doc, '$.a') FROM t", fn: 'SqlStmtList' },
  { name: 'select-interval', sql: "SELECT INTERVAL '1' DAY FROM t", fn: 'SqlStmtList' },
];

const negativeCases = [
  { name: 'neg-having-without-group', sql: 'SELECT a FROM t HAVING a > 0', fn: 'SqlStmtList' },
  { name: 'neg-natural-join-on', sql: 'SELECT * FROM a NATURAL JOIN b ON a.id = b.id', fn: 'SqlStmtList' },
  { name: 'neg-join-no-condition', sql: 'SELECT * FROM a JOIN b', fn: 'SqlStmtList' },
  { name: 'neg-window-frame-without-order', sql: 'SELECT a FROM t WINDOW w AS (ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)', fn: 'SqlStmtList' },
  { name: 'neg-fetch-without-order', sql: 'SELECT * FROM t FETCH FIRST 1 ROW ONLY', fn: 'SqlStmtList' },
  { name: 'neg-limit-and-fetch', sql: 'SELECT * FROM t ORDER BY a LIMIT 1 FETCH FIRST 1 ROW ONLY', fn: 'SqlStmtList' },
  { name: 'neg-where-without-from', sql: 'SELECT a WHERE a > 0', fn: 'SqlStmtList' },
];

if (require.main === module) {
  const samples = [
    "SELECT 1",
    "SELECT /*+ index(t) */ a AS x FROM t WHERE a IS NOT DISTINCT FROM b",
    "WITH t AS (SELECT 1) SELECT * FROM t",
    "EXPLAIN PLAN FOR SELECT 1",
    "INSERT INTO t(a) VALUES (1)",
    "UPDATE t SET a = 1 WHERE b = 2",
    "DELETE FROM t WHERE a IN (1,2,3)",
    "MERGE INTO t USING u ON t.id = u.id WHEN MATCHED THEN UPDATE SET a = 1",
    "SELECT ARRAY_AGG(x) FROM t",
    "SELECT JSON_VALUE(doc, '$.a' RETURNING VARCHAR) FROM t",
    "SELECT DATE_DIFF(d1, d2, DAY) FROM t",
  ];
  for (const src of samples) {
    try {
      runCase({ name: 'sample', sql: src, fn: 'SqlStmtList' });
      console.log(`OK: ${src}`);
    } catch (e) {
      console.error(`NG: ${src} -> ${e.message}`);
    }
  }
}

function runCase({ name, sql, fn }) {
  const lexer = new CalciteLexer(sql);
  const tokens = lexer.tokenize();
  const parser = new CalciteParser(tokens);
  const parseFn = parser[fn];
  if (typeof parseFn !== 'function') {
    throw new Error(`Unknown parse function: ${fn}`);
  }
  parseFn.call(parser);
}

let failed = 0;
for (const c of cases) {
  try {
    runCase(c);
    console.log(`OK  ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`NG  ${c.name}: ${err.message}`);
  }
}

for (const c of negativeCases) {
  let ok = false;
  try {
    runCase(c);
  } catch (_err) {
    ok = true;
  }
  if (ok) {
    console.log(`OK  ${c.name} (rejected)`);
  } else {
    failed++;
    console.error(`NG  ${c.name}: expected rejection`);
  }
}

if (failed > 0) {
  console.error(`\nFAILED: ${failed}`);
  process.exit(1);
}

console.log(`\nALL OK: ${cases.length + negativeCases.length}`);
