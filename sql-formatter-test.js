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
