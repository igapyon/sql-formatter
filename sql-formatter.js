'use strict';

const isBrowser = typeof window !== 'undefined';
const CalciteLexerRef = isBrowser ? window.CalciteLexer : require('./spec/apache-calcite-Parser').CalciteLexer;
const CalciteParserRef = isBrowser ? window.CalciteParser : require('./spec/apache-calcite-Parser').CalciteParser;
const WellknownDdlLexerRef = isBrowser ? window.WellknownDdlLexer : require('./spec/wellknown-sql-ddl').WellknownDdlLexer;
const WellknownDdlParserRef = isBrowser ? window.WellknownDdlParser : require('./spec/wellknown-sql-ddl').WellknownDdlParser;

function formatSql(sql) {
  try {
    const lexer = new CalciteLexerRef(sql);
    const tokens = lexer.tokenize();
    const parser = new CalciteParserRef(tokens);
    const ast = parser.SqlStmtList();
    const ctx = { indent: 0, unknown: false, root: null };
    let rendered = renderNode(ast, ctx).trim();
    if (!rendered) return sql;
    if (ctx.unknown) {
      const rawSuffix = extractTopLevelSuffix(sql, tokens);
      if (rawSuffix) {
        return `${rendered}\n${rawSuffix.trimStart()}`.trimEnd();
      }
      return sql;
    }
    const lineComments = collectLineComments(sql, tokens);
    rendered = applyLineComments(rendered, lineComments);
    return rendered;
  } catch (_err) {
    // Calcite parser failed, try DDL parser
    try {
      const ddlLexer = new WellknownDdlLexerRef(sql);
      const ddlTokens = ddlLexer.tokenize();
      const ddlParser = new WellknownDdlParserRef(ddlTokens);
      const ddlAst = ddlParser.SqlStmtList();
      const ctx = { indent: 0, unknown: false, root: null };
      const rendered = renderNode(ddlAst, ctx).trim();
      if (!rendered || ctx.unknown) return sql;
      return rendered;
    } catch (_ddlErr) {
      return sql;  // Both parsers failed
    }
  }
}

function withIndent(ctx, indent) {
  return { ...ctx, indent, root: ctx.root || ctx };
}

function tryFormatQuery(sql) {
  try {
    const lexer = new CalciteLexerRef(sql);
    const tokens = lexer.tokenize();
    const parser = new CalciteParserRef(tokens);
    const ast = parser.SqlStmtList();
    const ctx = { indent: 0, unknown: false, root: null };
    const rendered = renderNode(ast, ctx).trim();
    if (!rendered || ctx.unknown) return null;
    return rendered;
  } catch (_err) {
    return null;
  }
}

function collectLineComments(sql, tokens) {
  const comments = [];
  if (!tokens || tokens.length === 0) return comments;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.type !== 'COMMENT_LINE') continue;
    const lineStart = sql.lastIndexOf('\n', t.start - 1) + 1;
    const before = sql.slice(lineStart, t.start);
    if (!before.trim()) continue; // skip full-line comments
    let j = i - 1;
    while (j >= 0 && tokens[j] && tokens[j].type === 'COMMENT_LINE') j--;
    const prev = tokens[j];
    if (!prev || prev.start == null || prev.end == null) continue;
    const anchorRaw = sql.slice(prev.start, prev.end).trim();
    if (!anchorRaw) continue;
    comments.push({ anchorRaw, text: t.value || '' });
  }
  return comments;
}

function applyLineComments(rendered, comments) {
  if (!comments || comments.length === 0) return rendered;
  const lines = rendered.split('\n');
  for (const c of comments) {
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed === c.anchorRaw) { idx = i; break; }
    }
    if (idx === -1) {
      for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.endsWith(c.anchorRaw)) { idx = i; break; }
      }
    }
    if (idx === -1) continue;
    if (lines[idx].includes('--')) continue;
    lines[idx] = `${lines[idx]} -- ${c.text}`.trimEnd();
  }
  return lines.join('\n');
}

function markUnknown(ctx) {
  const root = ctx && (ctx.root || ctx);
  if (root) root.unknown = true;
}

