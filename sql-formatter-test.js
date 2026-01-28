'use strict';

const { formatSql } = require('./sql-formatter');

const cases = [
  {
    name: 'basic-select',
    sql: 'SELECT a FROM t',
    expectIncludes: ['SELECT', 'FROM', 't'],
  },
  {
    name: 'select-where',
    sql: 'SELECT a FROM t WHERE b = 1',
    expectIncludes: ['WHERE', 'b', '1'],
  },
];

let failed = 0;
for (const c of cases) {
  try {
    const out = formatSql(c.sql);
    const ok = c.expectIncludes.every((frag) => out.includes(frag));
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
