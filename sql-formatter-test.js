'use strict';

const { formatSql } = require('./sql-formatter');

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Format a number with padding for alignment
 */
function padNumber(num, width = 3) {
  return String(num).padStart(width);
}

/**
 * Show diff between expected and actual output
 */
function showDiff(expected, actual) {
  const expLines = expected.trim().split('\n');
  const actLines = actual.trim().split('\n');
  const maxLines = Math.max(expLines.length, actLines.length);

  console.error('    Expected vs Actual:');
  for (let i = 0; i < maxLines; i++) {
    const exp = (expLines[i] || '(missing)').padEnd(50);
    const act = actLines[i] || '(missing)';
    const marker = exp.trim() === act.trim() ? '  ' : '>>>';
    console.error(`    ${marker} ${exp} | ${act}`);
  }
}

/**
 * Run a single test case
 */
function runTest(testCase) {
  try {
    const out = formatSql(testCase.sql);
    let ok = true;
    let failReason = '';

    if (testCase.expect !== undefined) {
      ok = out.trim() === testCase.expect.trim();
      failReason = 'output mismatch';
    } else if (testCase.expectIncludes) {
      ok = testCase.expectIncludes.every((frag) => out.includes(frag));
      failReason = 'missing expected fragments';
    }

    if (!ok) {
      return {
        passed: false,
        error: failReason,
        actual: out,
        expected: testCase.expect || null,
      };
    }

    return { passed: true };
  } catch (err) {
    return {
      passed: false,
      error: `exception: ${err.message}`,
      actual: null,
    };
  }
}

/**
 * Run a group of tests
 */
function runTestGroup(groupName, tests) {
  console.log(`\n${groupName}`);
  console.log('-'.repeat(70));

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of tests) {
    const result = runTest(testCase);
    if (result.passed) {
      passed++;
      console.log(`  ✓ ${testCase.name}`);
    } else {
      failed++;
      const desc = testCase.description ? ` - ${testCase.description}` : '';
      console.error(`  ✗ ${testCase.name}${desc}`);
      console.error(`    Error: ${result.error}`);
      if (result.expected && result.actual) {
        showDiff(result.expected, result.actual);
      }
      failures.push({
        name: testCase.name,
        reason: result.error,
      });
    }
  }

  const total = passed + failed;
  const status = failed === 0 ? '✓' : '✗';
  console.log(
    `${status} ${groupName}: ${padNumber(passed)}/${padNumber(total)} passed`
  );

  return { total, passed, failed, failures };
}

// ============================================================================
// TEST CASES - BASIC DML
// ============================================================================