function renderNode(node, ctx) {
  if (!node) return '';
  switch (node.type) {
    case 'SqlStmtList':
      {
        const lines = [];
        if (node.leadingComments && node.leadingComments.length) {
          node.leadingComments.forEach(c => lines.push(`-- ${c}`));
        }
        lines.push(...node.statements.map(stmt => renderNode(stmt, ctx)));
        return lines.filter(Boolean).join('\n');
      }
    case 'OrderedQueryOrExpr': {
      const withList = node.query && node.query.withList ? renderNode(node.query.withList, ctx) : null;
      const base = node.query ? renderNode(node.query, ctx) : '';
      const lines = [];
      if (withList) lines.push(withList);
      if (base) lines.push(base);
      if (node.orderByLimitOpt) lines.push(renderOrderByLimitOpt(node.orderByLimitOpt, ctx));
      return lines.filter(Boolean).join('\n');
    }
    case 'QueryOrExpr':
      if (node.setOps && node.setOps.length) {
        markUnknown(ctx);
      }
      return renderNode(node.leaf, ctx);
    case 'SqlSelect':
      return renderSelect(node, ctx);
    case 'SqlInsert':
      return renderInsert(node, ctx);
    case 'SqlDelete':
      return renderDelete(node, ctx);
    case 'SqlUpdate':
      return renderUpdate(node, ctx);
    case 'SqlMerge':
      return renderMerge(node, ctx);
    case 'AddSelectItem':
      return renderSelectItem(node, ctx);
    case 'SelectExpression':
      if (node.star) return '*';
      return renderNode(node.expr, ctx);
    case 'TableRef':
      return renderTableRef(node, ctx);
    case 'Subquery': {
      const baseIndent = indent(ctx, 1);
      const inner = renderNode(node.query, withIndent(ctx, 0));
      const lines = inner ? inner.split('\n').map(line => baseIndent + line) : [baseIndent];
      return `(\n${lines.join('\n')}\n${indent(ctx)})`;
    }
    case 'LateralSubquery': {
      const baseIndent = indent(ctx, 1);
      const inner = renderNode(node.query, withIndent(ctx, 0));
      const lines = inner ? inner.split('\n').map(line => baseIndent + line) : [baseIndent];
      return `LATERAL (\n${lines.join('\n')}\n${indent(ctx)})`;
    }
    case 'TableName':
      return renderNode(node.name, ctx);
    case 'CompoundTableIdentifier':
      return node.parts.map(p => (p.type === 'Identifier' ? renderNode(p, ctx) : '*')).join('.');
    case 'JoinTable':
      return renderJoin(node, ctx);
    case 'CommaJoin':
      return `, ${renderNode(node.table, ctx)}`;
    case 'FromClause':
      return renderFrom(node, ctx);
    case 'Where':
      return `WHERE ${renderNode(node.expr, ctx)}`;
    case 'GroupBy':
      return renderGroupBy(node, ctx);
    case 'Having':
      return `HAVING ${renderNode(node.expr, ctx)}`;
    case 'OrderBy':
      return renderOrderBy(node, ctx);
    case 'OrderItemList':
      return node.items.map(it => renderNode(it, ctx)).join('\n');
    case 'AddOrderItem':
      return renderOrderItem(node, ctx);
    case 'GroupingElementList':
      return node.items.map(it => renderNode(it, ctx)).join('\n');
    case 'ParenthesizedQueryOrCommaListWithDefault':
      return renderParenList(node.items, ctx, (it) => (it.type === 'Default' ? 'DEFAULT' : renderNode(it, ctx)));
    case 'Default':
      return 'DEFAULT';
    case 'RowConstructor':
      if (node.kind === 'EXPR') return renderNode(node.expr, ctx);
      if (node.kind === 'ROW') return `ROW ${renderNode(node.list, ctx)}`;
      if (node.kind === 'PAREN_ROW') return `(ROW ${renderNode(node.list, ctx)})`;
      if (!node.list) markUnknown(ctx);
      return renderNode(node.list, ctx);
    case 'ParenthesizedCompoundIdentifierList':
      return renderParenList(node.items, ctx, (it) => renderNode(it, ctx));
    case 'ParenthesizedSimpleIdentifierList':
      return renderParenList(node.items, ctx, (it) => renderNode(it, ctx));
    case 'ExpressionCommaList':
      return renderParenList(node.expressions, ctx, (it) => renderNode(it, ctx));
    case 'AddCompoundIdentifierType': {
      const name = renderNode(node.name, ctx);
      const dataType = node.dataType ? ` ${renderNode(node.dataType, ctx)}` : '';
      return `${name}${dataType}`;
    }
    case 'TableConstructor':
      return `${node.kind} ${node.rows.map(r => renderNode(r, ctx)).join(', ')}`;
    case 'StringLiteral':
      return `'${String(node.value).replace(/'/g, "''")}'`;
    case 'NumericLiteral':
      {
        const sign = node.sign ? String(node.sign) : '';
        if (node.value && typeof node.value === 'object' && node.value.value !== undefined) {
          return `${sign}${node.value.value}`;
        }
        return `${sign}${node.value}`;
      }
    case 'UnsignedNumericLiteral':
      return String(node.value);
    case 'Literal':
      return String(node.value);
    case 'SpecialLiteral':
      return node.value;
    case 'DateTimeLiteral':
      if (node.kind === 'd' || node.kind === 't' || node.kind === 'ts') {
        const prefix = node.kind === 'd' ? 'd' : node.kind === 't' ? 't' : 'ts';
        return `{${prefix} ${renderNode(node.value, ctx)}}`;
      }
      if (node.kind === 'TIME WITH TIME ZONE' || node.kind === 'TIMESTAMP WITH TIME ZONE') {
        const local = node.local ? ' LOCAL' : '';
        return `${node.kind}${local} ${renderNode(node.value, ctx)}`;
      }
      return `${node.kind} ${renderNode(node.value, ctx)}`;
    case 'IntervalLiteral':
    case 'IntervalLiteralOrExpression': {
      const sign = node.sign ? `${node.sign} ` : '';
      const valueNode = node.literal || node.value;
      const value = renderNode(valueNode, ctx);
      const qualifier = node.qualifier ? renderNode(node.qualifier, ctx) : '';
      const parts = [`INTERVAL`, `${sign}${value}`.trim()];
      if (qualifier) parts.push(qualifier);
      return parts.join(' ');
    }
    case 'IntervalQualifier': {
      let text = node.unit;
      if (node.unit === 'SECOND') {
        if (node.precision && node.scale) {
          text += `(${node.precision.value}, ${node.scale.value})`;
        } else if (node.precision) {
          text += `(${node.precision.value})`;
        }
      } else if (node.precision) {
        text += `(${node.precision.value})`;
      }
      if (node.to) {
        text += ` TO ${node.to}`;
      }
      return text;
    }
    case 'DynamicParam':
      if (node.raw) return node.raw;
      if (node.kind === 'QMARK') return '?';
      if (node.kind === 'INDEXED' && node.index) return `:${node.index.value}`;
      if (node.kind === 'DOLLAR_INDEX' && node.index) return `$${node.index.value}`;
      if (node.kind === 'NAMED' && node.name) return `:${node.name}`;
      return '?';
    case 'Identifier':
      if (node.quoted === '"') {
        const value = (node.value || node.name || '').replace(/"/g, '""');
        return `"${value}"`;
      }
      return node.value || node.name;
    case 'CompoundIdentifier':
      return node.parts.map(p => {
        if (typeof p === 'string') return p;
        if (p.type === 'Identifier') return renderNode(p, ctx);
        return '*';
      }).join('.');
    case 'ParenthesizedExpression':
    case 'ParenExpression': {
      // Avoid double-wrapping when parser emits nested paren nodes
      if (node.node && (node.node.type === 'ParenthesizedExpression' || node.node.type === 'ParenExpression')) {
        return renderNode(node.node, ctx);
      }
      if (node.node && node.node.type === 'ExpressionCommaList') {
        const list = node.node.expressions || [];
        if (list.length === 1) {
          const inner = renderNode(list[0], withIndent(ctx, 0));
          if (inner.includes('\n')) {
            const lines = inner.split('\n').map(line => `${indent(ctx, 2)}${line}`);
            return `(\n${lines.join('\n')}\n${indent(ctx, 1)})`;
          }
          return `(${inner})`;
        }
        // ExpressionCommaList already renders with parentheses
        return renderNode(node.node, ctx);
      }
      const inner = renderNode(node.node, withIndent(ctx, 0));
      if (inner.includes('\n')) {
        const lines = inner.split('\n').map(line => `${indent(ctx, 2)}${line}`);
        return `(\n${lines.join('\n')}\n${indent(ctx, 1)})`;
      }
      return `(${inner})`;
    }
    case 'AddGroupingElement':
      if (node.kind === 'EXPR') return renderNode(node.expr, ctx);
      if (node.list) return renderNode(node.list, ctx);
      markUnknown(ctx);
      return '';
    case 'Expression2b':
      return renderExpression2b(node, ctx);
    case 'BinaryExpression': {
      const op = renderBinaryOp(node.operator);
      const isLogicalOp = op && /^(AND|OR)$/i.test(op);

      if (isLogicalOp) {
        const left = renderNode(node.left, ctx);
        const right = renderNode(node.right, ctx);
        return `${left}\n${indent(ctx)}${op}\n${indent(ctx, 1)}${right}`;
      }

      return `${renderNode(node.left, ctx)} ${op} ${renderNode(node.right, ctx)}`;
    }
    case 'InPredicate':
      return renderInPredicate(node, ctx);
    case 'NamedFunctionCall': {
      const base = renderNode(node.namedCall, ctx);
      if (node.nullTreatment || node.withinDistinct || node.withinGroup || node.filter || node.over) {
        markUnknown(ctx);
      }
      return base;
    }
    case 'NamedCall': {
      const name = renderNode(node.name, ctx);
      if (node.callType === 'STAR') return `${name}(*)`;
      if (node.callType === 'PARAMS' && node.params) {
        return `${name}(${renderNode(node.params, ctx)})`;
      }
      if (node.callType === 'DISTINCT_PARAMS' && node.params) {
        return `${name}(DISTINCT ${renderNode(node.params, ctx)})`;
      }
      if (node.callType === 'EMPTY') return `${name}()`;
      markUnknown(ctx);
      return `${name}()`;
    }
    case 'FunctionParameterList': {
      const quantifier = node.quantifier ? `${node.quantifier} ` : '';
      const args = node.args ? node.args.map(arg => renderNode(arg, ctx)).join(', ') : '';
      return `${quantifier}${args}`;
    }
    case 'Arg': {
      if (node.name) {
        return `${renderNode(node.name, ctx)} => ${renderNode(node.expr, ctx)}`;
      }
      return renderNode(node.expr, ctx);
    }
    // DDL Statement Types
    case 'DropTableStmt':
      return renderDropTable(node, ctx);
    case 'CreateTableStmt':
      return renderCreateTable(node, ctx);
    case 'CreateIndexStmt':
      return renderCreateIndex(node, ctx);
    case 'AlterTableStmt':
      return renderAlterTable(node, ctx);
    case 'TruncateTableStmt':
      return renderTruncateTable(node, ctx);
    case 'CreateViewStmt':
      return renderCreateView(node, ctx);
    default:
      markUnknown(ctx);
      return `[${node.type}]`;
  }
}

// ============================================================================
// DDL Renderer Functions
// ============================================================================

function renderDropTable(node, ctx) {
  const lines = [];
  let line = 'DROP TABLE';
  if (node.ifExists) line += ' IF EXISTS';
  lines.push(line);
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);
  if (node.option) lines.push(`${indent(ctx, 1)}${node.option}`);  // CASCADE or RESTRICT
  return lines.join('\n');
}

