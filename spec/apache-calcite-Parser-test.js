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
  { name: 'pivot', sql: 'SELECT * FROM t PIVOT (SUM(x) FOR y IN (1))', fn: 'SqlStmtList' },
  { name: 'unpivot', sql: 'SELECT * FROM t UNPIVOT (v FOR c IN (a))', fn: 'SqlStmtList' },
];

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

if (failed > 0) {
  console.error(`\nFAILED: ${failed}`);
  process.exit(1);
}

console.log(`\nALL OK: ${cases.length}`);