const basicSelectTests = [
  {
    name: 'basic-select',
    category: 'basic-select',
    description: 'Simple SELECT with single column',
    sql: 'SELECT a FROM t',
    expect: `SELECT
    a
FROM
    t`,
  },
  {
    name: 'select-where',
    category: 'basic-select',
    description: 'SELECT with WHERE clause',
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
    category: 'basic-select',
    description: 'SELECT with line comment',
    sql: "SELECT -- keep comment\n  a\nFROM t",
    expectIncludes: ['SELECT -- keep comment'],
  },
  {
    name: 'select-group-by',
    category: 'basic-select',
    description: 'SELECT with GROUP BY',
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
    category: 'basic-select',
    description: 'SELECT with COUNT(*) aggregate',
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
    category: 'basic-select',
    description: 'SELECT with ORDER BY',
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
];

// ============================================================================
// TEST CASES - INSERT/UPDATE/DELETE
// ============================================================================

const dmlTests = [
  {
    name: 'insert-values',
    category: 'dml',
    description: 'INSERT with VALUES',
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
    category: 'dml',
    description: 'INSERT with NULL value',
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
    category: 'dml',
    description: 'INSERT with boolean/special literals',
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
    category: 'dml',
    description: 'INSERT with DATE/TIME/TIMESTAMP literals',
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
    name: 'update-set-where',
    category: 'dml',
    description: 'UPDATE with SET and WHERE',
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
    category: 'dml',
    description: 'DELETE with WHERE',
    sql: 'DELETE FROM t WHERE a = 1',
    expect: `DELETE
FROM
    t
WHERE
    a = 1`,
  },
];

// ============================================================================
// TEST CASES - JOINS
// ============================================================================

const joinTests = [
  {
    name: 'select-inner-join',
    category: 'joins',
    description: 'INNER JOIN with ON condition',
    sql: 'SELECT t.id, u.name FROM table_a t INNER JOIN table_b u ON t.id = u.table_a_id',
    expect: `SELECT
    t.id
    , u.name
FROM
    table_a t
    INNER JOIN table_b u
        ON t.id = u.table_a_id`,
  },
  {
    name: 'select-left-join',
    category: 'joins',
    description: 'LEFT JOIN with ON condition',
    sql: 'SELECT a.id, b.name FROM a LEFT JOIN b ON a.id = b.a_id',
    expect: `SELECT
    a.id
    , b.name
FROM
    a
    LEFT JOIN b
        ON a.id = b.a_id`,
  },
  {
    name: 'select-join-using',
    category: 'joins',
    description: 'JOIN with USING clause',
    sql: 'SELECT a.id, b.name FROM a JOIN b USING (id)',
    expect: `SELECT
    a.id
    , b.name
FROM
    a
    JOIN b
        USING (id)`,
  },
  {
    name: 'select-multiple-joins',
    category: 'joins',
    description: 'Multiple JOINs (three tables)',
    sql: 'SELECT a.id, b.name, c.value FROM a LEFT JOIN b ON a.id = b.a_id INNER JOIN c ON b.id = c.b_id',
    expect: `SELECT
    a.id
    , b.name
    , c.value
FROM
    a
    LEFT JOIN b
        ON a.id = b.a_id
    INNER JOIN c
        ON b.id = c.b_id`,
  },
  {
    name: 'select-self-join',
    category: 'joins',
    description: 'Self-join with aliases',
    sql: 'SELECT e.name, m.name FROM employee e JOIN employee m ON e.manager_id = m.id',
    expect: `SELECT
    e.name
    , m.name
FROM
    employee e
    JOIN employee m
        ON e.manager_id = m.id`,
  },
  {
    name: 'select-cross-join',
    category: 'joins',
    description: 'CROSS JOIN',
    sql: 'SELECT a.id, b.id FROM a CROSS JOIN b',
    expect: `SELECT
    a.id
    , b.id
FROM
    a
    CROSS JOIN b`,
  },
  {
    name: 'select-right-join',
    category: 'joins',
    description: 'RIGHT JOIN',
    sql: 'SELECT a.id, b.name FROM a RIGHT JOIN b ON a.id = b.a_id',
    expect: `SELECT
    a.id
    , b.name
FROM
    a
    RIGHT JOIN b
        ON a.id = b.a_id`,
  },
  {
    name: 'select-full-join',
    category: 'joins',
    description: 'FULL OUTER JOIN',
    sql: 'SELECT a.id, b.name FROM a FULL JOIN b ON a.id = b.a_id',
    expect: `SELECT
    a.id
    , b.name
FROM
    a
    FULL JOIN b
        ON a.id = b.a_id`,
  },
];

// ============================================================================
// TEST CASES - SUBQUERIES
// ============================================================================

const subqueryTests = [
  {
    name: 'subquery-in-from',
    category: 'subqueries',
    description: 'Subquery in FROM clause',
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
    name: 'subquery-in-where-in',
    category: 'subqueries',
    description: 'Subquery in WHERE with IN',
    sql: 'SELECT name FROM users WHERE id IN (SELECT user_id FROM active_sessions)',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'IN'],
  },
  {
    name: 'subquery-multiple-from',
    category: 'subqueries',
    description: 'Multiple subqueries in FROM',
    sql: 'SELECT a.id, b.name FROM (SELECT id FROM users) a, (SELECT name FROM roles) b',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'nested-subquery-3-levels',
    category: 'subqueries',
    description: 'Three-level nested subqueries',
    sql: 'SELECT * FROM (SELECT * FROM (SELECT * FROM t) AS t2) AS t1',
    expect: `SELECT
    *
FROM
    (
        SELECT
            *
        FROM
            (
                SELECT
                    *
                FROM
                    t
            ) t2
    ) t1`,
  },
  {
    name: 'nested-in-subquery-two-levels',
    category: 'subqueries',
    description: 'Nested IN subqueries with two levels',
    sql: 'SELECT id FROM t1 WHERE id IN (SELECT id FROM t2 WHERE id IN (SELECT id FROM t3))',
    expect: `SELECT
    id
FROM
    t1
WHERE
    id IN (
        SELECT
            id
        FROM
            t2
        WHERE
            id IN (
                SELECT
                    id
                FROM
                    t3
            )
    )`,
  },
  {
    name: 'where-with-and-or-in-subquery',
    category: 'subqueries',
    description: 'Complex WHERE with AND/OR and IN subquery',
    sql: 'SELECT id FROM orders WHERE status = 1 AND id IN (SELECT order_id FROM shipped) AND total > 100',
    expect: `SELECT
    id
FROM
    orders
WHERE
    status = 1
    AND
        id IN (
        SELECT
            order_id
        FROM
            shipped
    )
    AND
        total > 100`,
  },
];

// ============================================================================
// TEST CASES - AGGREGATION
// ============================================================================

const aggregationTests = [
  {
    name: 'select-group-by-having',
    category: 'aggregation',
    description: 'GROUP BY with HAVING (partial support)',
    sql: 'SELECT dept, COUNT(*) FROM employee GROUP BY dept HAVING COUNT(*) > 5',
    expectedBehavior: 'partial',
    expectIncludes: ['SELECT', 'FROM', 'GROUP BY', 'HAVING'],
  },
  {
    name: 'select-multiple-aggregates',
    category: 'aggregation',
    description: 'Multiple aggregate functions (partial support)',
    sql: 'SELECT id, SUM(amount), AVG(amount), COUNT(*) FROM sales GROUP BY id',
    expectedBehavior: 'partial',
    expectIncludes: ['SELECT', 'FROM', 'GROUP BY', 'SUM', 'AVG', 'COUNT'],
  },
  {
    name: 'select-count-distinct-col',
    category: 'aggregation',
    description: 'COUNT with DISTINCT (partial support)',
    sql: 'SELECT COUNT(DISTINCT user_id) FROM orders',
    expectedBehavior: 'partial',
    expectIncludes: ['SELECT', 'COUNT', 'DISTINCT', 'FROM'],
  },
  {
    name: 'multiple-aggregates-with-distinct',
    category: 'aggregation',
    description: 'Multiple aggregate functions with DISTINCT and GROUP BY',
    sql: 'SELECT user_id, COUNT(DISTINCT order_id), SUM(amount), AVG(amount) FROM sales GROUP BY user_id',
    expect: `SELECT
    user_id
    , COUNT(DISTINCT order_id)
    , SUM(amount)
    , AVG(amount)
FROM
    sales
GROUP BY
    user_id`,
  },
];