function renderCreateTable(node, ctx) {
  const lines = [];

  // CREATE [TEMPORARY] TABLE [IF NOT EXISTS] name
  let createLine = 'CREATE';
  if (node.temp) createLine += ' TEMPORARY';
  createLine += ' TABLE';
  if (node.ifNotExists) createLine += ' IF NOT EXISTS';
  lines.push(createLine);
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);

  // Table elements (columns)
  if (node.body && node.body.type === 'TableElements') {
    lines.push(`${indent(ctx, 1)}(`);
    if (node.body.elements && node.body.elements.length > 0) {
      lines.push(`${indent(ctx, 2)}${node.body.elements[0]}`);
      for (let i = 1; i < node.body.elements.length; i++) {
        lines.push(`${indent(ctx, 2)}, ${node.body.elements[i]}`);
      }
    }
    lines.push(`${indent(ctx, 1)})`);
  }
  // AS query
  else if (node.body && node.body.type === 'AsQuery') {
    lines.push(`${indent(ctx, 1)}AS`);
    const raw = node.body.raw ? node.body.raw.trim() : '';
    const formatted = raw ? tryFormatQuery(raw) : null;
    const body = formatted || raw;
    const bodyLines = body ? body.split('\n') : [];
    if (bodyLines.length === 0) {
      lines.push(`${indent(ctx, 2)}`);
    } else {
      bodyLines.forEach(line => lines.push(`${indent(ctx, 2)}${line}`));
    }
  }
  // LIKE table
  else if (node.body && node.body.type === 'LikeTable') {
    lines.push(`${indent(ctx, 1)}LIKE ${renderNode(node.body.like, ctx)}`);
    if (node.body.raw && node.body.raw.trim()) {
      lines.push(`${indent(ctx, 2)}${node.body.raw.trim()}`);
    }
  }

  // Trailing options (ENGINE, CHARSET, etc.)
  if (node.raw && node.raw.trim()) {
    lines.push(`${indent(ctx, 1)}${node.raw.trim()}`);
  }

  return lines.join('\n');
}

