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
  { name: 'select-window-over-basic', sql: 'SELECT SUM(a) OVER (PARTITION BY b ORDER BY c) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-over-frame-rows', sql: 'SELECT SUM(a) OVER (ORDER BY c ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-over-frame-range', sql: 'SELECT SUM(a) OVER (ORDER BY c RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-qualify', sql: 'SELECT a FROM t QUALIFY ROW_NUMBER() OVER (ORDER BY a) = 1', fn: 'SqlStmtList' },
  { name: 'select-window-within-group', sql: 'SELECT LISTAGG(a) WITHIN GROUP (ORDER BY a) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-null-treatment', sql: 'SELECT LAST_VALUE(a) RESPECT NULLS OVER (ORDER BY a) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-ignore-nulls', sql: 'SELECT FIRST_VALUE(a) IGNORE NULLS OVER (ORDER BY a) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-filter', sql: 'SELECT COUNT(*) FILTER (WHERE a > 0) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-ordered-set', sql: 'SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a) FROM t', fn: 'SqlStmtList' },
  { name: 'select-window-over-name', sql: 'SELECT SUM(a) OVER w FROM t WINDOW w AS (PARTITION BY b)', fn: 'SqlStmtList' },
  { name: 'select-json-query', sql: "SELECT JSON_QUERY(doc, '$.a') FROM t", fn: 'SqlStmtList' },
  { name: 'select-json-object', sql: "SELECT JSON_OBJECT('a' VALUE 1) FROM t", fn: 'SqlStmtList' },
  { name: 'select-json-array', sql: "SELECT JSON_ARRAY(1, 2, 3) FROM t", fn: 'SqlStmtList' },
  { name: 'select-json-objectagg', sql: "SELECT JSON_OBJECTAGG(k VALUE v) FROM t", fn: 'SqlStmtList' },
  { name: 'select-json-arrayagg', sql: "SELECT JSON_ARRAYAGG(a) FROM t", fn: 'SqlStmtList' },
  { name: 'select-trim', sql: "SELECT TRIM(BOTH 'x' FROM a) FROM t", fn: 'SqlStmtList' },
  { name: 'select-substring', sql: 'SELECT SUBSTRING(a FROM 2 FOR 3) FROM t', fn: 'SqlStmtList' },
  { name: 'select-position', sql: "SELECT POSITION('a' IN b) FROM t", fn: 'SqlStmtList' },
  { name: 'select-translate', sql: "SELECT TRANSLATE(a, 'abc', 'xyz') FROM t", fn: 'SqlStmtList' },
  { name: 'select-overlay', sql: "SELECT OVERLAY(a PLACING 'x' FROM 2) FROM t", fn: 'SqlStmtList' },
  { name: 'select-date-trunc', sql: "SELECT DATE_TRUNC('DAY', d) FROM t", fn: 'SqlStmtList' },
  { name: 'select-timestamp-diff', sql: 'SELECT TIMESTAMP_DIFF(t1, t2, DAY) FROM t', fn: 'SqlStmtList' },
  { name: 'select-time-trunc', sql: "SELECT TIME_TRUNC(t, HOUR) FROM t", fn: 'SqlStmtList' },
  { name: 'select-convert', sql: 'SELECT CONVERT(a, INTEGER) FROM t', fn: 'SqlStmtList' },
  { name: 'select-extract', sql: 'SELECT EXTRACT(YEAR FROM d) FROM t', fn: 'SqlStmtList' },
  { name: 'select-contains-substr', sql: "SELECT CONTAINS_SUBSTR(a, 'x') FROM t", fn: 'SqlStmtList' },
  { name: 'select-contains-substr-with-scope', sql: "SELECT CONTAINS_SUBSTR(a, 'x', JSON_SCOPE := 2) FROM t", fn: 'SqlStmtList' },
  { name: 'select-typed-date', sql: "SELECT DATE '2020-01-01' FROM t", fn: 'SqlStmtList' },
  { name: 'select-typed-time', sql: "SELECT TIME '12:34:56' FROM t", fn: 'SqlStmtList' },
  { name: 'select-typed-timestamp', sql: "SELECT TIMESTAMP '2020-01-01 12:34:56' FROM t", fn: 'SqlStmtList' },
  { name: 'select-uuid', sql: "SELECT UUID '123e4567-e89b-12d3-a456-426614174000' FROM t", fn: 'SqlStmtList' },
  { name: 'select-interval-year', sql: "SELECT INTERVAL '2' YEAR FROM t", fn: 'SqlStmtList' },
  { name: 'select-interval-day-to-second', sql: "SELECT INTERVAL '1 02:03:04' DAY TO SECOND FROM t", fn: 'SqlStmtList' },
  { name: 'select-row-type', sql: 'SELECT ROW(1, 2) FROM t', fn: 'SqlStmtList' },
  { name: 'select-array-constructor', sql: 'SELECT ARRAY[1, 2, 3] FROM t', fn: 'SqlStmtList' },
  { name: 'select-map-constructor', sql: 'SELECT MAP[1, 2] FROM t', fn: 'SqlStmtList' },
  { name: 'select-multiset', sql: 'SELECT MULTISET[1, 2] FROM t', fn: 'SqlStmtList' },
  { name: 'select-cast-typed', sql: 'SELECT CAST(a AS DECIMAL(10,2)) FROM t', fn: 'SqlStmtList' },
  { name: 'select-cast-with-timezone', sql: 'SELECT CAST(a AS TIMESTAMP WITH TIME ZONE) FROM t', fn: 'SqlStmtList' },
  { name: 'select-period', sql: "SELECT PERIOD (DATE '2020-01-01', DATE '2020-12-31') FROM t", fn: 'SqlStmtList' },
  { name: 'insert-select', sql: 'INSERT INTO t(a) SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'insert-default-values', sql: 'INSERT INTO t VALUES (DEFAULT)', fn: 'SqlStmtList' },
  { name: 'update-multi-set', sql: 'UPDATE t SET a = 1, b = 2 WHERE c = 3', fn: 'SqlStmtList' },
  { name: 'delete-simple', sql: 'DELETE FROM t', fn: 'SqlStmtList' },
  { name: 'merge-update-insert', sql: 'MERGE INTO t USING u ON t.id = u.id WHEN MATCHED THEN UPDATE SET a = 1 WHEN NOT MATCHED THEN INSERT (id) VALUES (u.id)', fn: 'SqlStmtList' },
  { name: 'explain-without-impl', sql: 'EXPLAIN PLAN WITHOUT IMPLEMENTATION FOR SELECT 1', fn: 'SqlStmtList' },
  { name: 'describe-catalog', sql: 'DESCRIBE CATALOG cat', fn: 'SqlStmtList' },
  { name: 'describe-schema', sql: 'DESCRIBE SCHEMA sch', fn: 'SqlStmtList' },
  { name: 'set-string', sql: "SET foo = 'bar'", fn: 'SqlStmtList' },
  { name: 'set-null', sql: 'SET foo = NULL', fn: 'SqlStmtList' },
  { name: 'setop-union-all', sql: 'SELECT a FROM t UNION ALL SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'setop-union-distinct', sql: 'SELECT a FROM t UNION DISTINCT SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'setop-except-all', sql: 'SELECT a FROM t EXCEPT ALL SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'setop-intersect-distinct', sql: 'SELECT a FROM t INTERSECT DISTINCT SELECT a FROM u', fn: 'SqlStmtList' },
  { name: 'setop-chained', sql: 'SELECT a FROM t UNION SELECT a FROM u INTERSECT SELECT a FROM v', fn: 'SqlStmtList' },
  { name: 'setop-order-limit', sql: 'SELECT a FROM t UNION SELECT a FROM u ORDER BY a LIMIT 5', fn: 'SqlStmtList' },
  { name: 'setop-order-fetch', sql: 'SELECT a FROM t UNION SELECT a FROM u ORDER BY a FETCH FIRST 3 ROWS ONLY', fn: 'SqlStmtList' },
  { name: 'setop-order-offset-limit', sql: 'SELECT a FROM t UNION SELECT a FROM u ORDER BY a OFFSET 2 LIMIT 4', fn: 'SqlStmtList' },
  { name: 'setop-table-values', sql: 'VALUES (1) UNION SELECT 2', fn: 'SqlStmtList' },
  { name: 'setop-table-table', sql: 'TABLE t UNION TABLE u', fn: 'SqlStmtList' },
  { name: 'insert-upsert', sql: 'UPSERT INTO t(a) VALUES (1)', fn: 'SqlStmtList' },
  { name: 'insert-hints', sql: 'INSERT INTO t /*+ hint */ (a) VALUES (1)', fn: 'SqlStmtList' },
  { name: 'update-with-alias', sql: 'UPDATE t AS x SET a = 1', fn: 'SqlStmtList' },
  { name: 'update-with-extend', sql: 'UPDATE t EXTEND (a INTEGER) SET a = 1', fn: 'SqlStmtList' },
  { name: 'delete-with-alias', sql: 'DELETE FROM t AS x', fn: 'SqlStmtList' },
  { name: 'delete-with-extend', sql: 'DELETE FROM t EXTEND (a INTEGER)', fn: 'SqlStmtList' },
  { name: 'merge-with-extend', sql: 'MERGE INTO t EXTEND (a INTEGER) USING u ON t.id = u.id WHEN MATCHED THEN UPDATE SET a = 1', fn: 'SqlStmtList' },
  { name: 'explain-including-all', sql: 'EXPLAIN PLAN INCLUDING ALL ATTRIBUTES FOR SELECT 1', fn: 'SqlStmtList' },
  { name: 'explain-as-xml', sql: 'EXPLAIN PLAN AS XML FOR SELECT 1', fn: 'SqlStmtList' },
  { name: 'describe-table-extra', sql: 'DESCRIBE TABLE t EXTENDED', fn: 'SqlStmtList' },
  { name: 'set-interval', sql: "SET foo = INTERVAL '1' DAY", fn: 'SqlStmtList' },
];

const negativeCases = [
  { name: 'neg-having-without-group', sql: 'SELECT a FROM t HAVING a > 0', fn: 'SqlStmtList' },
  { name: 'neg-natural-join-on', sql: 'SELECT * FROM a NATURAL JOIN b ON a.id = b.id', fn: 'SqlStmtList' },
  { name: 'neg-join-no-condition', sql: 'SELECT * FROM a JOIN b', fn: 'SqlStmtList' },
  { name: 'neg-window-frame-without-order', sql: 'SELECT a FROM t WINDOW w AS (ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)', fn: 'SqlStmtList' },
  { name: 'neg-fetch-without-order', sql: 'SELECT * FROM t FETCH FIRST 1 ROW ONLY', fn: 'SqlStmtList' },
  { name: 'neg-limit-and-fetch', sql: 'SELECT * FROM t ORDER BY a LIMIT 1 FETCH FIRST 1 ROW ONLY', fn: 'SqlStmtList' },
  { name: 'neg-where-without-from', sql: 'SELECT a WHERE a > 0', fn: 'SqlStmtList' },
  { name: 'neg-offset-without-order', sql: 'SELECT * FROM t OFFSET 1', fn: 'SqlStmtList' },
  { name: 'neg-setop-nonquery-left', sql: '1 UNION SELECT 1', fn: 'SqlStmtList' },
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