// ============================================================================
// TEST CASES - ORDER BY & LIMIT
// ============================================================================

const orderByLimitTests = [
  {
    name: 'select-order-by-asc',
    category: 'order-by-limit',
    description: 'ORDER BY with explicit ASC',
    sql: 'SELECT id, name FROM users ORDER BY name ASC',
    expect: `SELECT
    id
    , name
FROM
    users
ORDER BY
    name ASC`,
  },
  {
    name: 'select-order-by-multiple',
    category: 'order-by-limit',
    description: 'ORDER BY with multiple columns mixed ASC/DESC',
    sql: 'SELECT id, name, age FROM users ORDER BY age DESC, name ASC, id',
    expect: `SELECT
    id
    , name
    , age
FROM
    users
ORDER BY
    age DESC
    , name ASC
    , id`,
  },
  {
    name: 'select-limit',
    category: 'order-by-limit',
    description: 'SELECT with LIMIT',
    sql: 'SELECT id, name FROM users LIMIT 10',
    expectIncludes: ['SELECT', 'FROM', 'LIMIT'],
  },
  {
    name: 'select-limit-offset',
    category: 'order-by-limit',
    description: 'SELECT with LIMIT and OFFSET',
    sql: 'SELECT id, name FROM users ORDER BY id LIMIT 20 OFFSET 10',
    expectIncludes: ['SELECT', 'FROM', 'ORDER BY', 'LIMIT', 'OFFSET'],
  },
  {
    name: 'select-fetch-first',
    category: 'order-by-limit',
    description: 'FETCH FIRST syntax',
    sql: 'SELECT id, name FROM users ORDER BY id FETCH FIRST 5 ROWS ONLY',
    expectIncludes: ['SELECT', 'FROM', 'ORDER BY', 'FETCH', 'FIRST', 'ROWS', 'ONLY'],
  },
];

// ============================================================================
// TEST CASES - EDGE CASES
// ============================================================================

const edgeCaseTests = [
  {
    name: 'edge-case-string-with-quotes',
    category: 'edge-cases',
    description: 'String literal with single quotes',
    sql: "SELECT 'O''Brien' FROM t",
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'edge-case-unicode-identifiers',
    category: 'edge-cases',
    description: 'Unicode identifiers (Japanese)',
    sql: 'SELECT 名前, 年齢 FROM ユーザー WHERE 年齢 > 20',
    expect: `SELECT
    名前
    , 年齢
FROM
    ユーザー
WHERE
    年齢 > 20`,
  },
  {
    name: 'edge-case-many-columns',
    category: 'edge-cases',
    description: 'SELECT with many columns (10+)',
    sql: 'SELECT c1, c2, c3, c4, c5, c6, c7, c8, c9, c10 FROM t',
    expect: `SELECT
    c1
    , c2
    , c3
    , c4
    , c5
    , c6
    , c7
    , c8
    , c9
    , c10
FROM
    t`,
  },
  {
    name: 'edge-case-negative-numbers',
    category: 'edge-cases',
    description: 'Negative numeric literals',
    sql: 'SELECT a FROM t WHERE b > -10 AND c < -5.5',
    expectIncludes: ['SELECT', 'FROM', 'WHERE'],
  },
  {
    name: 'edge-case-match-recognize',
    category: 'edge-cases',
    description: 'MATCH_RECOGNIZE clause (passthrough)',
    sql: 'SELECT * FROM t MATCH_RECOGNIZE (PATTERN (A B) DEFINE A AS a > 0, B AS b > 0)',
    expect: `SELECT
    *
FROM
    t
MATCH_RECOGNIZE (PATTERN (A B) DEFINE A AS a > 0, B AS b > 0)`,
  },
  {
    name: 'edge-case-deeply-nested-parens',
    category: 'edge-cases',
    description: 'Deeply nested parenthesized expressions',
    sql: 'SELECT (((a + b) * c) - d) FROM t',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'edge-case-empty-string',
    category: 'edge-cases',
    description: 'Empty string literal',
    sql: "SELECT '' as empty_col FROM t",
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'edge-case-very-long-where',
    category: 'edge-cases',
    description: 'WHERE clause with many AND conditions',
    sql: 'SELECT id FROM t WHERE a = 1 AND b = 2 AND c = 3 AND d = 4 AND e = 5 AND f = 6',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'AND'],
  },
  {
    name: 'edge-case-mixed-case-keywords',
    category: 'edge-cases',
    description: 'Mixed case keywords (passthrough)',
    sql: 'SeLeCt id FrOm users WhErE active = 1',
    expectIncludes: ['id', 'users', 'active'],
  },
  {
    name: 'edge-case-reserved-word-identifier',
    category: 'edge-cases',
    description: 'Reserved word as identifier',
    sql: 'SELECT date, time FROM order_table',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'edge-case-numeric-literals-types',
    category: 'edge-cases',
    description: 'Various numeric literal types',
    sql: 'SELECT 123, -456, 78.90, 1.23e5, 0.5e-2 FROM t',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'edge-case-timestamp-literals',
    category: 'edge-cases',
    description: 'TIMESTAMP and other datetime literals',
    sql: "SELECT TIMESTAMP '2024-01-15 10:30:45', DATE '2024-01-15', TIME '10:30:45' FROM events",
    expectIncludes: ['SELECT', 'FROM', 'TIMESTAMP', 'DATE', 'TIME'],
  },
];