function renderCreateIndex(node, ctx) {
  const lines = [];

  // CREATE [UNIQUE] INDEX [IF NOT EXISTS] name
  let createLine = 'CREATE';
  if (node.unique) createLine += ' UNIQUE';
  createLine += ' INDEX';
  if (node.ifNotExists) createLine += ' IF NOT EXISTS';
  lines.push(createLine);
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);

  // ON table
  lines.push(`ON ${renderNode(node.table, ctx)}`);

  // Column list
  lines.push(`${indent(ctx, 1)}(`);
  if (node.elements && node.elements.length > 0) {
    lines.push(`${indent(ctx, 2)}${node.elements[0]}`);
    for (let i = 1; i < node.elements.length; i++) {
      lines.push(`${indent(ctx, 2)}, ${node.elements[i]}`);
    }
  }
  lines.push(`${indent(ctx, 1)})`);

  // Trailing options
  if (node.raw && node.raw.trim()) {
    lines.push(`${indent(ctx, 1)}${node.raw.trim()}`);
  }

  return lines.join('\n');
}

function renderAlterTable(node, ctx) {
  const lines = [];
  let alterLine = 'ALTER TABLE';
  if (node.ifExists) alterLine += ' IF EXISTS';
  lines.push(alterLine);
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);

  // Raw action (ADD COLUMN, DROP COLUMN, etc.)
  if (node.raw && node.raw.trim()) {
    lines.push(`${indent(ctx, 1)}${node.raw.trim()}`);
  }

  return lines.join('\n');
}

