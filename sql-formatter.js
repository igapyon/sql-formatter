'use strict';

const { CalciteLexer, CalciteParser } = require('./spec/apache-calcite-Parser');

function formatSql(sql) {
  const lexer = new CalciteLexer(sql);
  const tokens = lexer.tokenize();
  const parser = new CalciteParser(tokens);
  const ast = parser.SqlStmtList();
  return renderNode(ast, { indent: 0 }).trim();
}

function renderNode(node, ctx) {
  if (!node) return '';
  switch (node.type) {
    case 'SqlStmtList':
      return node.statements.map(stmt => renderNode(stmt, ctx)).join('\n');
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
      return renderNode(node.leaf, ctx);
    case 'SqlSelect':
      return renderSelect(node, ctx);
    case 'AddSelectItem':
      return renderSelectItem(node, ctx);
    case 'SelectExpression':
      if (node.star) return '*';
      return renderNode(node.expr, ctx);
    case 'TableRef':
      return renderTableRef(node, ctx);
    case 'TableName':
      return renderNode(node.name, ctx);
    case 'CompoundTableIdentifier':
      return node.parts.map(p => (p.type === 'Identifier' ? (p.value || p.name) : '*')).join('.');
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
    case 'OrderBy':
      return renderOrderBy(node, ctx);
    case 'OrderItemList':
      return node.items.map(it => renderNode(it, ctx)).join('\n');
    case 'AddOrderItem':
      return renderOrderItem(node, ctx);
    case 'GroupingElementList':
      return node.items.map(it => renderNode(it, ctx)).join('\n');
    case 'StringLiteral':
      return `'${node.value}'`;
    case 'NumericLiteral':
      if (node.value && typeof node.value === 'object' && node.value.value !== undefined) {
        return String(node.value.value);
      }
      return String(node.value);
    case 'UnsignedNumericLiteral':
      return String(node.value);
    case 'Literal':
      return String(node.value);
    case 'Identifier':
      return node.value || node.name;
    case 'CompoundIdentifier':
      return node.parts.map(p => (p.type === 'Identifier' ? (p.value || p.name) : '*')).join('.');
    case 'ParenthesizedExpression':
      return `(${renderNode(node.node, ctx)})`;
    case 'ParenExpression':
      return `(${renderNode(node.node, ctx)})`;
    case 'AddGroupingElement':
      if (node.kind === 'EXPR') return renderNode(node.expr, ctx);
      if (node.list) return renderNode(node.list, ctx);
      return '';
    case 'Expression2b':
      return renderExpression2b(node, ctx);
    case 'BinaryExpression':
      return `${renderNode(node.left, ctx)} ${renderBinaryOp(node.operator)} ${renderNode(node.right, ctx)}`;
    default:
      return `[${node.type}]`;
  }
}

function renderSelect(node, ctx) {
  const lines = [];
  lines.push('SELECT');
  const items = node.selectItems || [];
  items.forEach((item, idx) => {
    const prefix = idx === 0 ? indent(ctx, 1) : `${indent(ctx, 1)}, `;
    lines.push(prefix + renderNode(item, { ...ctx, indent: ctx.indent + 1 }));
  });
  if (node.from) {
    lines.push(`${indent(ctx)}FROM`);
    lines.push(`${indent(ctx, 1)}${renderNode(node.from, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.where) {
    lines.push(`${indent(ctx)}${renderNode(node.where, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.groupBy) {
    lines.push(`${indent(ctx)}${renderNode(node.groupBy, ctx)}`);
  }
  if (node.having) {
    lines.push(`${indent(ctx)}${renderNode(node.having, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.orderBy) {
    lines.push(`${indent(ctx)}${renderNode(node.orderBy, ctx)}`);
  }
  return lines.join('\n');
}

function renderSelectItem(node, ctx) {
  const expr = renderNode(node.expr, ctx);
  if (node.alias) return `${expr} AS ${node.alias.name || node.alias}`;
  return expr;
}

function renderFrom(node, ctx) {
  const base = renderNode(node.first, ctx);
  const joins = (node.joins || []).map(j => renderNode(j, ctx));
  return [base, ...joins].join('\n' + indent(ctx));
}

function renderTableRef(node, ctx) {
  if (node.base) {
    const base = renderNode(node.base, ctx);
    const alias = node.alias ? (node.alias.value || node.alias.name || node.alias) : null;
    return alias ? `${base} ${alias}` : base;
  }
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

function renderJoin(node, ctx) {
  const base = `${node.joinType} ${renderNode(node.table, ctx)}`;
  if (!node.condition) return base;
  if (node.condition.type === 'On') {
    const expr = renderNode(node.condition.expr, { ...ctx, indent: ctx.indent + 1 });
    return `${base}\n${indent(ctx, 1)}ON ${expr}`;
  }
  if (node.condition.type === 'Using') {
    const cols = node.condition.columns.items.map(c => c.value || c.name).join(', ');
    return `${base}\n${indent(ctx, 1)}USING (${cols})`;
  }
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
  return base;
}

function renderBinaryOp(op) {
  if (!op) return '';
  if (typeof op === 'string') return op;
  return op.op || '';
}

function indent(ctx, extra = 0) {
  return ' '.repeat((ctx.indent + extra) * 4);
}

module.exports = { formatSql };