// ============================================================================
// TEST CASES - COMPLEX QUERIES
// ============================================================================

const complexTests = [
  {
    name: 'complex-join-with-subquery',
    category: 'complex',
    description: 'Complex query with JOIN and subquery',
    sql: 'SELECT u.id, u.name, COUNT(o.id) FROM users u LEFT JOIN (SELECT user_id FROM orders WHERE status = "complete") o ON u.id = o.user_id GROUP BY u.id, u.name',
    expectIncludes: ['SELECT', 'FROM', 'GROUP BY', 'LEFT JOIN'],
  },
  {
    name: 'complex-three-way-join-with-where',
    category: 'complex',
    description: 'Three-way JOIN with WHERE and ORDER BY',
    sql: 'SELECT u.id, u.name, o.order_id, p.product_name FROM users u LEFT JOIN orders o ON u.id = o.user_id LEFT JOIN products p ON o.product_id = p.id WHERE u.active = 1 ORDER BY o.order_date DESC',
    expectIncludes: ['SELECT', 'FROM', 'LEFT JOIN', 'WHERE', 'ORDER BY'],
  },
  {
    name: 'complex-nested-subqueries-joins',
    category: 'complex',
    description: 'Nested subqueries with JOINs',
    sql: 'SELECT a.id, a.value FROM (SELECT id, value FROM table1 WHERE status = 1) a LEFT JOIN (SELECT id, ref_id FROM table2) b ON a.id = b.ref_id',
    expectIncludes: ['SELECT', 'FROM', 'LEFT JOIN'],
  },
  {
    name: 'complex-insert-select',
    category: 'complex',
    description: 'INSERT with SELECT source',
    sql: 'INSERT INTO archive (id, name, date) SELECT id, name, created_at FROM users WHERE active = 0',
    expectIncludes: ['INSERT', 'INTO', 'SELECT', 'FROM', 'WHERE'],
  },
  {
    name: 'complex-update-with-subquery',
    category: 'complex',
    description: 'UPDATE with subquery in SET clause',
    sql: 'UPDATE users SET status = (SELECT status FROM default_settings LIMIT 1) WHERE last_login < DATE_ADD(NOW(), INTERVAL -30 DAY)',
    expectIncludes: ['UPDATE', 'SET', 'SELECT', 'WHERE'],
  },
  {
    name: 'complex-delete-with-subquery',
    category: 'complex',
    description: 'DELETE with subquery in WHERE',
    sql: 'DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE country_code NOT IN ("US", "CA", "MX"))',
    expectedBehavior: 'passthrough',
    expectIncludes: ['DELETE', 'FROM', 'WHERE', 'IN', 'SELECT'],
  },
  {
    name: 'complex-realistic-analytics-query',
    category: 'complex',
    description: 'Realistic analytics query with multiple JOINs and aggregation',
    sql: 'SELECT u.user_id, u.email, COUNT(DISTINCT o.order_id) as total_orders, SUM(oi.quantity) as total_items FROM users u LEFT JOIN orders o ON u.user_id = o.user_id LEFT JOIN order_items oi ON o.order_id = oi.order_id WHERE u.created_at >= DATE("2024-01-01") GROUP BY u.user_id, u.email HAVING COUNT(DISTINCT o.order_id) > 0 ORDER BY total_items DESC',
    expectIncludes: ['SELECT', 'FROM', 'LEFT JOIN', 'WHERE', 'GROUP BY', 'ORDER BY'],
  },
];

// ============================================================================
// TEST CASES - DML EXTENSIONS
// ============================================================================

const dmlExtensionTests = [
  {
    name: 'insert-multiple-rows',
    category: 'dml-extension',
    description: 'INSERT with multiple VALUES rows',
    sql: 'INSERT INTO users(id, name) VALUES (1, "Alice"), (2, "Bob"), (3, "Charlie")',
    expectIncludes: ['INSERT', 'INTO', 'VALUES'],
  },
  {
    name: 'insert-with-select-simple',
    category: 'dml-extension',
    description: 'INSERT with SELECT source (simple)',
    sql: 'INSERT INTO archive SELECT id, name FROM users WHERE archived = 1',
    expectIncludes: ['INSERT', 'SELECT', 'FROM', 'WHERE'],
  },
  {
    name: 'update-multiple-columns',
    category: 'dml-extension',
    description: 'UPDATE with many column assignments',
    sql: 'UPDATE employees SET salary = 5000, bonus = 500, status = "active", department = "eng" WHERE emp_id = 100',
    expectIncludes: ['UPDATE', 'SET', 'WHERE'],
  },
  {
    name: 'delete-complex-where',
    category: 'dml-extension',
    description: 'DELETE with complex WHERE conditions',
    sql: 'DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) AND level = "DEBUG" AND processed = 0',
    expectIncludes: ['DELETE', 'FROM', 'WHERE'],
  },
  {
    name: 'merge-statement',
    category: 'dml-extension',
    description: 'MERGE statement (if supported)',
    sql: 'MERGE INTO target t USING source s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.value = s.value WHEN NOT MATCHED THEN INSERT (id, value) VALUES (s.id, s.value)',
    expectedBehavior: 'passthrough',
    expectIncludes: ['MERGE', 'INTO', 'USING', 'ON', 'MATCHED'],
  },
];