function renderTruncateTable(node, ctx) {
  const lines = [];
  lines.push('TRUNCATE TABLE');
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);
  if (node.option) lines.push(`${indent(ctx, 1)}${node.option}`);
  return lines.join('\n');
}

function renderCreateView(node, ctx) {
  const lines = [];
  let createLine = 'CREATE';
  if (node.orReplace) createLine += ' OR REPLACE';
  createLine += ' VIEW';
  if (node.ifNotExists) createLine += ' IF NOT EXISTS';
  lines.push(createLine);
  lines.push(`${indent(ctx, 1)}${renderNode(node.name, ctx)}`);

  // Column list (optional)
  if (node.columns && node.columns.length > 0) {
    const cols = node.columns.map(c => renderNode(c, ctx)).join(', ');
    lines.push(`${indent(ctx, 1)}(${cols})`);
  }

  // AS query
  lines.push(`AS`);
  if (node.raw && node.raw.trim()) {
    const formatted = tryFormatQuery(node.raw.trim());
    const body = formatted || node.raw.trim();
    const bodyLines = body.split('\n').map(line => `${indent(ctx, 1)}${line}`);
    lines.push(...bodyLines);
  }

  return lines.join('\n');
}

function renderSelect(node, ctx) {
  const lines = [];
  if (node.hints || node.stream) {
    markUnknown(ctx);
  }
  let selectKeyword = 'SELECT';
  if (node.setQuantifier && node.setQuantifier === 'DISTINCT') {
    selectKeyword = 'SELECT DISTINCT';
  }
  if (node.selectComments && node.selectComments.length > 0) {
    lines.push(`${selectKeyword} -- ${node.selectComments.join(' ')}`);
  } else {
    lines.push(selectKeyword);
  }
  const items = node.selectItems || [];
  items.forEach((item, idx) => {
    const prefix = idx === 0 ? indent(ctx, 1) : `${indent(ctx, 1)}, `;
    lines.push(prefix + renderNode(item, withIndent(ctx, ctx.indent + 1)));
  });
  if (node.from) {
    lines.push(`${indent(ctx)}FROM`);
    lines.push(`${indent(ctx, 1)}${renderNode(node.from, withIndent(ctx, ctx.indent + 1))}`);
  }
  if (node.where) {
    lines.push(`${indent(ctx)}WHERE`);
    lines.push(`${indent(ctx, 1)}${renderNode(node.where.expr, withIndent(ctx, ctx.indent + 1))}`);
  }
  if (node.groupBy) {
    lines.push(`${indent(ctx)}${renderNode(node.groupBy, ctx)}`);
  }
  if (node.having) {
    lines.push(`${indent(ctx)}${renderNode(node.having, withIndent(ctx, ctx.indent + 1))}`);
  }
  if (node.orderBy) {
    lines.push(`${indent(ctx)}${renderNode(node.orderBy, ctx)}`);
  }
  if (node.window || node.qualify) {
    markUnknown(ctx);
  }
  return lines.join('\n');
}

