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
    case 'SqlSelect':
      return renderSelect(node, ctx);
    case 'AddSelectItem':
      return renderSelectItem(node, ctx);
    case 'SelectExpression':
      if (node.star) return '*';
      return renderNode(node.expr, ctx);
    case 'TableRef':
      return renderTableRef(node, ctx);
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
    case 'StringLiteral':
      return `'${node.value}'`;
    case 'NumericLiteral':
      return String(node.value);
    case 'Literal':
      return String(node.value);
    case 'Identifier':
      return node.name;
    case 'CompoundIdentifier':
      return node.parts.map(p => (p.type === 'Identifier' ? p.name : '*')).join('.');
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
    lines.push(`${indent(ctx)}FROM ${renderNode(node.from, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.where) {
    lines.push(`${indent(ctx)}${renderNode(node.where, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.groupBy) {
    lines.push(`${indent(ctx)}${renderNode(node.groupBy, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.having) {
    lines.push(`${indent(ctx)}${renderNode(node.having, { ...ctx, indent: ctx.indent + 1 })}`);
  }
  if (node.orderBy) {
    lines.push(`${indent(ctx)}${renderNode(node.orderBy, { ...ctx, indent: ctx.indent + 1 })}`);
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
    return renderNode(node.base, ctx);
  }
  return '[TableRef]';
}

function renderGroupBy(node, ctx) {
  const items = renderNode(node.list, ctx);
  return `GROUP BY ${items}`;
}

function renderOrderBy(node, ctx) {
  const items = renderNode(node.list, ctx);
  return `ORDER BY ${items}`;
}

function renderOrderItem(node, ctx) {
  const expr = renderNode(node.expr, ctx);
  const dir = node.direction ? ` ${node.direction}` : '';
  return `${expr}${dir}`;
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