// ============================================================================
// TEST CASES - DDL STATEMENTS
// ============================================================================

const ddlTests = [
  // DROP TABLE
  {
    name: 'ddl-drop-table-simple',
    category: 'ddl',
    description: 'DROP TABLE simple',
    sql: 'DROP TABLE users',
    expect: 'DROP TABLE users',
  },
  {
    name: 'ddl-drop-table-if-exists-cascade',
    category: 'ddl',
    description: 'DROP TABLE with IF EXISTS and CASCADE',
    sql: 'DROP TABLE IF EXISTS orders CASCADE',
    expect: 'DROP TABLE IF EXISTS orders CASCADE',
  },

  // CREATE TABLE
  {
    name: 'ddl-create-table-simple',
    category: 'ddl',
    description: 'CREATE TABLE with basic columns',
    sql: 'CREATE TABLE users (id INT, name VARCHAR(100))',
    expect: `CREATE TABLE users
    (
        id INT
        , name VARCHAR (100)
    )`,
  },
  {
    name: 'ddl-create-table-if-not-exists',
    category: 'ddl',
    description: 'CREATE TABLE IF NOT EXISTS',
    sql: 'CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY)',
    expect: `CREATE TABLE IF NOT EXISTS users
    (
        id INT PRIMARY KEY
    )`,
  },
  {
    name: 'ddl-create-temp-table',
    category: 'ddl',
    description: 'CREATE TEMPORARY TABLE',
    sql: 'CREATE TEMPORARY TABLE session_data (session_id VARCHAR(255))',
    expect: `CREATE TEMPORARY TABLE session_data
    (
        session_id VARCHAR (255)
    )`,
  },

  // CREATE INDEX
  {
    name: 'ddl-create-index',
    category: 'ddl',
    description: 'CREATE INDEX',
    sql: 'CREATE INDEX idx_name ON users (name)',
    expect: `CREATE INDEX idx_name
ON users
    (
        name
    )`,
  },
  {
    name: 'ddl-create-unique-index',
    category: 'ddl',
    description: 'CREATE UNIQUE INDEX',
    sql: 'CREATE UNIQUE INDEX idx_email ON users (email)',
    expect: `CREATE UNIQUE INDEX idx_email
ON users
    (
        email
    )`,
  },
  {
    name: 'ddl-create-index-multi-column',
    category: 'ddl',
    description: 'CREATE INDEX with multiple columns',
    sql: 'CREATE INDEX idx_name_email ON users (last_name, email)',
    expect: `CREATE INDEX idx_name_email
ON users
    (
        last_name
        , email
    )`,
  },

  // ALTER TABLE
  {
    name: 'ddl-alter-table-add-column',
    category: 'ddl',
    description: 'ALTER TABLE ADD COLUMN',
    sql: 'ALTER TABLE users ADD COLUMN age INT',
    expect: `ALTER TABLE users
    ADD COLUMN age INT`,
  },

  // TRUNCATE TABLE
  {
    name: 'ddl-truncate-table',
    category: 'ddl',
    description: 'TRUNCATE TABLE',
    sql: 'TRUNCATE TABLE logs',
    expect: 'TRUNCATE TABLE logs',
  },

  // CREATE VIEW
  {
    name: 'ddl-create-view',
    category: 'ddl',
    description: 'CREATE VIEW',
    sql: 'CREATE VIEW active_users AS SELECT * FROM users WHERE active = 1',
    expect: `CREATE VIEW active_users
AS
    SELECT * FROM users WHERE active = 1`,
  },

  // Edge case
  {
    name: 'ddl-complex-constraints',
    category: 'ddl',
    description: 'Complex table with constraints',
    sql: 'CREATE TABLE orders (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT NOT NULL)',
    expectIncludes: ['CREATE', 'TABLE', 'orders'],
  },
];

// ============================================================================
// TEST CASES - INDENTATION VALIDATION (Selected Critical Patterns)
// ============================================================================