function extractTopLevelSuffix(sql, tokens) {
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "SYMBOL") {
      if (t.value === "(") depth++;
      if (t.value === ")") depth = Math.max(0, depth - 1);
    }
    if (depth !== 0) continue;
    if (t.type === "IDENT") {
      const kw = String(t.value).toUpperCase();
      if (kw === "WINDOW" || kw === "QUALIFY" || kw === "MATCH_RECOGNIZE" || kw === "PIVOT" || kw === "UNPIVOT" || kw === "TABLESAMPLE") {
        return sql.slice(t.start).trimEnd();
      }
    }
  }
  return null;
}
function renderSelectItem(node, ctx) {
  const expr = renderNode(node.expr, ctx);
  if (node.measure) markUnknown(ctx);
  if (node.alias) {
    if (typeof node.alias === 'string') return `${expr} AS ${node.alias}`;
    if (node.alias.name || node.alias.value) return `${expr} AS ${node.alias.name || node.alias.value}`;
    return `${expr} AS ${renderNode(node.alias, ctx)}`;
  }
  return expr;
}

function renderFrom(node, ctx) {
  const base = renderNode(node.first, ctx);
  const joins = (node.joins || []).map(j => renderNode(j, ctx));
  return [base, ...joins].join('\n' + indent(ctx));
}

function renderTableRef(node, ctx) {
  if (node.base) {
    if (node.matchRecognize || node.pivot || node.unpivot || node.tablesample || node.snapshot || node.over || node.tableOverOpt || node.extend || node.hints) {
      markUnknown(ctx);
    }
    const base = renderNode(node.base, ctx);
    const alias = node.alias ? (node.alias.value || node.alias.name || node.alias) : null;
    return alias ? `${base} ${alias}` : base;
  }
  markUnknown(ctx);
  return '[TableRef]';
}

function renderGroupBy(node, ctx) {
  const items = node.list.items.map(it => renderNode(it, ctx));
  if (items.length === 0) return 'GROUP BY';
  const lines = ['GROUP BY'];
  lines.push(`${indent(ctx, 1)}${items[0]}`);
  for (let i = 1; i < items.length; i++) {
    lines.push(`${indent(ctx, 1)}, ${items[i]}`);
  }
  return lines.join('\n');
}

function renderOrderBy(node, ctx) {
  const items = node.list.items.map(it => renderOrderItem(it, ctx));
  if (items.length === 0) return 'ORDER BY';
  const lines = ['ORDER BY'];
  lines.push(`${indent(ctx, 1)}${items[0]}`);
  for (let i = 1; i < items.length; i++) {
    lines.push(`${indent(ctx, 1)}, ${items[i]}`);
  }
  return lines.join('\n');
}

function renderOrderItem(node, ctx) {
  const expr = renderNode(node.expr, ctx);
  const dir = node.direction ? ` ${node.direction}` : '';
  return `${expr}${dir}`;
}

function renderParenList(items, ctx, renderItem) {
  if (!items || items.length === 0) return '()';
  const lines = [`${indent(ctx)}(`];
  const first = renderItem(items[0]);
  lines.push(indentMultiline(first, indent(ctx, 1)));
  for (let i = 1; i < items.length; i++) {
    const item = renderItem(items[i]);
    lines.push(indentMultiline(item, indent(ctx, 1), true));
  }
  lines.push(`${indent(ctx)})`);
  return lines.join('\n');
}

function indentMultiline(text, pad, commaPrefix = false) {
  const lines = text.split('\n');
  return lines
    .map((line, idx) => {
      if (idx === 0 && commaPrefix) {
        return `${pad}, ${line.trimStart()}`;
      }
      return `${pad}${line}`;
    })
    .join('\n');
}

function renderInsert(node, ctx) {
  const lines = [];
  lines.push('INSERT');
  lines.push(`${indent(ctx)}INTO`);
  lines.push(`${indent(ctx, 1)}${renderNode(node.table, ctx)}`);
  if (node.columns) {
    const cols = renderNode(node.columns, withIndent(ctx, ctx.indent + 1));
    lines.push(cols);
  }
  if (node.source) {
    const sourceNode =
      node.source.type === 'OrderedQueryOrExpr' && node.source.query && node.source.query.leaf
        ? node.source.query.leaf
        : node.source;
    if (sourceNode.type === 'TableConstructor' && sourceNode.kind === 'VALUES') {
      lines.push(`${indent(ctx)}VALUES`);
      sourceNode.rows.forEach((row, idx) => {
        const rowText = renderValuesRow(row, ctx);
        if (idx === 0) {
          lines.push(rowText);
          return;
        }
        const rowLines = rowText.split('\n');
        rowLines[0] = rowLines[0].replace(/^(\s*)/, '$1, ');
        lines.push(rowLines.join('\n'));
      });
    } else {
      const sourceText = renderNode(node.source, withIndent(ctx, 0)).trim();
      if (sourceText.startsWith('VALUES ')) {
        const rest = sourceText.slice('VALUES '.length);
        lines.push(`${indent(ctx)}VALUES`);
        lines.push(`${indent(ctx, 1)}${rest}`);
      } else if (sourceText === 'VALUES') {
        lines.push(`${indent(ctx)}VALUES`);
      } else {
        lines.push(`${indent(ctx)}${sourceText}`);
      }
    }
  }
  return lines.join('\n');
}

