'use strict';

const { formatSql } = require('./sql-formatter');

const cases = [
  {
    name: 'basic-select',
    sql: 'SELECT a FROM t',
    expect: `SELECT
    a
FROM
    t`,
  },
  {
    name: 'select-where',
    sql: 'SELECT a FROM t WHERE b = 1',
    expect: `SELECT
    a
FROM
    t
WHERE
    b = 1`,
  },
  {
    name: 'select-line-comment',
    sql: "SELECT -- keep comment\n  a\nFROM t",
    expectIncludes: ['SELECT -- keep comment'],
  },
  {
    name: 'insert-values',
    sql: 'INSERT INTO t(a, b) VALUES (1, 2)',
    expect: `INSERT
INTO
    t
    (
        a
        , b
    )
VALUES
    (
        1
        , 2
    )`,
  },
  {
    name: 'insert-values-null',
    sql: "INSERT INTO employee(id, name, romaji) VALUES (2, '山田', NULL)",
    expect: `INSERT
INTO
    employee
    (
        id
        , name
        , romaji
    )
VALUES
    (
        2
        , '山田'
        , NULL
    )`,
  },
  {
    name: 'insert-values-special-literals',
    sql: "INSERT INTO flags(id, t, f, u) VALUES (1, TRUE, FALSE, UNKNOWN)",
    expect: `INSERT
INTO
    flags
    (
        id
        , t
        , f
        , u
    )
VALUES
    (
        1
        , TRUE
        , FALSE
        , UNKNOWN
    )`,
  },
  {
    name: 'insert-values-datetime-literals',
    sql: "INSERT INTO events(d, t, ts) VALUES (DATE '2024-01-01', TIME '12:34:56', TIMESTAMP '2024-01-01 12:34:56')",
    expect: `INSERT
INTO
    events
    (
        d
        , t
        , ts
    )
VALUES
    (
        DATE '2024-01-01'
        , TIME '12:34:56'
        , TIMESTAMP '2024-01-01 12:34:56'
    )`,
  },
  {
    name: 'select-group-by',
    sql: 'SELECT a, b FROM t GROUP BY a, b',
    expect: `SELECT
    a
    , b
FROM
    t
GROUP BY
    a
    , b`,
  },
  {
    name: 'select-count-star',
    sql: 'SELECT a, COUNT(*) FROM t GROUP BY a',
    expect: `SELECT
    a
    , COUNT(*)
FROM
    t
GROUP BY
    a`,
  },
  {
    name: 'select-order-by',
    sql: 'SELECT a, b FROM t ORDER BY a DESC, b',
    expect: `SELECT
    a
    , b
FROM
    t
ORDER BY
    a DESC
    , b`,
  },
  {
    name: 'nested-subquery',
    sql: 'SELECT u.name FROM (SELECT id, name FROM users WHERE active = 1) AS u',
    expect: `SELECT
    u.name
FROM
    (
        SELECT
            id
            , name
        FROM
            users
        WHERE
            active = 1
    ) u`,
  },
  {
    name: 'select-match-recognize-raw',
    sql: 'SELECT * FROM t MATCH_RECOGNIZE (PATTERN (A B) DEFINE A AS a > 0, B AS b > 0)',
    expect: `SELECT
    *
FROM
    t
MATCH_RECOGNIZE (PATTERN (A B) DEFINE A AS a > 0, B AS b > 0)`,
  },
  {
    name: 'update-set-where',
    sql: 'UPDATE t SET a = 1, b = 2 WHERE c = 3',
    expect: `UPDATE
    t
SET
    a = 1
    , b = 2
WHERE
    c = 3`,
  },
  {
    name: 'delete-where',
    sql: 'DELETE FROM t WHERE a = 1',
    expect: `DELETE
FROM
    t
WHERE
    a = 1`,
  },
];

let failed = 0;
for (const c of cases) {
  try {
    const out = formatSql(c.sql);
    let ok = true;
    if (c.expect !== undefined) {
      ok = out.trim() === c.expect.trim();
    } else if (c.expectIncludes) {
      ok = c.expectIncludes.every((frag) => out.includes(frag));
    }
    if (!ok) {
      failed++;
      console.error(`NG  ${c.name}: output missing expected fragments`);
      console.error(out);
    } else {
      console.log(`OK  ${c.name}`);
    }
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