const indentationTests = [
  {
    name: 'indent-join-on-two-levels',
    category: 'indentation',
    description: 'JOIN ON condition indentation (2 levels: base + 1)',
    sql: 'SELECT a.id FROM a JOIN b ON a.id = b.id',
    expect: `SELECT
    a.id
FROM
    a
    JOIN b
        ON a.id = b.id`,
  },
  {
    name: 'indent-insert-values-deep-nesting',
    category: 'indentation',
    description: 'INSERT VALUES deep nesting (columns: 1 level, values: 2 levels)',
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
    name: 'indent-subquery-one-level',
    category: 'indentation',
    description: 'Subquery in FROM indentation (1 level inside parentheses)',
    sql: 'SELECT u.id FROM (SELECT id FROM users) u',
    expect: `SELECT
    u.id
FROM
    (
        SELECT
            id
        FROM
            users
    ) u`,
  },
  {
    name: 'indent-nested-subquery-three-levels',
    category: 'indentation',
    description: 'Nested subquery indentation consistency (3 levels deep)',
    sql: 'SELECT * FROM (SELECT * FROM (SELECT * FROM t) t2) t1',
    expect: `SELECT
    *
FROM
    (
        SELECT
            *
        FROM
            (
                SELECT
                    *
                FROM
                    t
            ) t2
    ) t1`,
  },
  {
    name: 'indent-multiple-joins-consistent',
    category: 'indentation',
    description: 'Multiple JOINs indentation consistency',
    sql: 'SELECT a.id, b.id, c.id FROM a JOIN b ON a.id = b.id JOIN c ON b.id = c.id',
    expect: `SELECT
    a.id
    , b.id
    , c.id
FROM
    a
    JOIN b
        ON a.id = b.id
    JOIN c
        ON b.id = c.id`,
  },
  {
    name: 'indent-comma-position-select-items',
    category: 'indentation',
    description: 'Comma position in SELECT items (leading comma + 1 level indent)',
    sql: 'SELECT col1, col2, col3, col4 FROM t',
    expect: `SELECT
    col1
    , col2
    , col3
    , col4
FROM
    t`,
  },
];

// ============================================================================
// TEST CASES - WHERE CLAUSE PATTERNS (Complex Conditions)
// ============================================================================

const whereClauseTests = [
  {
    name: 'where-and-or-mixed',
    category: 'where-clause',
    description: 'WHERE with AND/OR mixed conditions',
    sql: 'SELECT id FROM users WHERE (age > 18 AND status = "active") OR country = "JP"',
    expectIncludes: ['SELECT', 'FROM', 'WHERE'],
  },
  {
    name: 'where-in-list',
    category: 'where-clause',
    description: 'WHERE with IN clause (list)',
    sql: 'SELECT id, name FROM users WHERE status IN ("active", "pending", "approved")',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'IN'],
  },
  {
    name: 'where-not-in',
    category: 'where-clause',
    description: 'WHERE with NOT IN clause',
    sql: 'SELECT id FROM orders WHERE user_id NOT IN (10, 20, 30, 40)',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'NOT'],
  },
  {
    name: 'where-between',
    category: 'where-clause',
    description: 'WHERE with BETWEEN operator',
    sql: 'SELECT id, amount FROM transactions WHERE amount BETWEEN 100 AND 1000',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'BETWEEN'],
  },
  {
    name: 'where-like',
    category: 'where-clause',
    description: 'WHERE with LIKE pattern',
    sql: "SELECT id, email FROM users WHERE email LIKE '%@example.com'",
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'LIKE'],
  },
  {
    name: 'where-is-null',
    category: 'where-clause',
    description: 'WHERE with IS NULL condition',
    sql: 'SELECT id, name FROM users WHERE deleted_at IS NULL',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'NULL'],
  },
  {
    name: 'where-is-not-null',
    category: 'where-clause',
    description: 'WHERE with IS NOT NULL condition',
    sql: 'SELECT id FROM logs WHERE error_message IS NOT NULL',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'NOT', 'NULL'],
  },
  {
    name: 'where-complex-parentheses',
    category: 'where-clause',
    description: 'WHERE with complex parenthesized conditions',
    sql: 'SELECT * FROM orders WHERE (status = "complete" AND amount > 100) OR (status = "pending" AND created_at > NOW())',
    expectIncludes: ['SELECT', 'FROM', 'WHERE'],
  },
];

// ============================================================================
// TEST CASES - FUNCTIONS (Aggregate & Scalar)
// ============================================================================

const functionTests = [
  {
    name: 'func-max-aggregate',
    category: 'functions',
    description: 'MAX aggregate function',
    sql: 'SELECT MAX(salary) FROM employees',
    expectIncludes: ['SELECT', 'MAX', 'FROM'],
  },
  {
    name: 'func-min-aggregate',
    category: 'functions',
    description: 'MIN aggregate function',
    sql: 'SELECT MIN(price) FROM products',
    expectIncludes: ['SELECT', 'MIN', 'FROM'],
  },
  {
    name: 'func-avg-aggregate',
    category: 'functions',
    description: 'AVG aggregate function',
    sql: 'SELECT AVG(rating) FROM reviews',
    expectIncludes: ['SELECT', 'AVG', 'FROM'],
  },
  {
    name: 'func-sum-aggregate',
    category: 'functions',
    description: 'SUM aggregate function',
    sql: 'SELECT SUM(quantity) FROM order_items',
    expectIncludes: ['SELECT', 'SUM', 'FROM'],
  },
  {
    name: 'func-multiple-aggregates-group',
    category: 'functions',
    description: 'Multiple aggregate functions with GROUP BY',
    sql: 'SELECT category, COUNT(*), SUM(amount), AVG(price) FROM products GROUP BY category',
    expectIncludes: ['SELECT', 'COUNT', 'SUM', 'AVG', 'FROM', 'GROUP BY'],
  },
  {
    name: 'func-upper-scalar',
    category: 'functions',
    description: 'UPPER scalar function',
    sql: 'SELECT UPPER(name) FROM users',
    expectIncludes: ['SELECT', 'UPPER', 'FROM'],
  },
  {
    name: 'func-lower-scalar',
    category: 'functions',
    description: 'LOWER scalar function',
    sql: 'SELECT LOWER(email) FROM contacts',
    expectIncludes: ['SELECT', 'LOWER', 'FROM'],
  },
  {
    name: 'func-substring',
    category: 'functions',
    description: 'SUBSTRING/SUBSTR function',
    sql: 'SELECT SUBSTR(phone_number, 1, 3) FROM customers',
    expectIncludes: ['SELECT', 'SUBSTR', 'FROM'],
  },
];