function renderDelete(node, ctx) {
  const lines = [];
  if (node.hints || node.extend) {
    markUnknown(ctx);
  }
  const tableText = renderNode(node.table, ctx);
  const alias = node.alias ? (node.alias.value || node.alias.name || node.alias) : null;
  const tableWithAlias = alias ? `${tableText} ${alias}` : tableText;
  lines.push('DELETE');
  lines.push(`${indent(ctx)}FROM`);
  lines.push(`${indent(ctx, 1)}${tableWithAlias}`);
  if (node.where) {
    lines.push(`${indent(ctx)}WHERE`);
    lines.push(`${indent(ctx, 1)}${renderNode(node.where.expr, withIndent(ctx, ctx.indent + 1))}`);
  }
  return lines.join('\n');
}

function renderUpdate(node, ctx) {
  const lines = [];
  if (node.hints || node.extend) {
    markUnknown(ctx);
  }
  const tableText = renderNode(node.table, ctx);
  const alias = node.alias ? (node.alias.value || node.alias.name || node.alias) : null;
  const tableWithAlias = alias ? `${tableText} ${alias}` : tableText;
  lines.push('UPDATE');
  lines.push(`${indent(ctx, 1)}${tableWithAlias}`);
  lines.push(`${indent(ctx)}SET`);
  const assignments = node.assignments || [];
  assignments.forEach((assign, idx) => {
    const target = renderNode(assign.target, ctx);
    const expr = renderNode(assign.expr, ctx);
    const prefix = idx === 0 ? indent(ctx, 1) : `${indent(ctx, 1)}, `;
    lines.push(`${prefix}${target} = ${expr}`);
  });
  if (node.where) {
    lines.push(`${indent(ctx)}WHERE`);
    lines.push(`${indent(ctx, 1)}${renderNode(node.where.expr, withIndent(ctx, ctx.indent + 1))}`);
  }
  return lines.join('\n');
}

function renderMerge(node, ctx) {
  const lines = [];
  if (node.hints || node.extend) {
    markUnknown(ctx);
  }
  const tableText = renderNode(node.table, ctx);
  const alias = node.alias ? (node.alias.value || node.alias.name || node.alias) : null;
  const tableWithAlias = alias ? `${tableText} ${alias}` : tableText;
  lines.push('MERGE INTO');
  lines.push(`${indent(ctx, 1)}${tableWithAlias}`);
  lines.push('USING');
  lines.push(`${indent(ctx, 1)}${renderNode(node.using, ctx)}`);
  lines.push('ON');
  lines.push(`${indent(ctx, 1)}${renderNode(node.on, withIndent(ctx, ctx.indent + 1))}`);

  if (node.matched) {
    lines.push('WHEN MATCHED THEN');
    lines.push(`${indent(ctx, 1)}UPDATE`);
    lines.push(`${indent(ctx, 1)}SET`);
    const assignments = node.matched.assignments || [];
    assignments.forEach((assign, idx) => {
      const target = renderNode(assign.target, ctx);
      const expr = renderNode(assign.expr, ctx);
      const prefix = idx === 0 ? indent(ctx, 2) : `${indent(ctx, 2)}, `;
      lines.push(`${prefix}${target} = ${expr}`);
    });
  }

  if (node.notMatched) {
    lines.push('WHEN NOT MATCHED THEN');
    lines.push(`${indent(ctx, 1)}INSERT`);
    if (node.notMatched.columns) {
      const cols = renderNode(node.notMatched.columns, withIndent(ctx, ctx.indent + 2));
      lines.push(cols);
    }
    lines.push(`${indent(ctx, 1)}VALUES`);
    if (node.notMatched.values) {
      const values = renderNode(node.notMatched.values, withIndent(ctx, ctx.indent + 2));
      lines.push(values);
    }
  }

  return lines.join('\n');
}

function renderValuesRow(row, ctx) {
  if (!row) return '';
  if (row.kind === 'EXPR') {
    if (row.expr && row.expr.type === 'ParenthesizedQueryOrCommaListWithDefault') {
      return renderValuesList(row.expr.items, ctx);
    }
    return `${indent(ctx, 1)}${renderNode(row.expr, ctx)}`;
  }
  const list = row.list && row.list.items ? row.list.items : [];
  if (list.length === 0) return `${indent(ctx, 1)}()`;
  return renderValuesList(list, ctx);
}

function renderValuesList(items, ctx) {
  const base = indent(ctx, 1);
  const inner = `${base}    `;
  const renderItem = (it) => (it.type === 'Default' ? 'DEFAULT' : renderNode(it, ctx));
  const lines = [`${base}(`];
  lines.push(`${inner}${renderItem(items[0])}`);
  for (let i = 1; i < items.length; i++) {
    lines.push(`${inner}, ${renderItem(items[i])}`);
  }
  lines.push(`${base})`);
  return lines.join('\n');
}

function renderJoin(node, ctx) {
  const base = `${node.joinType} ${renderNode(node.table, ctx)}`;
  if (!node.condition) return base;
  if (node.condition.type === 'On') {
    const expr = renderNode(node.condition.expr, withIndent(ctx, ctx.indent + 1));
    return `${base}\n${indent(ctx, 1)}ON ${expr}`;
  }
  if (node.condition.type === 'Using') {
    const cols = node.condition.columns.items.map(c => renderNode(c, ctx)).join(', ');
    return `${base}\n${indent(ctx, 1)}USING (${cols})`;
  }
  markUnknown(ctx);
  return base;
}

function renderOrderByLimitOpt(opt, ctx) {
  if (!opt) return '';
  const lines = [];
  if (opt.orderBy) lines.push(renderOrderBy(opt.orderBy, ctx));
  if (opt.limit) lines.push(`LIMIT ${renderNode(opt.limit.value, ctx)}`);
  if (opt.offset) lines.push(`OFFSET ${renderNode(opt.offset.value, ctx)}`);
  if (opt.fetch) lines.push(`FETCH ${opt.fetch.mode} ${renderNode(opt.fetch.value, ctx)} ${opt.fetch.rows} ONLY`);
  return lines.filter(Boolean).join('\n');
}

function renderExpression2b(node, ctx) {
  const base = renderNode(node.base, ctx);
  if (node.extensions && node.extensions.length) {
    markUnknown(ctx);
  }
  const prefixes = node.prefixes || [];
  if (!prefixes.length) return base;
  const rendered = prefixes.map(p => {
    if (typeof p === 'string' && /[A-Za-z]/.test(p)) return `${p.toUpperCase()} `;
    return String(p);
  }).join('');
  return `${rendered}${base}`;
}

function renderBinaryOp(op) {
  if (!op) return '';
  if (typeof op === 'string') return op;
  return op.op || '';
}

function renderInPredicate(node, ctx) {
  const left = renderNode(node.left, ctx);
  const notKeyword = node.not ? 'NOT ' : '';
  // source can be a subquery (OrderedQueryOrExpr) or a value list
  if (node.source.type === 'OrderedQueryOrExpr' || node.source.type === 'QueryOrExpr') {
    const inner = renderNode(node.source, withIndent(ctx, 0));
    if (!inner) {
      markUnknown(ctx);
      return `${left} ${notKeyword}IN (/* unknown */)`;
    }
    const lines = [`${left} ${notKeyword}IN`, `${indent(ctx, 1)}(`];
    inner.split('\n').forEach(line => lines.push(`${indent(ctx, 2)}${line}`));
    lines.push(`${indent(ctx, 1)})`);
    return lines.join('\n');
  }
  if (node.source.type === 'ExpressionCommaList') {
    const items = node.source.expressions.map(it => renderNode(it, ctx));
    const lines = [`${left} ${notKeyword}IN`, `${indent(ctx, 1)}(`];
    if (items.length > 0) {
      lines.push(`${indent(ctx, 2)}${items[0]}`);
      for (let i = 1; i < items.length; i++) {
        lines.push(`${indent(ctx, 2)}, ${items[i]}`);
      }
    }
    lines.push(`${indent(ctx, 1)})`);
    return lines.join('\n');
  }
  const source = renderNode(node.source, ctx);
  return `${left} ${notKeyword}IN ${source}`;
}

function indent(ctx, extra = 0) {
  return ' '.repeat((ctx.indent + extra) * 4);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatSql };
}
if (typeof window !== 'undefined') {
  window.formatSql = formatSql;
}