// ============================================================================
// TEST CASES - DISTINCT KEYWORD
// ============================================================================

const distinctTests = [
  {
    name: 'select-distinct',
    category: 'distinct',
    description: 'SELECT DISTINCT single column',
    sql: 'SELECT DISTINCT country FROM users',
    expectIncludes: ['SELECT', 'DISTINCT', 'FROM'],
  },
  {
    name: 'select-distinct-multiple',
    category: 'distinct',
    description: 'SELECT DISTINCT multiple columns',
    sql: 'SELECT DISTINCT category, subcategory FROM products',
    expectIncludes: ['SELECT', 'DISTINCT', 'FROM'],
  },
  {
    name: 'select-distinct-with-order',
    category: 'distinct',
    description: 'SELECT DISTINCT with ORDER BY',
    sql: 'SELECT DISTINCT country FROM users ORDER BY country',
    expectIncludes: ['SELECT', 'DISTINCT', 'FROM', 'ORDER BY'],
  },
];

// ============================================================================
// TEST CASES - ALIASES (Column & Table)
// ============================================================================

const aliasTests = [
  {
    name: 'alias-column-with-as',
    category: 'aliases',
    description: 'Column alias with AS keyword',
    sql: 'SELECT id AS user_id, name AS full_name FROM users',
    expectIncludes: ['SELECT', 'AS', 'FROM'],
  },
  {
    name: 'alias-column-without-as',
    category: 'aliases',
    description: 'Column alias without AS keyword',
    sql: 'SELECT id user_id, name full_name FROM users',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'alias-table-with-as',
    category: 'aliases',
    description: 'Table alias with AS keyword',
    sql: 'SELECT u.id, u.name FROM users AS u',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'alias-table-without-as',
    category: 'aliases',
    description: 'Table alias without AS keyword',
    sql: 'SELECT u.id, u.name FROM users u',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'alias-multiple-combined',
    category: 'aliases',
    description: 'Multiple aliases combined',
    sql: 'SELECT u.id AS user_id, u.name AS full_name, o.total AS order_total FROM users u LEFT JOIN orders o ON u.id = o.user_id',
    expectIncludes: ['SELECT', 'AS', 'FROM', 'LEFT JOIN'],
  },
];

// ============================================================================
// TEST CASES - COMBINED WHERE + GROUP BY + HAVING
// ============================================================================

const combinedTests = [
  {
    name: 'combined-where-group-having',
    category: 'combined-clauses',
    description: 'Combined WHERE, GROUP BY, and HAVING',
    sql: 'SELECT category, COUNT(*) as count FROM products WHERE price > 50 GROUP BY category HAVING COUNT(*) > 3',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING'],
  },
  {
    name: 'combined-where-group-having-order',
    category: 'combined-clauses',
    description: 'WHERE, GROUP BY, HAVING, and ORDER BY combined',
    sql: 'SELECT dept, SUM(salary) as total_salary FROM employees WHERE active = 1 GROUP BY dept HAVING SUM(salary) > 100000 ORDER BY total_salary DESC',
    expectIncludes: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'],
  },
  {
    name: 'combined-multiple-aggregate-conditions',
    category: 'combined-clauses',
    description: 'Multiple aggregate functions with WHERE and HAVING',
    sql: 'SELECT category, COUNT(*), AVG(price), MAX(price) FROM products WHERE active = 1 GROUP BY category HAVING AVG(price) > 100',
    expectIncludes: ['SELECT', 'COUNT', 'AVG', 'MAX', 'FROM', 'WHERE', 'GROUP BY', 'HAVING'],
  },
  {
    name: 'combined-join-where-group',
    category: 'combined-clauses',
    description: 'JOIN with WHERE and GROUP BY',
    sql: 'SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = "active" GROUP BY u.id, u.name',
    expectIncludes: ['SELECT', 'FROM', 'LEFT JOIN', 'WHERE', 'GROUP BY'],
  },
];

// ============================================================================
// TEST CASES - SCALAR SUBQUERIES
// ============================================================================

const scalarSubqueryTests = [
  {
    name: 'scalar-subquery-select-list',
    category: 'scalar-subqueries',
    description: 'Scalar subquery in SELECT list',
    sql: 'SELECT name, (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count FROM users',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'scalar-subquery-where',
    category: 'scalar-subqueries',
    description: 'Scalar subquery in WHERE clause',
    sql: 'SELECT id FROM users WHERE age > (SELECT AVG(age) FROM users)',
    expectIncludes: ['SELECT', 'FROM', 'WHERE'],
  },
  {
    name: 'scalar-subquery-set-value',
    category: 'scalar-subqueries',
    description: 'Scalar subquery in SET clause (UPDATE)',
    sql: 'UPDATE users SET last_order_date = (SELECT MAX(created_at) FROM orders WHERE user_id = users.id)',
    expectIncludes: ['UPDATE', 'SET', 'SELECT'],
  },
];

// ============================================================================
// TEST CASES - CASE EXPRESSIONS
// ============================================================================

const caseTests = [
  {
    name: 'case-simple',
    category: 'case-expr',
    description: 'Simple CASE expression',
    sql: 'SELECT id, CASE WHEN status = "active" THEN 1 ELSE 0 END FROM users',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'FROM'],
  },
  {
    name: 'case-multiple-when',
    category: 'case-expr',
    description: 'CASE with multiple WHEN clauses',
    sql: 'SELECT id, CASE WHEN age < 18 THEN "minor" WHEN age < 65 THEN "adult" ELSE "senior" END as age_group FROM users',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'FROM'],
  },
];

// ============================================================================
// TEST CASES - ORDER BY PATTERNS
// ============================================================================

const orderByPatternTests = [
  {
    name: 'order-by-expression',
    category: 'order-by-patterns',
    description: 'ORDER BY with expression',
    sql: 'SELECT id, first_name, last_name FROM users ORDER BY first_name || " " || last_name',
    expectIncludes: ['SELECT', 'FROM', 'ORDER BY'],
  },
  {
    name: 'order-by-column-position',
    category: 'order-by-patterns',
    description: 'ORDER BY with column position',
    sql: 'SELECT id, name, salary FROM employees ORDER BY 3 DESC',
    expectIncludes: ['SELECT', 'FROM', 'ORDER BY'],
  },
  {
    name: 'order-by-alias',
    category: 'order-by-patterns',
    description: 'ORDER BY with column alias',
    sql: 'SELECT id, name AS user_name FROM users ORDER BY user_name',
    expectIncludes: ['SELECT', 'FROM', 'ORDER BY'],
  },
];

// ============================================================================
// TEST CASES - PASSTHROUGH (UNSUPPORTED FEATURES)
// ============================================================================

const passthroughTests = [
  {
    name: 'passthrough-union',
    category: 'passthrough',
    description: 'UNION - partial support (returns original SQL)',
    sql: 'SELECT id, name FROM users UNION SELECT emp_id, emp_name FROM employees',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-union-all',
    category: 'passthrough',
    description: 'UNION ALL - partial support (returns original SQL)',
    sql: 'SELECT id FROM table1 UNION ALL SELECT id FROM table2',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-case-expression',
    category: 'passthrough',
    description: 'CASE expression - partial support',
    sql: 'SELECT id, CASE WHEN status = "active" THEN "Yes" ELSE "No" END as is_active FROM users',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-with-cte',
    category: 'passthrough',
    description: 'WITH clause (CTE) - partial support',
    sql: 'WITH active_users AS (SELECT id, name FROM users WHERE active = 1) SELECT * FROM active_users',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-window-function',
    category: 'passthrough',
    description: 'WINDOW function with OVER clause - partial support',
    sql: 'SELECT id, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank FROM employees',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-intersect',
    category: 'passthrough',
    description: 'INTERSECT - not yet formatted',
    sql: 'SELECT id FROM table1 INTERSECT SELECT id FROM table2',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
  {
    name: 'passthrough-except',
    category: 'passthrough',
    description: 'EXCEPT - not yet formatted',
    sql: 'SELECT id FROM table1 EXCEPT SELECT id FROM table2',
    expectedBehavior: 'passthrough',
    expectIncludes: ['SELECT', 'FROM'],
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

const allTestGroups = [
  { name: 'Basic SELECT', tests: basicSelectTests },
  { name: 'DML (INSERT/UPDATE/DELETE)', tests: dmlTests },
  { name: 'JOINs', tests: joinTests },
  { name: 'Subqueries', tests: subqueryTests },
  { name: 'Aggregation & GROUP BY', tests: aggregationTests },
  { name: 'ORDER BY & LIMIT', tests: orderByLimitTests },
  { name: 'Edge Cases', tests: edgeCaseTests },
  { name: 'Complex Queries', tests: complexTests },
  { name: 'DML Extensions', tests: dmlExtensionTests },
  { name: 'DDL Statements', tests: ddlTests },
  { name: 'Indentation Validation', tests: indentationTests },
  { name: 'WHERE Clause Patterns', tests: whereClauseTests },
  { name: 'Functions (Aggregate & Scalar)', tests: functionTests },
  { name: 'DISTINCT Keyword', tests: distinctTests },
  { name: 'Aliases (Column & Table)', tests: aliasTests },
  { name: 'Combined Clauses', tests: combinedTests },
  { name: 'Scalar Subqueries', tests: scalarSubqueryTests },
  { name: 'CASE Expressions', tests: caseTests },
  { name: 'ORDER BY Patterns', tests: orderByPatternTests },
  { name: 'Passthrough (Unsupported)', tests: passthroughTests },
];

console.log('SQL Formatter Test Suite');
console.log('========================\n');

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const group of allTestGroups) {
  const result = runTestGroup(group.name, group.tests);
  totalTests += result.total;
  totalPassed += result.passed;
  totalFailed += result.failed;
}

console.log('\n' + '='.repeat(70));
console.log('Summary');
console.log('-'.repeat(70));
console.log(`Total:  ${padNumber(totalTests)} tests`);
console.log(`Passed: ${padNumber(totalPassed)}`);
console.log(`Failed: ${padNumber(totalFailed)}`);
console.log('='.repeat(70));

if (totalFailed > 0) {
  console.error('\nFAILED: Some tests did not pass');
  process.exit(1);
}

console.log('\n✓ ALL TESTS PASSED!');
