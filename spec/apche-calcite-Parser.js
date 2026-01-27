/**
 * Stage 1 skeleton parser generated from apche-calcite-Parser.md.
 * - Library-free lexer
 * - One method per EBNF production (skeleton)
 */
'use strict';

class CalciteLexer {
  constructor(input) {
    this.input = input || "";
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    const s = this.input;
    while (this.pos < s.length) {
      const ch = s[this.pos];
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }
      // strings (single-quoted, no escape handling)
      if (ch === "'") {
        let value = "";
        this.pos++;
        while (this.pos < s.length && s[this.pos] !== "'") {
          value += s[this.pos++];
        }
        this.pos++;
        this.tokens.push({ type: "STRING", value });
        continue;
      }
      // numbers
      if (/[0-9]/.test(ch)) {
        let value = "";
        while (this.pos < s.length && /[0-9\.]/.test(s[this.pos])) {
          value += s[this.pos++];
        }
        this.tokens.push({ type: "NUMBER", value });
        continue;
      }
      // identifiers
      if (/[A-Za-z_]/.test(ch)) {
        let value = "";
        while (this.pos < s.length && /[A-Za-z0-9_]/.test(s[this.pos])) {
          value += s[this.pos++];
        }
        this.tokens.push({ type: "IDENT", value });
        continue;
      }
      // symbols (two-char first)
      const two = s.slice(this.pos, this.pos + 2);
      const twoOps = ["<=", ">=", "<>", "!=", "||", "::", "->", ":="];
      if (twoOps.includes(two)) {
        this.tokens.push({ type: "SYMBOL", value: two });
        this.pos += 2;
        continue;
      }
      this.tokens.push({ type: "SYMBOL", value: ch });
      this.pos++;
    }
    this.tokens.push({ type: "EOF", value: null });
    return this.tokens;
  }
}

class CalciteParser {
  constructor(tokens) {
    this.tokens = tokens || [];
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] || { type: "EOF", value: null }; }
  peekN(n) { return this.tokens[this.pos + n] || { type: "EOF", value: null }; }
  next() { return this.tokens[this.pos++] || { type: "EOF", value: null }; }
  isEOF() { return this.peek().type === "EOF"; }
  isSymbol(value) {
    const t = this.peek();
    return t.type === "SYMBOL" && t.value === value;
  }
  isSymbolAt(value, offset) {
    const t = this.peekN(offset);
    return t.type === "SYMBOL" && t.value === value;
  }
  isKeyword(value) {
    const t = this.peek();
    return t.type === "IDENT" && String(t.value).toUpperCase() === value;
  }
  isKeywordAt(value, offset) {
    const t = this.peekN(offset);
    return t.type === "IDENT" && String(t.value).toUpperCase() === value;
  }
  acceptSymbol(value) {
    if (this.isSymbol(value)) return this.next();
    return null;
  }
  acceptKeyword(value) {
    if (this.isKeyword(value)) return this.next();
    return null;
  }
  expectSymbol(value) {
    const t = this.peek();
    if (!this.isSymbol(value)) {
      throw new Error(`Expected symbol ${value} but got ${t.type}:${t.value}`);
    }
    return this.next();
  }
  expectKeyword(value) {
    const t = this.peek();
    if (!this.isKeyword(value)) {
      throw new Error(`Expected keyword ${value} but got ${t.type}:${t.value}`);
    }
    return this.next();
  }
  isLambdaStart() {
    if (this.peek().type === "IDENT" && this.isSymbolAt("->", 1)) {
      return true;
    }
    if (this.isSymbol("(")) {
      let depth = 0;
      let i = 0;
      while (true) {
        const t = this.peekN(i);
        if (!t || t.type === "EOF") break;
        if (t.type === "SYMBOL" && t.value === "(") depth++;
        else if (t.type === "SYMBOL" && t.value === ")") {
          depth--;
          if (depth === 0) {
            return this.isSymbolAt("->", i + 1);
          }
        }
        i++;
      }
    }
    return false;
  }
  isBinaryOperator() {
    const t = this.peek();
    if (t.type === "SYMBOL") {
      return ["=", "<", ">", "<=", ">=", "<>", "!=", "+", "-", "*", "/", "%", "||"].includes(t.value);
    }
    if (t.type === "IDENT") {
      const v = String(t.value).toUpperCase();
      return v === "AND" || v === "OR";
    }
    return false;
  }
  readBinaryOperator() {
    const t = this.peek();
    if (t.type === "SYMBOL") return this.next().value;
    if (t.type === "IDENT") return String(this.next().value).toUpperCase();
    throw new Error(`Expected binary operator but got ${t.type}:${t.value}`);
  }
  isComparisonOperatorAt(offset) {
    const t = this.peekN(offset);
    if (t.type !== "SYMBOL") return false;
    return ["=", "<", ">", "<=", ">=", "<>", "!="].includes(t.value);
  }
  isJoinTypeStart() {
    if (this.isKeyword("JOIN") || this.isKeyword("INNER") || this.isKeyword("LEFT") || this.isKeyword("RIGHT") ||
        this.isKeyword("FULL") || this.isKeyword("CROSS") || this.isKeyword("ASOF")) {
      return true;
    }
    return false;
  }
  isTypeNameStart() {
    const keywords = [
      "GEOMETRY", "BOOLEAN", "INTEGER", "INT", "UNSIGNED", "TINYINT", "SMALLINT", "BIGINT",
      "REAL", "DOUBLE", "FLOAT", "VARIANT", "UUID",
      "BINARY", "VARBINARY", "DECIMAL", "DEC", "NUMERIC", "ANY",
      "CHARACTER", "CHAR", "VARCHAR", "DATE", "TIME", "TIMESTAMP",
      "ROW", "MAP",
    ];
    for (const k of keywords) {
      if (this.isKeyword(k)) return true;
    }
    return false;
  }
  isTableHintsStart() {
    return this.isSymbol("/") && this.isSymbolAt("*", 1) && this.isSymbolAt("+", 2);
  }
  expect(type) {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`Expected ${type} but got ${t.type}`);
    }
    return this.next();
  }
  notImplemented(rule) {
    const t = this.peek();
    throw new Error(`Not implemented: ${rule} at token ${t.type}`);
  }

  SqlStmtList() {
    const statements = [];
    if (!this.isEOF()) {
      statements.push(this.SqlStmt());
      while (this.acceptSymbol(";")) {
        if (this.isEOF()) break;
        statements.push(this.SqlStmt());
      }
    }
    this.expect("EOF");
    return { type: "SqlStmtList", statements };
  }

  SqlStmtEof() {
    const stmt = this.SqlStmt();
    this.expect("EOF");
    return { type: "SqlStmtEof", stmt };
  }

  SqlExpressionEof() {
    const expr = this.Expression();
    this.expect("EOF");
    return { type: "SqlExpressionEof", expr };
  }

  SqlStmt() {
    if (this.isKeyword("SET") || this.isKeyword("RESET")) {
      return this.SqlSetOption();
    }
    if (this.isKeyword("ALTER")) {
      return this.SqlAlter();
    }
    if (this.isKeyword("EXPLAIN")) {
      return this.SqlExplain();
    }
    if (this.isKeyword("DESCRIBE")) {
      return this.SqlDescribe();
    }
    if (this.isKeyword("INSERT") || this.isKeyword("UPSERT")) {
      return this.SqlInsert();
    }
    if (this.isKeyword("DELETE")) {
      return this.SqlDelete();
    }
    if (this.isKeyword("UPDATE")) {
      return this.SqlUpdate();
    }
    if (this.isKeyword("MERGE")) {
      return this.SqlMerge();
    }
    if (this.isKeyword("CALL")) {
      return this.SqlProcedureCall();
    }
    return this.OrderedQueryOrExpr();
  }

  SqlSetOption() {
    if (this.acceptKeyword("SET")) {
      const name = this.CompoundIdentifier();
      this.expectSymbol("=");
      let value;
      if (this.acceptKeyword("ON")) {
        value = { type: "Keyword", value: "ON" };
      } else if (this.peek().type === "STRING" || this.peek().type === "NUMBER" || this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN") || this.isKeyword("NULL") || this.isKeyword("INTERVAL")) {
        value = this.Literal();
      } else {
        value = this.SimpleIdentifier();
      }
      return { type: "SqlSetOption", kind: "SET", name, value };
    }
    if (this.acceptKeyword("RESET")) {
      if (this.acceptKeyword("ALL")) {
        return { type: "SqlSetOption", kind: "RESET", target: "ALL" };
      }
      const name = this.CompoundIdentifier();
      return { type: "SqlSetOption", kind: "RESET", name };
    }
    throw new Error("Invalid SqlSetOption");
  }

  SqlAlter() {
    this.expectKeyword("ALTER");
    let scope;
    if (this.acceptKeyword("SYSTEM")) scope = "SYSTEM";
    else if (this.acceptKeyword("SESSION")) scope = "SESSION";
    else throw new Error("Invalid SqlAlter");
    const option = this.SqlSetOption();
    return { type: "SqlAlter", scope, option };
  }

  SqlExplain() {
    this.expectKeyword("EXPLAIN");
    this.expectKeyword("PLAN");
    let detail = null;
    if (this.isKeyword("EXCLUDING") || this.isKeyword("INCLUDING")) {
      detail = this.ExplainDetailLevel();
    }
    let depth = null;
    if (this.isKeyword("WITH") || this.isKeyword("WITHOUT")) {
      depth = this.ExplainDepth();
    }
    let format = null;
    if (this.acceptKeyword("AS")) {
      if (this.acceptKeyword("XML")) format = "XML";
      else if (this.acceptKeyword("JSON")) format = "JSON";
      else if (this.acceptKeyword("DOT")) format = "DOT";
      else throw new Error("Invalid SqlExplain format");
    }
    this.expectKeyword("FOR");
    const stmt = this.SqlQueryOrDml();
    return { type: "SqlExplain", detail, depth, format, stmt };
  }

  ExplainDetailLevel() {
    let mode;
    if (this.acceptKeyword("EXCLUDING")) mode = "EXCLUDING";
    else if (this.acceptKeyword("INCLUDING")) mode = "INCLUDING";
    else throw new Error("Invalid ExplainDetailLevel");
    let all = false;
    if (this.acceptKeyword("ALL")) all = true;
    this.expectKeyword("ATTRIBUTES");
    return { type: "ExplainDetailLevel", mode, all };
  }

  ExplainDepth() {
    if (this.acceptKeyword("WITH")) {
      if (this.acceptKeyword("TYPE")) return { type: "ExplainDepth", value: "WITH TYPE" };
      if (this.acceptKeyword("IMPLEMENTATION")) return { type: "ExplainDepth", value: "WITH IMPLEMENTATION" };
    }
    if (this.acceptKeyword("WITHOUT")) {
      this.expectKeyword("IMPLEMENTATION");
      return { type: "ExplainDepth", value: "WITHOUT IMPLEMENTATION" };
    }
    return null;
  }

  SqlQueryOrDml() {
    if (this.isKeyword("INSERT") || this.isKeyword("UPSERT")) return this.SqlInsert();
    if (this.isKeyword("DELETE")) return this.SqlDelete();
    if (this.isKeyword("UPDATE")) return this.SqlUpdate();
    if (this.isKeyword("MERGE")) return this.SqlMerge();
    return this.OrderedQueryOrExpr();
  }

  SqlDescribe() {
    this.expectKeyword("DESCRIBE");
    if (this.acceptKeyword("DATABASE") || this.acceptKeyword("CATALOG") || this.acceptKeyword("SCHEMA")) {
      const kind = String(this.tokens[this.pos - 1].value).toUpperCase();
      const name = this.CompoundIdentifier();
      return { type: "SqlDescribe", kind, name };
    }
    if (this.acceptKeyword("TABLE")) {
      const name = this.CompoundIdentifier();
      let extra = null;
      if (this.peek().type === "IDENT") {
        extra = this.SimpleIdentifier();
      }
      return { type: "SqlDescribe", kind: "TABLE", name, extra };
    }
    if (this.acceptKeyword("STATEMENT")) {
      const stmt = this.SqlQueryOrDml();
      return { type: "SqlDescribe", kind: "STATEMENT", stmt };
    }
    const name = this.CompoundIdentifier();
    let extra = null;
    if (this.peek().type === "IDENT") {
      extra = this.SimpleIdentifier();
    }
    return { type: "SqlDescribe", kind: "DEFAULT", name, extra };
  }

  SqlProcedureCall() {
    this.expectKeyword("CALL");
    const call = this.NamedRoutineCall();
    return { type: "SqlProcedureCall", call };
  }

  SqlInsert() {
    let mode;
    if (this.acceptKeyword("INSERT")) mode = "INSERT";
    else if (this.acceptKeyword("UPSERT")) mode = "UPSERT";
    else throw new Error("Invalid SqlInsert");
    const keywords = this.SqlInsertKeywords();
    this.expectKeyword("INTO");
    const table = this.CompoundTableIdentifier();
    let hints = null;
    if (this.isTableHintsStart()) {
      hints = this.TableHints();
    }
    let extend = null;
    if (this.isKeyword("EXTEND")) {
      extend = this.ExtendTable();
    }
    let columns = null;
    if (this.isSymbol("(")) {
      columns = this.ParenthesizedCompoundIdentifierList();
    }
    const source = this.OrderedQueryOrExpr();
    return { type: "SqlInsert", mode, keywords, table, hints, extend, columns, source };
  }

  SqlInsertKeywords() {
    return { type: "SqlInsertKeywords" };
  }

  SqlDelete() {
    this.expectKeyword("DELETE");
    this.expectKeyword("FROM");
    const table = this.CompoundTableIdentifier();
    let hints = null;
    if (this.isTableHintsStart()) {
      hints = this.TableHints();
    }
    let extend = null;
    if (this.isKeyword("EXTEND")) {
      extend = this.ExtendTable();
    }
    let alias = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
    }
    let where = null;
    if (this.isKeyword("WHERE")) {
      where = this.Where();
    }
    return { type: "SqlDelete", table, hints, extend, alias, where };
  }

  SqlUpdate() {
    this.expectKeyword("UPDATE");
    const table = this.CompoundTableIdentifier();
    let hints = null;
    if (this.isTableHintsStart()) {
      hints = this.TableHints();
    }
    let extend = null;
    if (this.isKeyword("EXTEND")) {
      extend = this.ExtendTable();
    }
    let alias = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
    }
    this.expectKeyword("SET");
    const assignments = [];
    const first = this.CompoundIdentifier();
    this.expectSymbol("=");
    const firstExpr = this.Expression();
    assignments.push({ target: first, expr: firstExpr });
    while (this.acceptSymbol(",")) {
      const target = this.CompoundIdentifier();
      this.expectSymbol("=");
      const expr = this.Expression();
      assignments.push({ target, expr });
    }
    let where = null;
    if (this.isKeyword("WHERE")) {
      where = this.Where();
    }
    return { type: "SqlUpdate", table, hints, extend, alias, assignments, where };
  }

  SqlMerge() {
    this.expectKeyword("MERGE");
    this.expectKeyword("INTO");
    const table = this.CompoundTableIdentifier();
    let hints = null;
    if (this.isTableHintsStart()) {
      hints = this.TableHints();
    }
    let extend = null;
    if (this.isKeyword("EXTEND")) {
      extend = this.ExtendTable();
    }
    let alias = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
    }
    this.expectKeyword("USING");
    const using = this.TableRef();
    this.expectKeyword("ON");
    const on = this.Expression();
    let matched = null;
    let notMatched = null;
    if (this.isKeyword("WHEN")) {
      matched = this.WhenMatchedClause();
      if (this.isKeyword("WHEN")) {
        notMatched = this.WhenNotMatchedClause();
      }
    } else {
      notMatched = this.WhenNotMatchedClause();
    }
    return { type: "SqlMerge", table, hints, extend, alias, using, on, matched, notMatched };
  }

  WhenMatchedClause() {
    this.expectKeyword("WHEN");
    this.expectKeyword("MATCHED");
    this.expectKeyword("THEN");
    this.expectKeyword("UPDATE");
    this.expectKeyword("SET");
    const assignments = [];
    const first = this.CompoundIdentifier();
    this.expectSymbol("=");
    const firstExpr = this.Expression();
    assignments.push({ target: first, expr: firstExpr });
    while (this.acceptSymbol(",")) {
      const target = this.CompoundIdentifier();
      this.expectSymbol("=");
      const expr = this.Expression();
      assignments.push({ target, expr });
    }
    return { type: "WhenMatchedClause", assignments };
  }

  WhenNotMatchedClause() {
    this.expectKeyword("WHEN");
    this.expectKeyword("NOT");
    this.expectKeyword("MATCHED");
    this.expectKeyword("THEN");
    this.expectKeyword("INSERT");
    const keywords = this.SqlInsertKeywords();
    let columns = null;
    if (this.isSymbol("(")) {
      columns = this.ParenthesizedSimpleIdentifierList();
    }
    let values;
    if (this.acceptKeyword("VALUES")) {
      values = this.RowConstructor();
    } else {
      this.expectSymbol("(");
      this.expectKeyword("VALUES");
      values = this.RowConstructor();
      this.expectSymbol(")");
    }
    return { type: "WhenNotMatchedClause", keywords, columns, values };
  }

  OrderedQueryOrExpr() {
    const query = this.QueryOrExpr();
    const orderByLimitOpt = this.OrderByLimitOpt();
    return { type: "OrderedQueryOrExpr", query, orderByLimitOpt };
  }

  QueryOrExpr() {
    const withList = this.isKeyword("WITH") ? this.WithList() : null;
    const leaf = this.LeafQueryOrExpr();
    const setOps = [];
    while (this.isKeyword("UNION") || this.isKeyword("INTERSECT") || this.isKeyword("EXCEPT")) {
      setOps.push(this.AddSetOpQuery());
    }
    return { type: "QueryOrExpr", withList, leaf, setOps };
  }

  OrderByLimitOpt() {
    const orderBy = this.isKeyword("ORDER") ? this.OrderBy() : null;
    let limit = null;
    let offset = null;
    let fetch = null;
    if (this.isKeyword("LIMIT")) {
      limit = this.LimitClause();
      if (this.isKeyword("OFFSET")) {
        offset = this.OffsetClause();
      }
    } else if (this.isKeyword("OFFSET")) {
      offset = this.OffsetClause();
      if (this.isKeyword("LIMIT")) {
        limit = this.LimitClause();
      } else if (this.isKeyword("FETCH")) {
        fetch = this.FetchClause();
      }
    } else if (this.isKeyword("FETCH")) {
      fetch = this.FetchClause();
    }
    return { type: "OrderByLimitOpt", orderBy, limit, offset, fetch };
  }

  LeafQueryOrExpr() {
    if (this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
      return this.LeafQuery();
    }
    return this.Expression();
  }

  LeafQuery() {
    if (this.isKeyword("SELECT")) {
      return this.SqlSelect();
    }
    if (this.isKeyword("VALUES") || this.isKeyword("VALUE")) {
      return this.TableConstructor();
    }
    if (this.isKeyword("TABLE")) {
      return this.ExplicitTable();
    }
    throw new Error("Invalid LeafQuery");
  }

  ExplicitTable() {
    this.expectKeyword("TABLE");
    const name = this.CompoundIdentifier();
    return { type: "ExplicitTable", name };
  }

  TableConstructor() {
    if (this.acceptKeyword("VALUES")) {
      const rows = [this.RowConstructor()];
      while (this.acceptSymbol(",")) {
        rows.push(this.RowConstructor());
      }
      return { type: "TableConstructor", kind: "VALUES", rows };
    }
    if (this.acceptKeyword("VALUE")) {
      const rows = [this.RowConstructor()];
      while (this.acceptSymbol(",")) {
        rows.push(this.RowConstructor());
      }
      return { type: "TableConstructor", kind: "VALUE", rows };
    }
    throw new Error("Invalid TableConstructor");
  }

  RowConstructor() {
    if (this.isSymbol("(") && this.isKeywordAt("ROW", 1)) {
      this.expectSymbol("(");
      this.expectKeyword("ROW");
      const list = this.ParenthesizedQueryOrCommaListWithDefault();
      this.expectSymbol(")");
      return { type: "RowConstructor", kind: "PAREN_ROW", list };
    }
    if (this.acceptKeyword("ROW")) {
      const list = this.ParenthesizedQueryOrCommaListWithDefault();
      return { type: "RowConstructor", kind: "ROW", list };
    }
    if (this.isSymbol("(")) {
      const list = this.ParenthesizedQueryOrCommaListWithDefault();
      return { type: "RowConstructor", kind: "PAREN", list };
    }
    const expr = this.Expression();
    return { type: "RowConstructor", kind: "EXPR", expr };
  }

  WithList() {
    this.expectKeyword("WITH");
    const recursive = Boolean(this.acceptKeyword("RECURSIVE"));
    const items = [this.AddWithItem()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddWithItem());
    }
    return { type: "WithList", recursive, items };
  }

  SqlSelect() {
    this.expectKeyword("SELECT");
    let hints = null;
    if (this.isTableHintsStart()) {
      hints = this.TableHints();
    }
    const stream = Boolean(this.acceptKeyword("STREAM"));
    let setQuantifier = null;
    if (this.acceptKeyword("ALL")) setQuantifier = "ALL";
    else if (this.acceptKeyword("DISTINCT")) setQuantifier = "DISTINCT";
    const selectItems = [this.AddSelectItem()];
    while (this.acceptSymbol(",")) {
      selectItems.push(this.AddSelectItem());
    }
    let from = null;
    let where = null;
    let groupBy = null;
    let having = null;
    let window = null;
    let qualify = null;
    if (this.acceptKeyword("FROM")) {
      from = this.FromClause();
      if (this.isKeyword("WHERE")) where = this.Where();
      if (this.isKeyword("GROUP")) groupBy = this.GroupBy();
      if (this.isKeyword("HAVING")) having = this.Having();
      if (this.isKeyword("WINDOW")) window = this.Window();
      if (this.isKeyword("QUALIFY")) qualify = this.Qualify();
    }
    return {
      type: "SqlSelect",
      hints,
      stream,
      setQuantifier,
      selectItems,
      from,
      where,
      groupBy,
      having,
      window,
      qualify,
    };
  }

  SelectExpression() {
    if (this.acceptSymbol("*")) {
      return { type: "SelectExpression", star: true };
    }
    return this.Expression();
  }

  GroupingElementList() {
    const items = [this.AddGroupingElement()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddGroupingElement());
    }
    return { type: "GroupingElementList", items };
  }

  WindowSpecification() {
    this.expectSymbol("(");
    let name = null;
    if (this.peek().type === "IDENT") {
      name = this.SimpleIdentifier();
    }
    let partitionBy = null;
    if (this.acceptKeyword("PARTITION")) {
      this.expectKeyword("BY");
      partitionBy = this.ExpressionCommaList();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) {
      orderBy = this.OrderBy();
    }
    let frame = null;
    if (this.acceptKeyword("ROWS") || this.acceptKeyword("RANGE")) {
      const kind = String(this.tokens[this.pos - 1].value).toUpperCase();
      if (this.acceptKeyword("BETWEEN")) {
        const start = this.WindowRange();
        this.expectKeyword("AND");
        const end = this.WindowRange();
        frame = { kind, between: true, start, end };
      } else {
        const start = this.WindowRange();
        frame = { kind, between: false, start };
      }
      const exclusion = this.WindowExclusion();
      frame.exclusion = exclusion;
    }
    let partial = null;
    if (this.acceptKeyword("ALLOW") || this.acceptKeyword("DISALLOW")) {
      const mode = String(this.tokens[this.pos - 1].value).toUpperCase();
      this.expectKeyword("PARTIAL");
      partial = mode;
    }
    this.expectSymbol(")");
    return { type: "WindowSpecification", name, partitionBy, orderBy, frame, partial };
  }

  WindowRange() {
    if (this.acceptKeyword("CURRENT")) {
      this.expectKeyword("ROW");
      return { type: "WindowRange", kind: "CURRENT ROW" };
    }
    if (this.acceptKeyword("UNBOUNDED")) {
      if (this.acceptKeyword("PRECEDING")) return { type: "WindowRange", kind: "UNBOUNDED PRECEDING" };
      if (this.acceptKeyword("FOLLOWING")) return { type: "WindowRange", kind: "UNBOUNDED FOLLOWING" };
    }
    const expr = this.Expression();
    if (this.acceptKeyword("PRECEDING")) return { type: "WindowRange", kind: "PRECEDING", expr };
    if (this.acceptKeyword("FOLLOWING")) return { type: "WindowRange", kind: "FOLLOWING", expr };
    throw new Error("Invalid WindowRange");
  }

  WindowExclusion() {
    if (this.acceptKeyword("EXCLUDE")) {
      if (this.acceptKeyword("CURRENT")) { this.expectKeyword("ROW"); return { type: "WindowExclusion", value: "CURRENT ROW" }; }
      if (this.acceptKeyword("NO")) { this.expectKeyword("OTHERS"); return { type: "WindowExclusion", value: "NO OTHERS" }; }
      if (this.acceptKeyword("GROUP")) return { type: "WindowExclusion", value: "GROUP" };
      if (this.acceptKeyword("TIES")) return { type: "WindowExclusion", value: "TIES" };
    }
    return { type: "WindowExclusion", value: "NO OTHERS" };
  }

  OrderBy() {
    this.expectKeyword("ORDER");
    this.expectKeyword("BY");
    const list = this.OrderItemList();
    return { type: "OrderBy", list };
  }

  OrderItemList() {
    const items = [this.AddOrderItem()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddOrderItem());
    }
    return { type: "OrderItemList", items };
  }

  LimitClause() {
    this.expectKeyword("LIMIT");
    let value = null;
    let offset = null;
    if (this.isSymbol(",")) {
      // LIMIT , offset not allowed; keep for strictness
    }
    const first = this.acceptKeyword("ALL") ? { type: "Keyword", value: "ALL" } : this.UnsignedNumericLiteralOrParam();
    if (this.acceptSymbol(",")) {
      const second = this.acceptKeyword("ALL") ? { type: "Keyword", value: "ALL" } : this.UnsignedNumericLiteralOrParam();
      offset = first;
      value = second;
    } else {
      value = first;
    }
    return { type: "LimitClause", value, offset };
  }

  OffsetClause() {
    this.expectKeyword("OFFSET");
    const value = this.UnsignedNumericLiteralOrParam();
    let rows = null;
    if (this.acceptKeyword("ROW")) rows = "ROW";
    else if (this.acceptKeyword("ROWS")) rows = "ROWS";
    return { type: "OffsetClause", value, rows };
  }

  FetchClause() {
    this.expectKeyword("FETCH");
    let mode;
    if (this.acceptKeyword("FIRST")) mode = "FIRST";
    else if (this.acceptKeyword("NEXT")) mode = "NEXT";
    else throw new Error("Invalid FetchClause");
    const value = this.UnsignedNumericLiteralOrParam();
    let rows;
    if (this.acceptKeyword("ROW")) rows = "ROW";
    else if (this.acceptKeyword("ROWS")) rows = "ROWS";
    else throw new Error("Invalid FetchClause");
    this.expectKeyword("ONLY");
    return { type: "FetchClause", mode, value, rows };
  }

  FromClause() {
    const first = this.TableRef();
    const joins = [];
    while (true) {
      const save = this.pos;
      const j = this.JoinOrCommaTable();
      if (!j) {
        this.pos = save;
        break;
      }
      joins.push(j);
    }
    return { type: "FromClause", first, joins };
  }

  JoinOrCommaTable() {
    if (this.acceptSymbol(",")) {
      const table = this.TableRef();
      return { type: "CommaJoin", table };
    }
    if (this.isKeyword("CROSS") && this.isKeywordAt("APPLY", 1)) {
      this.expectKeyword("CROSS");
      this.expectKeyword("APPLY");
      const table = this.TableRef();
      return { type: "ApplyJoin", kind: "CROSS", table };
    }
    if (this.isKeyword("OUTER") && this.isKeywordAt("APPLY", 1)) {
      this.expectKeyword("OUTER");
      this.expectKeyword("APPLY");
      const table = this.TableRef();
      return { type: "ApplyJoin", kind: "OUTER", table };
    }
    if (this.isKeyword("NATURAL") || this.isJoinTypeStart()) {
      return this.JoinTable();
    }
    return null;
  }

  JoinType() {
    if (this.acceptKeyword("JOIN")) return "JOIN";
    if (this.acceptKeyword("INNER")) { this.expectKeyword("JOIN"); return "INNER JOIN"; }
    if (this.acceptKeyword("LEFT")) {
      let suffix = "";
      if (this.acceptKeyword("OUTER")) suffix = " OUTER";
      else if (this.acceptKeyword("ASOF")) suffix = " ASOF";
      this.expectKeyword("JOIN");
      return `LEFT${suffix} JOIN`;
    }
    if (this.acceptKeyword("RIGHT")) {
      let suffix = "";
      if (this.acceptKeyword("OUTER")) suffix = " OUTER";
      this.expectKeyword("JOIN");
      return `RIGHT${suffix} JOIN`;
    }
    if (this.acceptKeyword("FULL")) {
      let suffix = "";
      if (this.acceptKeyword("OUTER")) suffix = " OUTER";
      this.expectKeyword("JOIN");
      return `FULL${suffix} JOIN`;
    }
    if (this.acceptKeyword("CROSS")) { this.expectKeyword("JOIN"); return "CROSS JOIN"; }
    if (this.acceptKeyword("ASOF")) { this.expectKeyword("JOIN"); return "ASOF JOIN"; }
    throw new Error("Invalid JoinType");
  }

  JoinTable() {
    let natural = false;
    if (this.acceptKeyword("NATURAL")) natural = true;
    const joinType = this.JoinType();
    const table = this.TableRef();
    let condition = null;
    if (this.acceptKeyword("ON")) {
      condition = { type: "On", expr: this.Expression() };
    } else if (this.acceptKeyword("USING")) {
      condition = { type: "Using", columns: this.ParenthesizedSimpleIdentifierList() };
    }
    return { type: "JoinTable", natural, joinType, table, condition };
  }

  TableRef() {
    return this.TableRef3();
  }

  TableRef1() {
    return this.TableRef3();
  }

  TableRef2() {
    return this.TableRef3();
  }

  TableRef3() {
    let base;
    if (this.acceptKeyword("LATERAL")) {
      if (this.isSymbol("(")) {
        this.expectSymbol("(");
        const query = this.OrderedQueryOrExpr();
        this.expectSymbol(")");
        base = { type: "LateralSubquery", query };
      } else if (this.acceptKeyword("UNNEST")) {
        this.expectSymbol("(");
        const items = this.ExpressionCommaList();
        this.expectSymbol(")");
        const withOrdinality = Boolean(this.acceptKeyword("WITH") && this.acceptKeyword("ORDINALITY"));
        base = { type: "LateralUnnest", items, withOrdinality };
      } else {
        base = { type: "LateralTableFunction", call: this.TableFunctionCall() };
      }
    } else if (this.isSymbol("(")) {
      this.expectSymbol("(");
      const query = this.OrderedQueryOrExpr();
      this.expectSymbol(")");
      base = { type: "Subquery", query };
    } else if (this.isKeyword("UNNEST")) {
      this.expectKeyword("UNNEST");
      this.expectSymbol("(");
      const items = this.ExpressionCommaList();
      this.expectSymbol(")");
      const withOrdinality = Boolean(this.acceptKeyword("WITH") && this.acceptKeyword("ORDINALITY"));
      base = { type: "Unnest", items, withOrdinality };
    } else if (this.isKeyword("TABLE")) {
      base = { type: "TableFunctionCall", call: this.TableFunctionCall() };
    } else if (this.peek().type === "IDENT") {
      const name = this.CompoundTableIdentifier();
      if (this.isSymbol("(")) {
        const args = [];
        this.expectSymbol("(");
        if (!this.isSymbol(")")) {
          args.push(this.AddArg0());
          while (this.acceptSymbol(",")) {
            args.push(this.AddArg());
          }
        }
        this.expectSymbol(")");
        base = { type: "ImplicitTableFunctionCall", name, args };
      } else {
        base = { type: "TableName", name };
      }
    } else {
      base = this.ExtendedTableRef();
    }
    // modifiers
    let pivot = null;
    if (this.isKeyword("PIVOT")) pivot = this.Pivot();
    let unpivot = null;
    if (this.isKeyword("UNPIVOT")) unpivot = this.Unpivot();
    // alias
    let alias = null;
    let columns = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
      if (this.isSymbol("(")) {
        columns = this.ParenthesizedSimpleIdentifierList();
      }
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
      if (this.isSymbol("(")) {
        columns = this.ParenthesizedSimpleIdentifierList();
      }
    }
    let tablesample = null;
    if (this.isKeyword("TABLESAMPLE")) {
      tablesample = this.Tablesample();
    }
    return { type: "TableRef", base, pivot, unpivot, alias, columns, tablesample };
  }

  Snapshot() {
    this.expectKeyword("FOR");
    this.expectKeyword("SYSTEM_TIME");
    this.expectKeyword("AS");
    this.expectKeyword("OF");
    const expr = this.Expression();
    return { type: "Snapshot", expr };
  }

  ExtendTable() {
    this.acceptKeyword("EXTEND");
    const list = this.ExtendList();
    return { type: "ExtendTable", list };
  }

  ExtendList() {
    this.expectSymbol("(");
    const items = [this.AddColumnType()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddColumnType());
    }
    this.expectSymbol(")");
    return { type: "ExtendList", items };
  }

  Tablesample() {
    this.expectKeyword("TABLESAMPLE");
    if (this.acceptKeyword("SUBSTITUTE")) {
      this.expectSymbol("(");
      const literal = this.StringLiteral();
      this.expectSymbol(")");
      return { type: "Tablesample", kind: "SUBSTITUTE", literal };
    }
    let kind;
    if (this.acceptKeyword("BERNOULLI")) kind = "BERNOULLI";
    else if (this.acceptKeyword("SYSTEM")) kind = "SYSTEM";
    else throw new Error("Invalid Tablesample");
    this.expectSymbol("(");
    const percentage = this.UnsignedNumericLiteral();
    this.expectSymbol(")");
    let repeatable = null;
    if (this.acceptKeyword("REPEATABLE")) {
      this.expectSymbol("(");
      repeatable = this.IntLiteral();
      this.expectSymbol(")");
    }
    return { type: "Tablesample", kind, percentage, repeatable };
  }

  Pivot() {
    this.expectKeyword("PIVOT");
    this.expectSymbol("(");
    const aggs = [this.AddPivotAgg()];
    while (this.acceptSymbol(",")) {
      aggs.push(this.AddPivotAgg());
    }
    this.expectKeyword("FOR");
    const axis = this.SimpleIdentifierOrList();
    this.expectKeyword("IN");
    this.expectSymbol("(");
    const values = [this.AddPivotValue()];
    while (this.acceptSymbol(",")) {
      values.push(this.AddPivotValue());
    }
    this.expectSymbol(")");
    this.expectSymbol(")");
    return { type: "Pivot", aggs, axis, values };
  }

  Unpivot() {
    this.expectKeyword("UNPIVOT");
    let nulls = null;
    if (this.acceptKeyword("INCLUDE")) {
      this.expectKeyword("NULLS");
      nulls = "INCLUDE";
    } else if (this.acceptKeyword("EXCLUDE")) {
      this.expectKeyword("NULLS");
      nulls = "EXCLUDE";
    }
    this.expectSymbol("(");
    const columns = this.SimpleIdentifierOrList();
    this.expectKeyword("FOR");
    const axis = this.SimpleIdentifierOrList();
    this.expectKeyword("IN");
    this.expectSymbol("(");
    const values = [this.AddUnpivotValue()];
    while (this.acceptSymbol(",")) {
      values.push(this.AddUnpivotValue());
    }
    this.expectSymbol(")");
    this.expectSymbol(")");
    return { type: "Unpivot", nulls, columns, axis, values };
  }

  MatchRecognize() {
    this.expectKeyword("MATCH_RECOGNIZE");
    this.expectSymbol("(");
    let partitionBy = null;
    if (this.acceptKeyword("PARTITION")) {
      this.expectKeyword("BY");
      partitionBy = this.ExpressionCommaList();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) orderBy = this.OrderBy();
    let measures = null;
    if (this.acceptKeyword("MEASURES")) {
      measures = [this.AddMeasureColumn()];
      while (this.acceptSymbol(",")) {
        measures.push(this.AddMeasureColumn());
      }
    }
    let rowsPerMatch = null;
    if (this.acceptKeyword("ONE")) {
      this.expectKeyword("ROW");
      this.expectKeyword("PER");
      this.expectKeyword("MATCH");
      rowsPerMatch = "ONE ROW";
    } else if (this.acceptKeyword("ALL")) {
      this.expectKeyword("ROWS");
      this.expectKeyword("PER");
      this.expectKeyword("MATCH");
      rowsPerMatch = "ALL ROWS";
    }
    let afterMatchSkip = null;
    if (this.acceptKeyword("AFTER")) {
      this.expectKeyword("MATCH");
      this.expectKeyword("SKIP");
      if (this.acceptKeyword("PAST")) {
        this.expectKeyword("LAST");
        this.expectKeyword("ROW");
        afterMatchSkip = { kind: "PAST LAST ROW" };
      } else if (this.acceptKeyword("TO")) {
        if (this.acceptKeyword("NEXT")) {
          this.expectKeyword("ROW");
          afterMatchSkip = { kind: "TO NEXT ROW" };
        } else if (this.acceptKeyword("FIRST")) {
          const name = this.SimpleIdentifier();
          afterMatchSkip = { kind: "TO FIRST", name };
        } else {
          const last = Boolean(this.acceptKeyword("LAST"));
          const name = this.SimpleIdentifier();
          afterMatchSkip = { kind: last ? "TO LAST" : "TO", name };
        }
      }
    }
    this.expectKeyword("PATTERN");
    this.expectSymbol("(");
    const anchorStart = Boolean(this.acceptSymbol("^"));
    const pattern = this.PatternExpression();
    const anchorEnd = Boolean(this.acceptSymbol("$"));
    this.expectSymbol(")");
    let within = null;
    if (this.acceptKeyword("WITHIN")) {
      within = this.IntervalLiteral();
    }
    let subsets = null;
    if (this.acceptKeyword("SUBSET")) {
      subsets = [this.AddSubsetDefinition()];
      while (this.acceptSymbol(",")) {
        subsets.push(this.AddSubsetDefinition());
      }
    }
    this.expectKeyword("DEFINE");
    const define = [this.PatternDefinition()];
    while (this.acceptSymbol(",")) {
      define.push(this.PatternDefinition());
    }
    this.expectSymbol(")");
    return { type: "MatchRecognize", partitionBy, orderBy, measures, rowsPerMatch, afterMatchSkip, pattern, anchorStart, anchorEnd, within, subsets, define };
  }

  Expression() {
    return this.Expression2();
  }

  Expression2() {
    let left = this.AddExpression2b();
    while (true) {
      // BinaryRowOperator
      {
        const save = this.pos;
        try {
          const opNode = this.BinaryRowOperator();
          if (!opNode) {
            this.pos = save;
          } else {
            const right = this.AddExpression2b();
            left = { type: "BinaryExpression", operator: opNode, left, right };
            continue;
          }
        } catch {
          this.pos = save;
        }
      }
      // [NOT] IN
      if ((this.isKeyword("IN")) || (this.isKeyword("NOT") && this.isKeywordAt("IN", 1))) {
        const not = Boolean(this.acceptKeyword("NOT"));
        this.expectKeyword("IN");
        this.expectSymbol("(");
        let source;
        if (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
          source = this.OrderedQueryOrExpr();
        } else {
          source = this.ExpressionCommaList();
        }
        this.expectSymbol(")");
        left = { type: "InPredicate", not, left, source };
        continue;
      }
      // comp (SOME|ANY|ALL) ( ... )
      if (this.isComparisonOperatorAt(0) && this.isKeywordAt("SOME", 1)) {
        const op = this.next().value;
        this.expectKeyword("SOME");
        this.expectSymbol("(");
        const source = this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")
          ? this.OrderedQueryOrExpr()
          : this.ExpressionCommaList();
        this.expectSymbol(")");
        left = { type: "QuantifiedComparison", quantifier: "SOME", operator: op, left, source };
        continue;
      }
      if (this.isComparisonOperatorAt(0) && this.isKeywordAt("ANY", 1)) {
        const op = this.next().value;
        this.expectKeyword("ANY");
        this.expectSymbol("(");
        const source = this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")
          ? this.OrderedQueryOrExpr()
          : this.ExpressionCommaList();
        this.expectSymbol(")");
        left = { type: "QuantifiedComparison", quantifier: "ANY", operator: op, left, source };
        continue;
      }
      if (this.isComparisonOperatorAt(0) && this.isKeywordAt("ALL", 1)) {
        const op = this.next().value;
        this.expectKeyword("ALL");
        this.expectSymbol("(");
        const source = this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")
          ? this.OrderedQueryOrExpr()
          : this.ExpressionCommaList();
        this.expectSymbol(")");
        left = { type: "QuantifiedComparison", quantifier: "ALL", operator: op, left, source };
        continue;
      }
      // [NOT] BETWEEN
      if (this.isKeyword("BETWEEN") || (this.isKeyword("NOT") && this.isKeywordAt("BETWEEN", 1))) {
        const not = Boolean(this.acceptKeyword("NOT"));
        this.expectKeyword("BETWEEN");
        let symmetric = null;
        if (this.acceptKeyword("SYMMETRIC")) symmetric = "SYMMETRIC";
        else if (this.acceptKeyword("ASYMMETRIC")) symmetric = "ASYMMETRIC";
        const lower = this.AddExpression2b();
        this.expectKeyword("AND");
        const upper = this.AddExpression2b();
        left = { type: "BetweenPredicate", not, symmetric, left, lower, upper };
        continue;
      }
      // [NOT] LIKE/ILIKE/RLIKE/SIMILAR TO
      if (this.isKeyword("LIKE") ||
          this.isKeyword("ILIKE") ||
          this.isKeyword("RLIKE") ||
          (this.isKeyword("SIMILAR") && this.isKeywordAt("TO", 1)) ||
          (this.isKeyword("NOT") && (this.isKeywordAt("LIKE", 1) || this.isKeywordAt("ILIKE", 1) || this.isKeywordAt("RLIKE", 1) || (this.isKeywordAt("SIMILAR", 1) && this.isKeywordAt("TO", 2))))) {
        const not = Boolean(this.acceptKeyword("NOT"));
        let operator;
        if (this.acceptKeyword("LIKE")) operator = "LIKE";
        else if (this.acceptKeyword("ILIKE")) operator = "ILIKE";
        else if (this.acceptKeyword("RLIKE")) operator = "RLIKE";
        else {
          this.expectKeyword("SIMILAR");
          this.expectKeyword("TO");
          operator = "SIMILAR TO";
        }
        const pattern = this.AddExpression2b();
        let escape = null;
        if (this.acceptKeyword("ESCAPE")) {
          escape = this.Expression3();
        }
        left = { type: "LikePredicate", not, operator, left, pattern, escape };
        continue;
      }
      // Item access: [ OFFSET/ORDINAL/... ] or [ expr ] .ident*
      if (this.isSymbol("[")) {
        this.expectSymbol("[");
        let kind = null;
        let indexExpr = null;
        if (this.acceptKeyword("OFFSET")) kind = "OFFSET";
        else if (this.acceptKeyword("ORDINAL")) kind = "ORDINAL";
        else if (this.acceptKeyword("SAFE_OFFSET")) kind = "SAFE_OFFSET";
        else if (this.acceptKeyword("SAFE_ORDINAL")) kind = "SAFE_ORDINAL";
        if (kind) {
          this.expectSymbol("(");
          indexExpr = this.Expression();
          this.expectSymbol(")");
        } else {
          indexExpr = this.Expression();
        }
        this.expectSymbol("]");
        const accessors = [];
        while (this.acceptSymbol(".")) {
          accessors.push(this.SimpleIdentifier());
        }
        left = { type: "ItemAccess", left, kind, indexExpr, accessors };
        continue;
      }
      // PostfixRowOperator
      if (this.isKeyword("IS") || this.isKeyword("FORMAT")) {
        const postfix = this.PostfixRowOperator();
        left = { type: "PostfixExpression", left, postfix };
        continue;
      }
      // BinaryRowOperator (fallback)
      if (this.isBinaryOperator()) {
        const op = this.readBinaryOperator();
        const right = this.AddExpression2b();
        left = { type: "BinaryExpression", operator: op, left, right };
        continue;
      }
      break;
    }
    return left;
  }

  RowExpressionExtension() {
    const id = this.SimpleIdentifier();
    if (this.acceptSymbol("(")) {
      if (this.acceptSymbol("*")) {
        this.expectSymbol(")");
        return { type: "RowExpressionExtension", id, callType: "STAR", args: null };
      }
      if (this.acceptSymbol(")")) {
        return { type: "RowExpressionExtension", id, callType: "EMPTY", args: [] };
      }
      this.pos--;
      const args = this.FunctionParameterList();
      return { type: "RowExpressionExtension", id, callType: "PARAMS", args };
    }
    return { type: "RowExpressionExtension", id, callType: null, args: null };
  }

  BinaryRowOperator() {
    const t = this.peek();
    if (t.type === "SYMBOL") {
      const op = t.value;
      const ops = ["=", "<<", ">", "<", "<=", ">=", "<>", "!=", "+", "-", "*", "/", "%", "||", "^", "&"];
      if (ops.includes(op)) {
        this.next();
        return { type: "BinaryRowOperator", op };
      }
    }
    if (this.acceptKeyword("AND")) return { type: "BinaryRowOperator", op: "AND" };
    if (this.acceptKeyword("OR")) return { type: "BinaryRowOperator", op: "OR" };
    if (this.acceptKeyword("IS")) {
      let not = false;
      if (this.acceptKeyword("NOT")) not = true;
      this.expectKeyword("DISTINCT");
      this.expectKeyword("FROM");
      return { type: "BinaryRowOperator", op: not ? "IS NOT DISTINCT FROM" : "IS DISTINCT FROM" };
    }
    if (this.acceptKeyword("MEMBER")) {
      this.expectKeyword("OF");
      return { type: "BinaryRowOperator", op: "MEMBER OF" };
    }
    if (this.acceptKeyword("SUBMULTISET")) {
      this.expectKeyword("OF");
      return { type: "BinaryRowOperator", op: "SUBMULTISET OF" };
    }
    if (this.acceptKeyword("NOT")) {
      if (this.acceptKeyword("SUBMULTISET")) {
        this.expectKeyword("OF");
        return { type: "BinaryRowOperator", op: "NOT SUBMULTISET OF" };
      }
      return this.notImplemented("BinaryRowOperator");
    }
    if (this.acceptKeyword("CONTAINS")) return { type: "BinaryRowOperator", op: "CONTAINS" };
    if (this.acceptKeyword("OVERLAPS")) return { type: "BinaryRowOperator", op: "OVERLAPS" };
    if (this.acceptKeyword("EQUALS")) return { type: "BinaryRowOperator", op: "EQUALS" };
    if (this.acceptKeyword("PRECEDES")) return { type: "BinaryRowOperator", op: "PRECEDES" };
    if (this.acceptKeyword("SUCCEEDS")) return { type: "BinaryRowOperator", op: "SUCCEEDS" };
    if (this.acceptKeyword("IMMEDIATELY")) {
      if (this.acceptKeyword("PRECEDES")) return { type: "BinaryRowOperator", op: "IMMEDIATELY PRECEDES" };
      if (this.acceptKeyword("SUCCEEDS")) return { type: "BinaryRowOperator", op: "IMMEDIATELY SUCCEEDS" };
    }
    const multiset = this.BinaryMultisetOperator();
    if (multiset) return multiset;
    return null;
  }

  BinaryMultisetOperator() {
    let kind;
    if (this.acceptKeyword("UNION")) kind = "UNION";
    else if (this.acceptKeyword("INTERSECT")) kind = "INTERSECT";
    else if (this.acceptKeyword("EXCEPT")) kind = "EXCEPT";
    else return null;
    let quantifier = null;
    if (this.acceptKeyword("ALL")) quantifier = "ALL";
    else if (this.acceptKeyword("DISTINCT")) quantifier = "DISTINCT";
    return { type: "BinaryMultisetOperator", kind, quantifier };
  }

  PrefixRowOperator() {
    if (this.acceptSymbol("+")) return "+";
    if (this.acceptSymbol("-")) return "-";
    if (this.acceptKeyword("NOT")) return "NOT";
    if (this.acceptKeyword("EXISTS")) return "EXISTS";
    if (this.acceptKeyword("UNIQUE")) return "UNIQUE";
    return null;
  }

  PostfixRowOperator() {
    if (this.acceptKeyword("IS")) {
      const not = Boolean(this.acceptKeyword("NOT"));
      if (this.acceptKeyword("NULL")) {
        return { type: "PostfixRowOperator", operator: "IS", not, value: "NULL" };
      }
      if (this.acceptKeyword("TRUE")) {
        return { type: "PostfixRowOperator", operator: "IS", not, value: "TRUE" };
      }
      if (this.acceptKeyword("FALSE")) {
        return { type: "PostfixRowOperator", operator: "IS", not, value: "FALSE" };
      }
      if (this.acceptKeyword("UNKNOWN")) {
        return { type: "PostfixRowOperator", operator: "IS", not, value: "UNKNOWN" };
      }
      if (this.acceptKeyword("A")) {
        this.expectKeyword("SET");
        return { type: "PostfixRowOperator", operator: "IS", not, value: "A SET" };
      }
      if (this.acceptKeyword("EMPTY")) {
        return { type: "PostfixRowOperator", operator: "IS", not, value: "EMPTY" };
      }
      if (this.acceptKeyword("JSON")) {
        let jsonType = null;
        if (this.acceptKeyword("VALUE")) jsonType = "VALUE";
        else if (this.acceptKeyword("OBJECT")) jsonType = "OBJECT";
        else if (this.acceptKeyword("ARRAY")) jsonType = "ARRAY";
        else if (this.acceptKeyword("SCALAR")) jsonType = "SCALAR";
        return { type: "PostfixRowOperator", operator: "IS", not, value: "JSON", jsonType };
      }
      return null;
    }
    if (this.acceptKeyword("FORMAT")) {
      const jsonRepresentation = this.JsonRepresentation();
      return { type: "PostfixRowOperator", operator: "FORMAT", jsonRepresentation };
    }
    return null;
  }

  Expression3() {
    if (this.isKeyword("CURSOR")) {
      return this.CursorExpression();
    }
    if (this.isKeyword("ROW")) {
      this.expectKeyword("ROW");
      this.expectSymbol("(");
      let node;
      if (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
        node = this.OrderedQueryOrExpr();
      } else {
        node = this.ExpressionCommaList();
      }
      this.expectSymbol(")");
      return { type: "RowExpression", node, explicit: true };
    }
    if (this.isSymbol("(")) {
      this.expectSymbol("(");
      let node;
      if (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
        node = this.OrderedQueryOrExpr();
      } else {
        node = this.ExpressionCommaList();
      }
      this.expectSymbol(")");
      return { type: "ParenExpression", node };
    }
    if (this.isLambdaStart()) {
      return this.LambdaExpression();
    }
    return this.AtomicRowExpression();
  }

  AtomicRowExpression() {
    const t = this.peek();
    if (this.isSymbol("{") && this.isKeywordAt("FN", 1)) {
      return this.JdbcFunctionCall();
    }
    if (this.isKeyword("CAST") || this.isKeyword("SAFE_CAST") || this.isKeyword("TRY_CAST") ||
        this.isKeyword("EXTRACT") || this.isKeyword("POSITION") || this.isKeyword("CONVERT") ||
        this.isKeyword("TRANSLATE") || this.isKeyword("OVERLAY") ||
        this.isKeyword("FLOOR") || this.isKeyword("CEIL") || this.isKeyword("CEILING") ||
        this.isKeyword("SUBSTRING") || this.isKeyword("TRIM") || this.isKeyword("CONTAINS_SUBSTR") ||
        this.isKeyword("JSON_EXISTS") || this.isKeyword("JSON_VALUE") || this.isKeyword("JSON_QUERY") ||
        this.isKeyword("JSON_OBJECT") || this.isKeyword("JSON_OBJECTAGG") ||
        this.isKeyword("JSON_ARRAY") || this.isKeyword("JSON_ARRAYAGG")) {
      return this.BuiltinFunctionCall();
    }
    if (this.isKeyword("DATE") || this.isKeyword("DATETIME") || this.isKeyword("TIME") ||
        this.isKeyword("TIMESTAMP") || this.isKeyword("UUID")) {
      if (this.peekN(1).type === "STRING") {
        return this.DateTimeLiteral();
      }
    }
    if (t.type === "IDENT" || this.isKeyword("SPECIFIC")) {
      const save = this.pos;
      const fn = this.NamedFunctionCall();
      if (fn) return fn;
      this.pos = save;
    }
    if (t.type === "STRING" || t.type === "NUMBER" ||
        this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN") || this.isKeyword("NULL") ||
        this.isKeyword("DECIMAL") || this.isKeyword("INTERVAL")) {
      return this.LiteralOrIntervalExpression();
    }
    if (this.isKeyword("MULTISET")) {
      return this.MultisetConstructor();
    }
    if (this.isKeyword("ARRAY")) {
      return this.ArrayConstructor();
    }
    if (this.isKeyword("MAP")) {
      return this.MapConstructor();
    }
    if (this.isKeyword("PERIOD")) {
      return this.PeriodConstructor();
    }
    if (this.isSymbol("?") || (this.isSymbol(":") && this.peekN(1).type === "NUMBER")) {
      return this.DynamicParam();
    }
    if (this.isKeyword("CURRENT_USER") || this.isKeyword("CURRENT_DATE") || this.isKeyword("CURRENT_TIME")) {
      return this.ContextVariable();
    }
    if (this.isSymbol("*")) {
      this.next();
      return { type: "Star" };
    }
    if (this.isKeyword("CASE")) {
      return this.CaseExpression();
    }
    if (this.isKeyword("NEW")) {
      return this.NewSpecification();
    }
    if (this.isKeyword("NEXT") || this.isKeyword("CURRENT")) {
      return this.SequenceExpression();
    }
    if (t.type === "IDENT") {
      return this.CompoundIdentifier();
    }
    throw new Error("Invalid AtomicRowExpression");
  }

  BuiltinFunctionCall() {
    if (this.acceptKeyword("CAST") || this.acceptKeyword("SAFE_CAST") || this.acceptKeyword("TRY_CAST")) {
      const keyword = String(this.tokens[this.pos - 1].value).toUpperCase();
      this.expectSymbol("(");
      const expr = this.Expression();
      this.expectKeyword("AS");
      let castType;
      if (this.acceptKeyword("INTERVAL")) {
        castType = { type: "IntervalType", qualifier: this.IntervalQualifier() };
      } else {
        castType = this.DataType();
      }
      let format = null;
      if (this.acceptKeyword("FORMAT")) {
        format = this.StringLiteral();
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword, expr, castType, format };
    }
    if (this.acceptKeyword("EXTRACT")) {
      this.expectSymbol("(");
      const unit = this.TimeUnitOrName();
      this.expectKeyword("FROM");
      const expr = this.Expression();
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "EXTRACT", unit, expr };
    }
    if (this.acceptKeyword("POSITION")) {
      this.expectSymbol("(");
      const needle = this.AtomicRowExpression();
      this.expectKeyword("IN");
      const haystack = this.Expression();
      let from = null;
      if (this.acceptKeyword("FROM")) {
        from = this.Expression();
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "POSITION", needle, haystack, from };
    }
    if (this.acceptKeyword("CONVERT")) {
      this.expectSymbol("(");
      let mode;
      let value;
      let using = null;
      let charset = null;
      let typeSpec = null;
      let expr = null;
      let extra = null;
      if (this.isKeyword("INTERVAL") || this.isTypeNameStart()) {
        mode = "TYPE";
        if (this.acceptKeyword("INTERVAL")) {
          typeSpec = { type: "IntervalType", qualifier: this.IntervalQualifier() };
        } else {
          typeSpec = this.DataType();
        }
        this.expectSymbol(",");
        expr = this.Expression();
        if (this.acceptSymbol(",")) {
          if (this.acceptKeyword("NULL")) {
            extra = { type: "NullLiteral" };
          } else {
            extra = this.UnsignedNumericLiteral();
          }
        }
      } else {
        value = this.Expression();
        if (this.acceptKeyword("USING")) {
          mode = "USING";
          using = this.SimpleIdentifier();
        } else if (this.acceptSymbol(",")) {
          mode = "CHARSET";
          charset = this.SimpleIdentifier();
          if (this.acceptSymbol(",")) {
            using = this.SimpleIdentifier();
          }
        }
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "CONVERT", mode, value, using, charset, typeSpec, expr, extra };
    }
    if (this.acceptKeyword("TRANSLATE")) {
      this.expectSymbol("(");
      const expr = this.Expression();
      let using = null;
      let args = [];
      if (this.acceptKeyword("USING")) {
        using = this.SimpleIdentifier();
      } else {
        while (this.acceptSymbol(",")) {
          args.push(this.Expression());
        }
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "TRANSLATE", expr, using, args };
    }
    if (this.acceptKeyword("OVERLAY")) {
      this.expectSymbol("(");
      const expr = this.Expression();
      this.expectKeyword("PLACING");
      const placing = this.Expression();
      this.expectKeyword("FROM");
      const from = this.Expression();
      let forExpr = null;
      if (this.acceptKeyword("FOR")) {
        forExpr = this.Expression();
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "OVERLAY", expr, placing, from, forExpr };
    }
    if (this.acceptKeyword("FLOOR") || this.acceptKeyword("CEIL") || this.acceptKeyword("CEILING")) {
      const keyword = String(this.tokens[this.pos - 1].value).toUpperCase();
      this.expectSymbol("(");
      const expr = this.Expression();
      let to = null;
      if (this.acceptKeyword("TO")) {
        to = this.TimeUnitOrName();
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword, expr, to };
    }
    if (this.acceptKeyword("SUBSTRING")) {
      this.expectSymbol("(");
      const expr = this.Expression();
      let from = null;
      let forExpr = null;
      if (this.acceptKeyword("FROM")) {
        from = this.Expression();
      } else if (this.acceptSymbol(",")) {
        from = this.Expression();
      }
      if (this.acceptKeyword("FOR")) {
        forExpr = this.Expression();
      } else if (this.acceptSymbol(",")) {
        forExpr = this.Expression();
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "SUBSTRING", expr, from, forExpr };
    }
    if (this.acceptKeyword("TRIM")) {
      this.expectSymbol("(");
      let spec = null;
      let trimChar = null;
      let from = null;
      if (this.acceptKeyword("BOTH") || this.acceptKeyword("TRAILING") || this.acceptKeyword("LEADING")) {
        spec = String(this.tokens[this.pos - 1].value).toUpperCase();
        if (!this.isKeyword("FROM")) {
          trimChar = this.Expression();
        }
        this.expectKeyword("FROM");
        from = this.Expression();
      } else {
        trimChar = this.Expression();
        if (this.acceptKeyword("FROM")) {
          from = this.Expression();
        }
      }
      this.expectSymbol(")");
      return { type: "BuiltinFunctionCall", keyword: "TRIM", spec, trimChar, from };
    }
    if (this.isKeyword("DATE") || this.isKeyword("TIME") || this.isKeyword("DATETIME") || this.isKeyword("TIMESTAMP")) {
      return this.DateTimeConstructorCall();
    }
    if (this.isKeyword("DATE_DIFF")) return this.DateDiffFunctionCall();
    if (this.isKeyword("TIMESTAMPADD")) return this.TimestampAddFunctionCall();
    if (this.isKeyword("TIMESTAMPDIFF")) return this.TimestampDiffFunctionCall();
    if (this.isKeyword("TIMESTAMP_DIFF")) return this.TimestampDiff3FunctionCall();
    if (this.isKeyword("DATETIME_DIFF")) return this.DatetimeDiffFunctionCall();
    if (this.isKeyword("DATE_TRUNC")) return this.DateTruncFunctionCall();
    if (this.isKeyword("DATETIME_TRUNC")) return this.DatetimeTruncFunctionCall();
    if (this.isKeyword("TIMESTAMP_TRUNC")) return this.TimestampTruncFunctionCall();
    if (this.isKeyword("TIME_DIFF")) return this.TimeDiffFunctionCall();
    if (this.isKeyword("TIME_TRUNC")) return this.TimeTruncFunctionCall();
    if (this.isKeyword("CONTAINS_SUBSTR")) {
      return this.ContainsSubstrFunctionCall();
    }
    if (this.isKeyword("JSON_EXISTS")) return this.JsonExistsFunctionCall();
    if (this.isKeyword("JSON_VALUE")) return this.JsonValueFunctionCall();
    if (this.isKeyword("JSON_QUERY")) return this.JsonQueryFunctionCall();
    if (this.isKeyword("JSON_OBJECT")) return this.JsonObjectFunctionCall();
    if (this.isKeyword("JSON_OBJECTAGG")) return this.JsonObjectAggFunctionCall();
    if (this.isKeyword("JSON_ARRAY")) return this.JsonArrayFunctionCall();
    if (this.isKeyword("JSON_ARRAYAGG")) return this.JsonArrayAggFunctionCall();
    if (this.isKeyword("MATCH_NUMBER") || this.isKeyword("CLASSIFIER") || this.isKeyword("FIRST") || this.isKeyword("LAST") ||
        this.isKeyword("PREV") || this.isKeyword("NEXT") || this.isKeyword("RUNNING") || this.isKeyword("FINAL")) {
      return this.MatchRecognizeFunctionCall();
    }
    return this.notImplemented("BuiltinFunctionCall");
  }

  JsonApiCommonSyntax() {
    const document = this.Expression();
    this.expectSymbol(",");
    const path = this.Expression();
    const passing = [];
    if (this.acceptKeyword("PASSING")) {
      const expr = this.Expression();
      this.expectKeyword("AS");
      const name = this.SimpleIdentifier();
      passing.push({ expr, name });
      while (this.acceptSymbol(",")) {
        const e = this.Expression();
        this.expectKeyword("AS");
        const n = this.SimpleIdentifier();
        passing.push({ expr: e, name: n });
      }
    }
    return { type: "JsonApiCommonSyntax", document, path, passing };
  }

  JsonReturningClause() {
    this.expectKeyword("RETURNING");
    const dataType = this.DataType();
    return { type: "JsonReturningClause", dataType };
  }

  JsonExistsFunctionCall() {
    this.expectKeyword("JSON_EXISTS");
    this.expectSymbol("(");
    const common = this.JsonApiCommonSyntax();
    let onError = null;
    if (this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN") || this.isKeyword("ERROR")) {
      const behavior = this.JsonExistsErrorBehavior();
      this.expectKeyword("ON");
      this.expectKeyword("ERROR");
      onError = behavior;
    }
    this.expectSymbol(")");
    return { type: "JsonExistsFunctionCall", common, onError };
  }

  JsonExistsErrorBehavior() {
    if (this.acceptKeyword("TRUE")) return "TRUE";
    if (this.acceptKeyword("FALSE")) return "FALSE";
    if (this.acceptKeyword("UNKNOWN")) return "UNKNOWN";
    if (this.acceptKeyword("ERROR")) return "ERROR";
    return this.notImplemented("JsonExistsErrorBehavior");
  }

  JsonValueFunctionCall() {
    this.expectKeyword("JSON_VALUE");
    this.expectSymbol("(");
    const common = this.JsonApiCommonSyntax();
    let returning = null;
    if (this.isKeyword("RETURNING")) {
      returning = this.JsonReturningClause();
    }
    const onEmpty = [];
    const onError = [];
    while (true) {
      const behavior = this.JsonValueEmptyOrErrorBehavior();
      if (!behavior) break;
      this.expectKeyword("ON");
      if (this.acceptKeyword("EMPTY")) {
        onEmpty.push(behavior);
      } else if (this.acceptKeyword("ERROR")) {
        onError.push(behavior);
      } else {
        break;
      }
    }
    this.expectSymbol(")");
    return { type: "JsonValueFunctionCall", common, returning, onEmpty, onError };
  }

  JsonValueEmptyOrErrorBehavior() {
    if (this.acceptKeyword("ERROR")) return { type: "JsonValueBehavior", kind: "ERROR" };
    if (this.acceptKeyword("NULL")) return { type: "JsonValueBehavior", kind: "NULL" };
    if (this.acceptKeyword("DEFAULT")) {
      const expr = this.Expression();
      return { type: "JsonValueBehavior", kind: "DEFAULT", expr };
    }
    return null;
  }

  JsonQueryFunctionCall() {
    this.expectKeyword("JSON_QUERY");
    this.expectSymbol("(");
    const common = this.JsonApiCommonSyntax();
    let returning = null;
    if (this.isKeyword("RETURNING")) {
      returning = this.JsonReturningClause();
    }
    let wrapper = null;
    if (this.isKeyword("WITHOUT") || this.isKeyword("WITH")) {
      wrapper = this.JsonQueryWrapperBehavior();
      this.expectKeyword("WRAPPER");
    }
    const onEmpty = [];
    const onError = [];
    while (true) {
      const behavior = this.JsonQueryEmptyOrErrorBehavior();
      if (!behavior) break;
      this.expectKeyword("ON");
      if (this.acceptKeyword("EMPTY")) {
        onEmpty.push(behavior);
      } else if (this.acceptKeyword("ERROR")) {
        onError.push(behavior);
      } else {
        break;
      }
    }
    this.expectSymbol(")");
    return { type: "JsonQueryFunctionCall", common, returning, wrapper, onEmpty, onError };
  }

  JsonQueryWrapperBehavior() {
    if (this.acceptKeyword("WITHOUT")) {
      const array = Boolean(this.acceptKeyword("ARRAY"));
      return { type: "JsonQueryWrapperBehavior", mode: "WITHOUT", array };
    }
    if (this.acceptKeyword("WITH")) {
      let conditional = null;
      if (this.acceptKeyword("CONDITIONAL")) conditional = "CONDITIONAL";
      else if (this.acceptKeyword("UNCONDITIONAL")) conditional = "UNCONDITIONAL";
      const array = Boolean(this.acceptKeyword("ARRAY"));
      return { type: "JsonQueryWrapperBehavior", mode: "WITH", conditional, array };
    }
    return this.notImplemented("JsonQueryWrapperBehavior");
  }

  JsonQueryEmptyOrErrorBehavior() {
    if (this.acceptKeyword("ERROR")) return { type: "JsonQueryBehavior", kind: "ERROR" };
    if (this.acceptKeyword("NULL")) return { type: "JsonQueryBehavior", kind: "NULL" };
    if (this.acceptKeyword("EMPTY")) {
      if (this.acceptKeyword("ARRAY")) return { type: "JsonQueryBehavior", kind: "EMPTY ARRAY" };
      if (this.acceptKeyword("OBJECT")) return { type: "JsonQueryBehavior", kind: "EMPTY OBJECT" };
    }
    return null;
  }

  JsonObjectFunctionCall() {
    this.expectKeyword("JSON_OBJECT");
    this.expectSymbol("(");
    const pairs = [];
    if (!this.isSymbol(")")) {
      pairs.push(this.JsonNameAndValue());
      while (this.acceptSymbol(",")) {
        pairs.push(this.JsonNameAndValue());
      }
    }
    const nullClause = this.JsonConstructorNullClause();
    this.expectSymbol(")");
    return { type: "JsonObjectFunctionCall", pairs, nullClause };
  }

  JsonObjectAggFunctionCall() {
    this.expectKeyword("JSON_OBJECTAGG");
    this.expectSymbol("(");
    const pair = this.JsonNameAndValue();
    const nullClause = this.JsonConstructorNullClause();
    this.expectSymbol(")");
    return { type: "JsonObjectAggFunctionCall", pair, nullClause };
  }

  JsonArrayFunctionCall() {
    this.expectKeyword("JSON_ARRAY");
    this.expectSymbol("(");
    const items = [];
    if (!this.isSymbol(")")) {
      items.push(this.Expression());
      while (this.acceptSymbol(",")) {
        items.push(this.Expression());
      }
    }
    const nullClause = this.JsonConstructorNullClause();
    this.expectSymbol(")");
    return { type: "JsonArrayFunctionCall", items, nullClause };
  }

  JsonArrayAggFunctionCall() {
    this.expectKeyword("JSON_ARRAYAGG");
    this.expectSymbol("(");
    const expr = this.Expression();
    let orderBy = null;
    if (this.isKeyword("ORDER")) orderBy = this.OrderBy();
    const nullClause = this.JsonConstructorNullClause();
    this.expectSymbol(")");
    let withinGroup = null;
    if (this.isKeyword("WITHIN")) withinGroup = this.withinGroup();
    return { type: "JsonArrayAggFunctionCall", expr, orderBy, nullClause, withinGroup };
  }

  CaseExpression() {
    this.expectKeyword("CASE");
    let base = null;
    if (!this.isKeyword("WHEN")) {
      base = this.Expression();
    }
    const whens = [];
    while (this.acceptKeyword("WHEN")) {
      const conditions = this.ExpressionCommaList();
      this.expectKeyword("THEN");
      const result = this.Expression();
      whens.push({ conditions, result });
    }
    let elseExpr = null;
    if (this.acceptKeyword("ELSE")) {
      elseExpr = this.Expression();
    }
    this.expectKeyword("END");
    return { type: "CaseExpression", base, whens, elseExpr };
  }

  MultisetConstructor() {
    this.expectKeyword("MULTISET");
    if (this.acceptSymbol("(")) {
      const value = this.LeafQueryOrExpr();
      this.expectSymbol(")");
      return { type: "MultisetConstructor", kind: "PAREN", value };
    }
    this.expectSymbol("[");
    const items = this.ExpressionCommaList();
    this.expectSymbol("]");
    return { type: "MultisetConstructor", kind: "BRACKET", items };
  }

  ArrayConstructor() {
    this.expectKeyword("ARRAY");
    if (this.acceptSymbol("(")) {
      if (this.acceptSymbol(")")) {
        return { type: "ArrayConstructor", kind: "EMPTY_PAREN" };
      }
      const value = (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE"))
        ? this.OrderedQueryOrExpr()
        : this.ExpressionCommaList();
      this.expectSymbol(")");
      return { type: "ArrayConstructor", kind: "PAREN", value };
    }
    this.expectSymbol("[");
    let items = [];
    if (!this.isSymbol("]")) {
      items = this.ExpressionCommaList();
    }
    this.expectSymbol("]");
    return { type: "ArrayConstructor", kind: "BRACKET", items };
  }

  MapConstructor() {
    this.expectKeyword("MAP");
    if (this.acceptSymbol("(")) {
      if (this.acceptSymbol(")")) {
        return { type: "MapConstructor", kind: "EMPTY_PAREN" };
      }
      const value = (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE"))
        ? this.OrderedQueryOrExpr()
        : this.ExpressionCommaList();
      this.expectSymbol(")");
      return { type: "MapConstructor", kind: "PAREN", value };
    }
    this.expectSymbol("[");
    let items = [];
    if (!this.isSymbol("]")) {
      items = this.ExpressionCommaList();
    }
    this.expectSymbol("]");
    return { type: "MapConstructor", kind: "BRACKET", items };
  }

  DataType() {
    const name = this.TypeName();
    const suffixes = [];
    while (this.acceptKeyword("MULTISET") || this.acceptKeyword("ARRAY")) {
      suffixes.push(this.tokens[this.pos - 1].value.toUpperCase());
    }
    return { type: "DataType", name, suffixes };
  }

  TypeName() {
    if (this.isKeyword("ROW")) return this.RowTypeName();
    if (this.isKeyword("MAP")) return this.MapTypeName();
    const sql = this.SqlTypeName();
    if (sql) return sql;
    return this.CompoundIdentifier();
  }

  SqlTypeName() {
    return this.SqlTypeName1() || this.SqlTypeName2() || this.SqlTypeName3() ||
      this.CharacterTypeName() || this.DateTimeTypeName();
  }

  SqlTypeName1() {
    if (this.acceptKeyword("GEOMETRY")) return { type: "SqlTypeName", name: "GEOMETRY" };
    if (this.acceptKeyword("BOOLEAN")) return { type: "SqlTypeName", name: "BOOLEAN" };
    return null;
  }

  SqlTypeName2() {
    if (this.acceptKeyword("BINARY")) {
      const varying = Boolean(this.acceptKeyword("VARYING"));
      const precision = this.PrecisionOpt();
      return { type: "SqlTypeName", name: "BINARY", varying, precision };
    }
    if (this.acceptKeyword("VARBINARY")) {
      const precision = this.PrecisionOpt();
      return { type: "SqlTypeName", name: "VARBINARY", precision };
    }
    return null;
  }

  SqlTypeName3() {
    if (this.acceptKeyword("DECIMAL") || this.acceptKeyword("DEC") || this.acceptKeyword("NUMERIC") || this.acceptKeyword("ANY")) {
      const name = String(this.tokens[this.pos - 1].value).toUpperCase();
      let precision = null;
      let scale = null;
      if (this.acceptSymbol("(")) {
        precision = this.UnsignedIntLiteral();
        if (this.acceptSymbol(",")) {
          scale = this.IntLiteral();
        }
        this.expectSymbol(")");
      }
      return { type: "SqlTypeName", name, precision, scale };
    }
    return null;
  }

  CharacterTypeName() {
    if (this.acceptKeyword("CHARACTER") || this.acceptKeyword("CHAR")) {
      const name = String(this.tokens[this.pos - 1].value).toUpperCase();
      const varying = Boolean(this.acceptKeyword("VARYING"));
      const precision = this.PrecisionOpt();
      return { type: "SqlTypeName", name, varying, precision };
    }
    if (this.acceptKeyword("VARCHAR")) {
      const precision = this.PrecisionOpt();
      return { type: "SqlTypeName", name: "VARCHAR", precision };
    }
    return null;
  }

  DateTimeTypeName() {
    if (this.acceptKeyword("DATE")) {
      return { type: "SqlTypeName", name: "DATE" };
    }
    if (this.acceptKeyword("TIME")) {
      const precision = this.PrecisionOpt();
      const timeZone = this.TimeZoneOpt();
      return { type: "SqlTypeName", name: "TIME", precision, timeZone };
    }
    if (this.acceptKeyword("TIMESTAMP")) {
      const precision = this.PrecisionOpt();
      const timeZone = this.TimeZoneOpt();
      return { type: "SqlTypeName", name: "TIMESTAMP", precision, timeZone };
    }
    return null;
  }

  TimeZoneOpt() {
    if (!this.acceptKeyword("WITH")) return null;
    const local = Boolean(this.acceptKeyword("LOCAL"));
    this.expectKeyword("TIME");
    this.expectKeyword("ZONE");
    return { type: "TimeZoneOpt", local };
  }

  RowTypeName() {
    this.expectKeyword("ROW");
    this.expectSymbol("(");
    const fields = [];
    const name = this.SimpleIdentifier();
    const type = this.DataType();
    const nullable = this.NullableOptDefaultTrue();
    fields.push({ name, type, nullable });
    while (this.acceptSymbol(",")) {
      const n = this.SimpleIdentifier();
      const t = this.DataType();
      const nn = this.NullableOptDefaultTrue();
      fields.push({ name: n, type: t, nullable: nn });
    }
    this.expectSymbol(")");
    return { type: "RowTypeName", fields };
  }

  MapTypeName() {
    this.expectKeyword("MAP");
    this.expectSymbol("<");
    const keyType = this.DataType();
    this.expectSymbol(",");
    const valueType = this.DataType();
    this.expectSymbol(">");
    return { type: "MapTypeName", keyType, valueType };
  }

  Literal() {
    const t = this.peek();
    if (t.type === "STRING") return this.StringLiteral();
    if (t.type === "NUMBER") return this.NumericLiteral();
    if (this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN") || this.isKeyword("NULL")) {
      return this.SpecialLiteral();
    }
    if (this.isKeyword("INTERVAL")) {
      return this.IntervalLiteral();
    }
    if (this.isKeyword("DATE") || this.isKeyword("DATETIME") || this.isKeyword("TIME") ||
        this.isKeyword("UUID") || this.isKeyword("TIMESTAMP") || this.isSymbol("{")) {
      return this.DateTimeLiteral();
    }
    throw new Error("Invalid Literal");
  }

  LiteralOrIntervalExpression() {
    if (this.isKeyword("INTERVAL")) {
      return this.IntervalLiteralOrExpression();
    }
    return this.NonIntervalLiteral();
  }

  IntervalLiteralOrExpression() {
    this.expectKeyword("INTERVAL");
    let sign = null;
    if (this.acceptSymbol("+")) sign = "+";
    else if (this.acceptSymbol("-")) sign = "-";
    if (this.peek().type === "STRING") {
      const literal = this.SimpleStringLiteral();
      const qualifier = this.IntervalQualifier();
      return { type: "IntervalLiteralOrExpression", sign, literal, qualifier };
    }
    let value;
    if (this.acceptSymbol("(")) {
      value = this.Expression();
      this.expectSymbol(")");
    } else if (this.peek().type === "NUMBER") {
      value = this.UnsignedNumericLiteral();
    } else {
      value = this.CompoundIdentifier();
    }
    const qualifier = this.IntervalQualifierStart();
    return { type: "IntervalLiteralOrExpression", sign, value, qualifier };
  }

  NonIntervalLiteral() {
    if (this.peek().type === "NUMBER") return this.NumericLiteral();
    if (this.peek().type === "STRING") return this.StringLiteral();
    if (this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN") || this.isKeyword("NULL")) {
      return this.SpecialLiteral();
    }
    if (this.isSymbol("{") || this.isKeyword("DATE") || this.isKeyword("DATETIME") ||
        this.isKeyword("TIME") || this.isKeyword("UUID") || this.isKeyword("TIMESTAMP")) {
      return this.DateTimeLiteral();
    }
    throw new Error("Invalid NonIntervalLiteral");
  }

  NumericLiteral() {
    let sign = null;
    if (this.acceptSymbol("+")) sign = "+";
    else if (this.acceptSymbol("-")) sign = "-";
    const value = this.UnsignedNumericLiteral();
    return { type: "NumericLiteral", sign, value };
  }

  UnsignedNumericLiteral() {
    const t = this.peek();
    if (t.type === "NUMBER") {
      this.next();
      return { type: "UnsignedNumericLiteral", value: t.value };
    }
    if (this.acceptKeyword("DECIMAL")) {
      const literal = this.SimpleStringLiteral();
      return { type: "UnsignedNumericLiteral", value: { type: "DECIMAL", literal } };
    }
    throw new Error("Invalid UnsignedNumericLiteral");
  }

  SpecialLiteral() {
    if (this.acceptKeyword("TRUE")) return { type: "SpecialLiteral", value: "TRUE" };
    if (this.acceptKeyword("FALSE")) return { type: "SpecialLiteral", value: "FALSE" };
    if (this.acceptKeyword("UNKNOWN")) return { type: "SpecialLiteral", value: "UNKNOWN" };
    if (this.acceptKeyword("NULL")) return { type: "SpecialLiteral", value: "NULL" };
    throw new Error("Invalid SpecialLiteral");
  }

  DateTimeLiteral() {
    if (this.isSymbol("{")) {
      this.expectSymbol("{");
      const kindToken = this.peek();
      if (kindToken.type !== "IDENT") {
        throw new Error(`Expected datetime literal kind but got ${kindToken.type}:${kindToken.value}`);
      }
      const kind = String(kindToken.value).toLowerCase();
      if (kind !== "d" && kind !== "t" && kind !== "ts") {
        throw new Error(`Expected d|t|ts but got ${kindToken.value}`);
      }
      this.next();
      const value = this.StringLiteral();
      this.expectSymbol("}");
      return { type: "DateTimeLiteral", kind, value };
    }
    if (this.isKeyword("TIME") && this.isKeywordAt("WITH", 1)) {
      this.expectKeyword("WITH");
      const local = Boolean(this.acceptKeyword("LOCAL"));
      this.expectKeyword("TIME");
      this.expectKeyword("ZONE");
      const value = this.SimpleStringLiteral();
      return { type: "DateTimeLiteral", kind: "TIME WITH TIME ZONE", local, value };
    }
    if (this.isKeyword("TIMESTAMP") && this.isKeywordAt("WITH", 1)) {
      this.expectKeyword("WITH");
      const local = Boolean(this.acceptKeyword("LOCAL"));
      this.expectKeyword("TIME");
      this.expectKeyword("ZONE");
      const value = this.SimpleStringLiteral();
      return { type: "DateTimeLiteral", kind: "TIMESTAMP WITH TIME ZONE", local, value };
    }
    if (this.acceptKeyword("DATE") || this.acceptKeyword("DATETIME") || this.acceptKeyword("TIME") ||
        this.acceptKeyword("UUID") || this.acceptKeyword("TIMESTAMP")) {
      const kind = String(this.tokens[this.pos - 1].value).toUpperCase();
      const value = this.SimpleStringLiteral();
      return { type: "DateTimeLiteral", kind, value };
    }
    throw new Error("Invalid DateTimeLiteral");
  }

  IntervalLiteral() {
    this.expectKeyword("INTERVAL");
    let sign = null;
    if (this.acceptSymbol("+")) sign = "+";
    else if (this.acceptSymbol("-")) sign = "-";
    const literal = this.SimpleStringLiteral();
    const qualifier = this.IntervalQualifier();
    return { type: "IntervalLiteral", sign, literal, qualifier };
  }

  IntervalQualifier() {
    const base = this.IntervalQualifierStart();
    if (base.unit === "SECOND") {
      return base;
    }
    let precision = null;
    if (this.acceptSymbol("(")) {
      precision = this.UnsignedIntLiteral();
      this.expectSymbol(")");
      base.precision = precision;
    }
    let to = null;
    if (this.acceptKeyword("TO")) {
      if (this.acceptKeyword("MONTH")) to = "MONTH";
      else if (this.acceptKeyword("HOUR")) to = "HOUR";
      else if (this.acceptKeyword("MINUTE")) to = "MINUTE";
      else if (this.acceptKeyword("SECOND")) to = "SECOND";
      else throw new Error("Invalid IntervalQualifier");
      base.to = to;
    }
    return base;
  }

  IntervalQualifierStart() {
    const units = ["YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR", "MINUTE"];
    for (const u of units) {
      if (this.acceptKeyword(u)) {
        let precision = null;
        if (this.acceptSymbol("(")) {
          precision = this.UnsignedIntLiteral();
          this.expectSymbol(")");
        }
        return { type: "IntervalQualifier", unit: u, precision };
      }
    }
    if (this.acceptKeyword("SECOND")) {
      let precision = null;
      let scale = null;
      if (this.acceptSymbol("(")) {
        precision = this.UnsignedIntLiteral();
        if (this.acceptSymbol(",")) {
          scale = this.UnsignedIntLiteral();
        }
        this.expectSymbol(")");
      }
      return { type: "IntervalQualifier", unit: "SECOND", precision, scale };
    }
    throw new Error("Invalid IntervalQualifierStart");
  }

  AddSetOpQuery() {
    const op = this.BinaryQueryOperator();
    const right = this.LeafQueryOrExpr();
    return { type: "AddSetOpQuery", op, right };
  }

  BinaryQueryOperator() {
    let kind;
    if (this.acceptKeyword("UNION")) kind = "UNION";
    else if (this.acceptKeyword("INTERSECT")) kind = "INTERSECT";
    else if (this.acceptKeyword("EXCEPT")) kind = "EXCEPT";
    else return this.notImplemented("BinaryQueryOperator");
    let quantifier = null;
    if (this.acceptKeyword("ALL")) quantifier = "ALL";
    else if (this.acceptKeyword("DISTINCT")) quantifier = "DISTINCT";
    return { type: "BinaryQueryOperator", kind, quantifier };
  }

  AddSetOpQueryOrExpr() {
    const op = this.BinaryQueryOperator();
    const right = this.LeafQueryOrExpr();
    return { type: "AddSetOpQueryOrExpr", op, right };
  }

  Query() {
    const withList = this.isKeyword("WITH") ? this.WithList() : null;
    const leaf = this.LeafQuery();
    const setOps = [];
    while (this.isKeyword("UNION") || this.isKeyword("INTERSECT") || this.isKeyword("EXCEPT")) {
      setOps.push(this.AddSetOpQuery());
    }
    return { type: "Query", withList, leaf, setOps };
  }

  SqlQueryEof() {
    const query = this.OrderedQueryOrExpr();
    this.expect("EOF");
    return { type: "SqlQueryEof", query };
  }

  ExprOrJoinOrOrderedQuery() {
    if (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
      const query = this.Query();
      const orderByLimitOpt = this.OrderByLimitOpt();
      return { type: "ExprOrJoinOrOrderedQuery", kind: "QUERY", query, orderByLimitOpt };
    }
    const base = this.TableRef1();
    const joins = [];
    while (true) {
      const save = this.pos;
      try {
        if (this.isKeyword("NATURAL") || this.isJoinTypeStart()) {
          joins.push(this.JoinTable());
          continue;
        }
      } catch {}
      this.pos = save;
      break;
    }
    const setOps = [];
    while (this.isKeyword("UNION") || this.isKeyword("INTERSECT") || this.isKeyword("EXCEPT")) {
      setOps.push(this.AddSetOpQuery());
    }
    return { type: "ExprOrJoinOrOrderedQuery", kind: "TABLE", base, joins, setOps };
  }

  ParenthesizedExpression() {
    this.expectSymbol("(");
    let node;
    if (this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE") || this.isKeyword("WITH")) {
      node = this.OrderedQueryOrExpr();
    } else {
      node = this.Expression();
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedExpression", node };
  }

  ParenthesizedQueryOrCommaList() {
    this.expectSymbol("(");
    let node;
    if (this.isKeyword("WITH") || this.isKeyword("SELECT") || this.isKeyword("VALUES") || this.isKeyword("VALUE") || this.isKeyword("TABLE")) {
      node = this.OrderedQueryOrExpr();
    } else {
      node = this.ExpressionCommaList();
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedQueryOrCommaList", node };
  }

  ParenthesizedQueryOrCommaListWithDefault() {
    this.expectSymbol("(");
    const items = [];
    if (!this.isSymbol(")")) {
      const first = this.acceptKeyword("DEFAULT") ? { type: "Default" } : this.Expression();
      items.push(first);
      while (this.acceptSymbol(",")) {
        const item = this.acceptKeyword("DEFAULT") ? { type: "Default" } : this.Expression();
        items.push(item);
      }
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedQueryOrCommaListWithDefault", items };
  }

  ExpressionCommaList() {
    const expressions = [this.Expression()];
    while (this.acceptSymbol(",")) {
      expressions.push(this.Expression());
    }
    return { type: "ExpressionCommaList", expressions };
  }

  SimpleIdentifier() {
    return this.Identifier();
  }

  SimpleIdentifierOrListOrEmpty() {
    if (this.peek().type === "IDENT") {
      return this.SimpleIdentifier();
    }
    if (this.isSymbol("(")) {
      this.expectSymbol("(");
      if (this.acceptSymbol(")")) {
        return { type: "SimpleIdentifierList", items: [] };
      }
      const items = [this.SimpleIdentifier()];
      while (this.acceptSymbol(",")) {
        items.push(this.SimpleIdentifier());
      }
      this.expectSymbol(")");
      return { type: "SimpleIdentifierList", items };
    }
    return this.notImplemented("SimpleIdentifierOrListOrEmpty");
  }

  ParenthesizedSimpleIdentifierList() {
    this.expectSymbol("(");
    const items = [this.SimpleIdentifier()];
    while (this.acceptSymbol(",")) {
      items.push(this.SimpleIdentifier());
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedSimpleIdentifierList", items };
  }

  CompoundIdentifier() {
    const parts = [this.Identifier()];
    while (this.acceptSymbol(".")) {
      if (this.acceptSymbol("*")) {
        parts.push({ type: "Star" });
        break;
      }
      parts.push(this.Identifier());
    }
    return { type: "CompoundIdentifier", parts };
  }

  CompoundTableIdentifier() {
    const parts = [this.Identifier()];
    while (this.acceptSymbol(".")) {
      parts.push(this.Identifier());
    }
    return { type: "CompoundTableIdentifier", parts };
  }

  Identifier() {
    const t = this.peek();
    if (t.type !== "IDENT") {
      throw new Error(`Expected identifier but got ${t.type}:${t.value}`);
    }
    this.next();
    return { type: "Identifier", value: t.value };
  }

  SimpleIdentifierFromStringLiteral() {
    const lit = this.StringLiteral();
    return { type: "SimpleIdentifierFromStringLiteral", value: lit.value };
  }

  ParenthesizedCompoundIdentifierList() {
    this.expectSymbol("(");
    const items = [this.AddCompoundIdentifierType()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddCompoundIdentifierType());
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedCompoundIdentifierList", items };
  }

  NotNullOpt() {
    if (this.acceptKeyword("NOT")) {
      this.expectKeyword("NULL");
      return { type: "NotNullOpt", value: "NOT NULL" };
    }
    return null;
  }

  TableHints() {
    this.expectSymbol("/");
    this.expectSymbol("*");
    this.expectSymbol("+");
    const hints = [this.AddHint()];
    while (this.acceptSymbol(",")) {
      hints.push(this.AddHint());
    }
    this.expectSymbol("*");
    this.expectSymbol("/");
    return { type: "TableHints", hints };
  }

  SqlSelectKeywords() {
    // Dialect-specific; empty in base grammar
    return null;
  }

  ParenthesizedLiteralOptionCommaList() {
    this.expectSymbol("(");
    const items = [];
    if (!this.isSymbol(")")) {
      items.push(this.Literal());
      while (this.acceptSymbol(",")) {
        items.push(this.Literal());
      }
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedLiteralOptionCommaList", items };
  }

  ParenthesizedKeyValueOptionCommaList() {
    this.expectSymbol("(");
    const items = [];
    const readKey = () => (this.peek().type === "IDENT" ? this.SimpleIdentifier() : this.StringLiteral());
    const key1 = readKey();
    this.expectSymbol("=");
    const val1 = this.StringLiteral();
    items.push({ key: key1, value: val1 });
    while (this.acceptSymbol(",")) {
      const k = readKey();
      this.expectSymbol("=");
      const v = this.StringLiteral();
      items.push({ key: k, value: v });
    }
    this.expectSymbol(")");
    return { type: "ParenthesizedKeyValueOptionCommaList", items };
  }

  Where() {
    this.expectKeyword("WHERE");
    const expr = this.Expression();
    return { type: "Where", expr };
  }

  GroupBy() {
    this.expectKeyword("GROUP");
    this.expectKeyword("BY");
    let set = null;
    if (this.acceptKeyword("DISTINCT")) set = "DISTINCT";
    else if (this.acceptKeyword("ALL")) set = "ALL";
    const list = this.GroupingElementList();
    return { type: "GroupBy", set, list };
  }

  Having() {
    this.expectKeyword("HAVING");
    const expr = this.Expression();
    return { type: "Having", expr };
  }

  Window() {
    this.expectKeyword("WINDOW");
    const items = [this.AddWindowSpec()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddWindowSpec());
    }
    return { type: "Window", items };
  }

  Qualify() {
    this.expectKeyword("QUALIFY");
    const expr = this.Expression();
    return { type: "Qualify", expr };
  }

  TableOverOpt() {
    // Extension point in Calcite; no syntax in base grammar
    return null;
  }

  Over() {
    return this.TableOverOpt();
  }

  ExtendedTableRef() {
    // Parser extension point; not supported in this implementation
    return { type: "ExtendedTableRef" };
  }

  TableFunctionCall() {
    this.expectKeyword("TABLE");
    this.expectSymbol("(");
    let specific = false;
    if (this.acceptKeyword("SPECIFIC")) specific = true;
    const call = this.NamedRoutineCall();
    this.expectSymbol(")");
    return { type: "TableFunctionCall", specific, call };
  }

  ImplicitTableFunctionCallArgs() {
    const name = this.CompoundIdentifier();
    this.expectSymbol("(");
    const args = [];
    if (!this.isSymbol(")")) {
      args.push(this.AddArg0());
      while (this.acceptSymbol(",")) {
        args.push(this.AddArg());
      }
    }
    this.expectSymbol(")");
    return { type: "ImplicitTableFunctionCallArgs", name, args };
  }

  NamedRoutineCall() {
    const name = this.CompoundIdentifier();
    this.expectSymbol("(");
    const args = [];
    if (!this.isSymbol(")")) {
      args.push(this.AddArg0());
      while (this.acceptSymbol(",")) {
        args.push(this.AddArg());
      }
    }
    this.expectSymbol(")");
    return { type: "NamedRoutineCall", name, args };
  }

  FunctionParameterList() {
    this.expectSymbol("(");
    let quantifier = null;
    if (this.acceptKeyword("ALL")) quantifier = "ALL";
    else if (this.acceptKeyword("DISTINCT")) quantifier = "DISTINCT";
    const args = [];
    if (!this.isSymbol(")")) {
      args.push(this.AddArg0());
      while (this.acceptSymbol(",")) {
        args.push(this.AddArg());
      }
    }
    this.expectSymbol(")");
    return { type: "FunctionParameterList", quantifier, args };
  }

  AllOrDistinct() {
    if (this.acceptKeyword("ALL")) return "ALL";
    if (this.acceptKeyword("DISTINCT")) return "DISTINCT";
    return null;
  }

  UnquantifiedFunctionParameterList() {
    return this.FunctionParameterList();
  }

  AddArg0() {
    let name = null;
    if (this.peek().type === "IDENT" && this.isSymbolAt(":=", 1)) {
      name = this.SimpleIdentifier();
      this.expectSymbol(":=");
    }
    const expr = this.Expression();
    return { type: "Arg", name, expr };
  }

  AddArg() {
    let name = null;
    if (this.peek().type === "IDENT" && this.isSymbolAt(":=", 1)) {
      name = this.SimpleIdentifier();
      this.expectSymbol(":=");
    }
    const expr = this.Expression();
    return { type: "Arg", name, expr };
  }

  AddExpression() {
    return this.notImplemented("AddExpression");
  }

  AddExpression2b() {
    const prefixes = [];
    let op = this.PrefixRowOperator();
    while (op) {
      prefixes.push(op);
      op = this.PrefixRowOperator();
    }
    const base = this.Expression3();
    const extensions = [];
    while (this.acceptSymbol(".")) {
      const ext = this.RowExpressionExtension();
      extensions.push(ext);
    }
    return { type: "Expression2b", prefixes, base, extensions };
  }

  AddExpressions() {
    return this.ExpressionCommaList();
  }

  AddGroupingElement() {
    if (this.acceptKeyword("GROUPING")) {
      this.expectKeyword("SETS");
      this.expectSymbol("(");
      const list = this.GroupingElementList();
      this.expectSymbol(")");
      return { type: "AddGroupingElement", kind: "GROUPING SETS", list };
    }
    if (this.acceptKeyword("ROLLUP")) {
      this.expectSymbol("(");
      const list = this.ExpressionCommaList();
      this.expectSymbol(")");
      return { type: "AddGroupingElement", kind: "ROLLUP", list };
    }
    if (this.acceptKeyword("CUBE")) {
      this.expectSymbol("(");
      const list = this.ExpressionCommaList();
      this.expectSymbol(")");
      return { type: "AddGroupingElement", kind: "CUBE", list };
    }
    if (this.acceptSymbol("(")) {
      this.expectSymbol(")");
      return { type: "AddGroupingElement", kind: "EMPTY" };
    }
    const expr = this.Expression();
    return { type: "AddGroupingElement", kind: "EXPR", expr };
  }

  AddWindowSpec() {
    const name = this.SimpleIdentifier();
    this.expectKeyword("AS");
    const spec = this.WindowSpecification();
    return { type: "AddWindowSpec", name, spec };
  }

  AddWithItem() {
    const name = this.SimpleIdentifier();
    let columns = null;
    if (this.isSymbol("(")) {
      columns = this.ParenthesizedSimpleIdentifierList();
    }
    this.expectKeyword("AS");
    const query = this.ParenthesizedExpression();
    return { type: "AddWithItem", name, columns, query };
  }

  AddSelectItem() {
    const expr = this.SelectExpression();
    let alias = null;
    let measure = false;
    if (this.acceptKeyword("AS")) {
      if (this.acceptKeyword("MEASURE")) measure = true;
      if (this.peek().type === "IDENT") {
        alias = this.SimpleIdentifier();
      } else if (this.peek().type === "STRING") {
        alias = this.SimpleIdentifierFromStringLiteral();
      }
    } else if (this.peek().type === "IDENT" || this.peek().type === "STRING") {
      if (this.peek().type === "IDENT") alias = this.SimpleIdentifier();
      else alias = this.SimpleIdentifierFromStringLiteral();
    }
    return { type: "AddSelectItem", expr, alias, measure };
  }

  AddRowConstructor() {
    return this.RowConstructor();
  }

  AddSimpleIdentifiers() {
    const items = [this.SimpleIdentifier()];
    while (this.acceptSymbol(",")) {
      items.push(this.SimpleIdentifier());
    }
    return { type: "AddSimpleIdentifiers", items };
  }

  AddIdentifierSegment() {
    return this.Identifier();
  }

  AddTableIdentifierSegment() {
    return this.Identifier();
  }

  AddOrderItem() {
    const expr = this.Expression();
    let alias = null;
    if (this.acceptKeyword("AS")) {
      if (this.peek().type === "IDENT") alias = this.SimpleIdentifier();
      else if (this.peek().type === "STRING") alias = this.SimpleIdentifierFromStringLiteral();
    }
    let direction = null;
    if (this.acceptKeyword("ASC")) direction = "ASC";
    else if (this.acceptKeyword("DESC")) direction = "DESC";
    let nulls = null;
    if (this.acceptKeyword("NULLS")) {
      if (this.acceptKeyword("FIRST")) nulls = "FIRST";
      else if (this.acceptKeyword("LAST")) nulls = "LAST";
    }
    return { type: "AddOrderItem", expr, alias, direction, nulls };
  }

  AddMeasureColumn() {
    const expr = this.Expression();
    this.expectKeyword("AS");
    const name = this.SimpleIdentifier();
    return { type: "AddMeasureColumn", expr, name };
  }

  AddSubsetDefinition() {
    const name = this.SimpleIdentifier();
    this.expectSymbol("=");
    this.expectSymbol("(");
    const list = this.ExpressionCommaList();
    this.expectSymbol(")");
    return { type: "AddSubsetDefinition", name, list };
  }

  AddPivotAgg() {
    const call = this.NamedFunctionCall();
    let alias = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
    }
    return { type: "AddPivotAgg", call, alias };
  }

  AddPivotValue() {
    const row = this.RowConstructor();
    let alias = null;
    if (this.acceptKeyword("AS")) {
      alias = this.SimpleIdentifier();
    } else if (this.peek().type === "IDENT") {
      alias = this.SimpleIdentifier();
    }
    return { type: "AddPivotValue", row, alias };
  }

  AddUnpivotValue() {
    const list = this.SimpleIdentifierOrList();
    let row = null;
    if (this.acceptKeyword("AS")) {
      row = this.RowConstructor();
    }
    return { type: "AddUnpivotValue", list, row };
  }

  AddKeyValueOption() {
    let key;
    if (this.peek().type === "IDENT") key = this.SimpleIdentifier();
    else key = this.StringLiteral();
    this.expectSymbol("=");
    const value = this.StringLiteral();
    return { type: "AddKeyValueOption", key, value };
  }

  AddOptionValue() {
    if (this.peek().type === "NUMBER") return this.NumericLiteral();
    return this.StringLiteral();
  }

  AddColumnType() {
    const name = this.CompoundIdentifier();
    const dataType = this.DataType();
    const notNull = this.NotNullOpt();
    return { type: "AddColumnType", name, dataType, notNull };
  }

  AddCompoundIdentifierType() {
    const name = this.CompoundIdentifier();
    let dataType = null;
    let notNull = null;
    if (this.isTypeNameStart()) {
      dataType = this.DataType();
      if (this.isKeyword("NOT")) {
        notNull = this.NotNullOpt();
      }
    }
    return { type: "AddCompoundIdentifierType", name, dataType, notNull };
  }

  AddCompoundIdentifierTypes() {
    return this.notImplemented("AddCompoundIdentifierTypes");
  }

  AddHint() {
    const name = this.SimpleIdentifier();
    let args = null;
    if (this.acceptSymbol("(")) {
      args = [];
      if (!this.isSymbol(")")) {
        args.push(this.Literal());
        while (this.acceptSymbol(",")) {
          args.push(this.Literal());
        }
      }
      this.expectSymbol(")");
    }
    return { type: "AddHint", name, args };
  }

  Default() {
    this.expectKeyword("DEFAULT");
    return { type: "Default" };
  }

  TableParam() {
    const table = this.ExplicitTable();
    let partitionBy = null;
    if (this.acceptKeyword("PARTITION")) {
      this.expectKeyword("BY");
      partitionBy = this.SimpleIdentifierOrList();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) {
      orderBy = this.OrderByOfSetSemanticsTable();
    }
    return { type: "TableParam", table, partitionBy, orderBy };
  }

  PartitionedQueryOrQueryOrExpr() {
    const query = this.OrderedQueryOrExpr();
    let partitionBy = null;
    if (this.acceptKeyword("PARTITION")) {
      this.expectKeyword("BY");
      partitionBy = this.SimpleIdentifierOrList();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) {
      orderBy = this.OrderByOfSetSemanticsTable();
    }
    return { type: "PartitionedQueryOrQueryOrExpr", query, partitionBy, orderBy };
  }

  PartitionedByAndOrderBy() {
    let partitionBy = null;
    if (this.acceptKeyword("PARTITION")) {
      this.expectKeyword("BY");
      partitionBy = this.SimpleIdentifierOrList();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) {
      orderBy = this.OrderByOfSetSemanticsTable();
    }
    return { type: "PartitionedByAndOrderBy", partitionBy, orderBy };
  }

  OrderByOfSetSemanticsTable() {
    this.expectKeyword("ORDER");
    this.expectKeyword("BY");
    if (this.acceptSymbol("(")) {
      const items = [this.AddOrderItem()];
      while (this.acceptSymbol(",")) {
        items.push(this.AddOrderItem());
      }
      this.expectSymbol(")");
      return { type: "OrderByOfSetSemanticsTable", items, parenthesized: true };
    }
    const item = this.AddOrderItem();
    return { type: "OrderByOfSetSemanticsTable", items: [item], parenthesized: false };
  }

  NamedFunctionCall() {
    const namedCall = this.NamedCall();
    if (!namedCall) return null;
    let nullTreatment = null;
    if (this.isKeyword("IGNORE") || this.isKeyword("RESPECT")) {
      nullTreatment = this.nullTreatment();
    }
    let withinDistinct = null;
    if (this.isKeyword("WITHIN") && this.isKeywordAt("DISTINCT", 1)) {
      withinDistinct = this.withinDistinct();
    }
    let withinGroup = null;
    if (this.isKeyword("WITHIN") && this.isKeywordAt("GROUP", 1)) {
      withinGroup = this.withinGroup();
    }
    let filter = null;
    if (this.acceptKeyword("FILTER")) {
      this.expectSymbol("(");
      this.expectKeyword("WHERE");
      filter = this.Expression();
      this.expectSymbol(")");
    }
    let over = null;
    if (this.acceptKeyword("OVER")) {
      if (this.isSymbol("(")) {
        over = this.WindowSpecification();
      } else {
        over = this.SimpleIdentifier();
      }
    }
    return { type: "NamedFunctionCall", namedCall, nullTreatment, withinDistinct, withinGroup, filter, over };
  }

  NamedCall() {
    const save = this.pos;
    let specific = false;
    if (this.acceptKeyword("SPECIFIC")) specific = true;
    const name = this.FunctionName();
    if (!name || !this.isSymbol("(")) {
      this.pos = save;
      return null;
    }
    let callType = null;
    let params = null;
    if (this.acceptSymbol("(")) {
      if (this.acceptSymbol("*")) {
        this.expectSymbol(")");
        callType = "STAR";
      } else if (this.acceptSymbol(")")) {
        callType = "EMPTY";
      } else {
        this.pos--;
        params = this.FunctionParameterList();
        callType = "PARAMS";
      }
    }
    return { type: "NamedCall", specific, name, callType, params };
  }

  FunctionName() {
    return this.CompoundIdentifier();
  }

  ReservedFunctionName() {
    const name = this.NonReservedJdbcFunctionName();
    if (name) return name;
    return this.notImplemented("ReservedFunctionName");
  }

  NonReservedJdbcFunctionName() {
    if (this.acceptKeyword("SUBSTRING")) {
      return { type: "NonReservedJdbcFunctionName", value: "SUBSTRING" };
    }
    return null;
  }

  NonReservedKeyWord() {
    // Lexer-defined; accept any identifier as a placeholder
    if (this.peek().type === "IDENT") {
      const id = this.SimpleIdentifier();
      return { type: "NonReservedKeyWord", value: id };
    }
    return this.notImplemented("NonReservedKeyWord");
  }

  NonReservedKeyWord0of3() {
    return this.NonReservedKeyWord();
  }

  NonReservedKeyWord1of3() {
    return this.NonReservedKeyWord();
  }

  NonReservedKeyWord2of3() {
    return this.NonReservedKeyWord();
  }

  StringAggFunctionCall() {
    let name;
    if (this.acceptKeyword("ARRAY_AGG")) name = "ARRAY_AGG";
    else if (this.acceptKeyword("ARRAY_CONCAT_AGG")) name = "ARRAY_CONCAT_AGG";
    else if (this.acceptKeyword("GROUP_CONCAT")) name = "GROUP_CONCAT";
    else if (this.acceptKeyword("STRING_AGG")) name = "STRING_AGG";
    else return this.notImplemented("StringAggFunctionCall");
    this.expectSymbol("(");
    let quantifier = null;
    if (this.acceptKeyword("ALL")) quantifier = "ALL";
    else if (this.acceptKeyword("DISTINCT")) quantifier = "DISTINCT";
    const exprs = [this.Expression()];
    while (this.acceptSymbol(",")) {
      exprs.push(this.Expression());
    }
    let nullTreatment = null;
    if (this.isKeyword("IGNORE") || this.isKeyword("RESPECT")) {
      nullTreatment = this.NullTreatment();
    }
    let orderBy = null;
    if (this.isKeyword("ORDER")) {
      orderBy = this.OrderBy();
    }
    let separator = null;
    if (this.acceptKeyword("SEPARATOR")) {
      separator = this.StringLiteral();
    }
    this.expectSymbol(")");
    return { type: "StringAggFunctionCall", name, quantifier, exprs, nullTreatment, orderBy, separator };
  }

  PercentileFunctionCall() {
    let name;
    if (this.acceptKeyword("PERCENTILE_CONT")) name = "PERCENTILE_CONT";
    else if (this.acceptKeyword("PERCENTILE_DISC")) name = "PERCENTILE_DISC";
    else return this.notImplemented("PercentileFunctionCall");
    this.expectSymbol("(");
    const expr = this.Expression();
    let numeric = null;
    let nullTreatment = null;
    if (this.acceptSymbol(",")) {
      numeric = this.NumericLiteral();
      if (this.isKeyword("IGNORE") || this.isKeyword("RESPECT")) {
        nullTreatment = this.NullTreatment();
      }
    }
    this.expectSymbol(")");
    return { type: "PercentileFunctionCall", name, expr, numeric, nullTreatment };
  }

  GroupByWindowingCall() {
    let name;
    if (this.acceptKeyword("TUMBLE")) name = "TUMBLE";
    else if (this.acceptKeyword("HOP")) name = "HOP";
    else if (this.acceptKeyword("SESSION")) name = "SESSION";
    else return this.notImplemented("GroupByWindowingCall");
    const params = this.FunctionParameterList();
    return { type: "GroupByWindowingCall", name, params };
  }

  MatchRecognizeFunctionCall() {
    if (this.acceptKeyword("CLASSIFIER")) {
      this.expectSymbol("(");
      this.expectSymbol(")");
      return { type: "MatchRecognizeFunctionCall", kind: "CLASSIFIER" };
    }
    if (this.acceptKeyword("MATCH_NUMBER")) {
      this.expectSymbol("(");
      this.expectSymbol(")");
      return { type: "MatchRecognizeFunctionCall", kind: "MATCH_NUMBER" };
    }
    if (this.isKeyword("RUNNING") || this.isKeyword("FINAL")) {
      return this.MatchRecognizeCallWithModifier();
    }
    if (this.isKeyword("FIRST") || this.isKeyword("LAST") || this.isKeyword("RUNNING") || this.isKeyword("FINAL")) {
      return this.MatchRecognizeNavigationLogical();
    }
    if (this.isKeyword("PREV") || this.isKeyword("NEXT")) {
      return this.MatchRecognizeNavigationPhysical();
    }
    return this.notImplemented("MatchRecognizeFunctionCall");
  }

  MatchRecognizeCallWithModifier() {
    let modifier;
    if (this.acceptKeyword("RUNNING")) modifier = "RUNNING";
    else if (this.acceptKeyword("FINAL")) modifier = "FINAL";
    else return this.notImplemented("MatchRecognizeCallWithModifier");
    const call = this.NamedFunctionCall();
    return { type: "MatchRecognizeCallWithModifier", modifier, call };
  }

  MatchRecognizeNavigationLogical() {
    let modifier = null;
    if (this.acceptKeyword("RUNNING")) modifier = "RUNNING";
    else if (this.acceptKeyword("FINAL")) modifier = "FINAL";
    let which;
    if (this.acceptKeyword("FIRST")) which = "FIRST";
    else if (this.acceptKeyword("LAST")) which = "LAST";
    else return this.notImplemented("MatchRecognizeNavigationLogical");
    this.expectSymbol("(");
    const expr = this.Expression();
    let num = null;
    if (this.acceptSymbol(",")) {
      num = this.NumericLiteral();
    }
    this.expectSymbol(")");
    return { type: "MatchRecognizeNavigationLogical", modifier, which, expr, num };
  }

  MatchRecognizeNavigationPhysical() {
    let which;
    if (this.acceptKeyword("PREV")) which = "PREV";
    else if (this.acceptKeyword("NEXT")) which = "NEXT";
    else return this.notImplemented("MatchRecognizeNavigationPhysical");
    this.expectSymbol("(");
    const expr = this.Expression();
    let num = null;
    if (this.acceptSymbol(",")) {
      num = this.NumericLiteral();
    }
    this.expectSymbol(")");
    return { type: "MatchRecognizeNavigationPhysical", which, expr, num };
  }

  withinDistinct() {
    this.expectKeyword("WITHIN");
    this.expectKeyword("DISTINCT");
    this.expectSymbol("(");
    const list = this.ExpressionCommaList();
    this.expectSymbol(")");
    return { type: "withinDistinct", list };
  }

  withinGroup() {
    this.expectKeyword("WITHIN");
    this.expectKeyword("GROUP");
    this.expectSymbol("(");
    const orderBy = this.OrderBy();
    this.expectSymbol(")");
    return { type: "withinGroup", orderBy };
  }

  NullTreatment() {
    if (this.acceptKeyword("IGNORE")) {
      this.expectKeyword("NULLS");
      return { type: "NullTreatment", value: "IGNORE" };
    }
    if (this.acceptKeyword("RESPECT")) {
      this.expectKeyword("NULLS");
      return { type: "NullTreatment", value: "RESPECT" };
    }
    return this.notImplemented("NullTreatment");
  }

  nullTreatment() {
    return this.NullTreatment();
  }

  JdbcFunctionCall() {
    this.expectSymbol("{");
    this.expectKeyword("FN");
    const name = this.CompoundIdentifier();
    this.expectSymbol("(");
    const args = [];
    if (!this.isSymbol(")")) {
      args.push(this.Expression());
      while (this.acceptSymbol(",")) {
        args.push(this.Expression());
      }
    }
    this.expectSymbol(")");
    this.expectSymbol("}");
    return { type: "JdbcFunctionCall", name, args };
  }

  DynamicParam() {
    if (this.acceptSymbol("?")) {
      return { type: "DynamicParam", kind: "QMARK", index: null };
    }
    if (this.acceptSymbol(":")) {
      const index = this.UnsignedIntLiteral();
      return { type: "DynamicParam", kind: "INDEXED", index };
    }
    return this.notImplemented("DynamicParam");
  }

  CursorExpression() {
    this.expectKeyword("CURSOR");
    this.expectSymbol("(");
    const query = this.OrderedQueryOrExpr();
    this.expectSymbol(")");
    return { type: "CursorExpression", query };
  }

  ContextVariable() {
    if (this.acceptKeyword("CURRENT_USER")) return { type: "ContextVariable", value: "CURRENT_USER" };
    if (this.acceptKeyword("CURRENT_DATE")) return { type: "ContextVariable", value: "CURRENT_DATE" };
    if (this.acceptKeyword("CURRENT_TIME")) return { type: "ContextVariable", value: "CURRENT_TIME" };
    if (this.acceptKeyword("CURRENT_TIMESTAMP")) return { type: "ContextVariable", value: "CURRENT_TIMESTAMP" };
    if (this.acceptKeyword("LOCALTIME")) return { type: "ContextVariable", value: "LOCALTIME" };
    if (this.acceptKeyword("LOCALTIMESTAMP")) return { type: "ContextVariable", value: "LOCALTIMESTAMP" };
    return this.notImplemented("ContextVariable");
  }

  NewSpecification() {
    this.expectKeyword("NEW");
    const name = this.SimpleIdentifier();
    return { type: "NewSpecification", name };
  }

  SequenceExpression() {
    let kind;
    if (this.acceptKeyword("NEXT")) kind = "NEXT";
    else if (this.acceptKeyword("CURRENT")) kind = "CURRENT";
    else return this.notImplemented("SequenceExpression");
    this.expectKeyword("VALUE");
    this.expectKeyword("FOR");
    const name = this.CompoundIdentifier();
    return { type: "SequenceExpression", kind, name };
  }

  SimpleIdentifierOrList() {
    if (this.peek().type === "IDENT") {
      return this.SimpleIdentifier();
    }
    return this.ParenthesizedSimpleIdentifierList();
  }

  PatternExpression() {
    let left = this.PatternTerm();
    const terms = [left];
    while (this.acceptSymbol("|")) {
      terms.push(this.PatternTerm());
    }
    return { type: "PatternExpression", terms };
  }

  PatternTerm() {
    const factors = [];
    while (true) {
      const save = this.pos;
      try {
        const f = this.PatternFactor();
        if (!f) {
          this.pos = save;
          break;
        }
        factors.push(f);
      } catch {
        this.pos = save;
        break;
      }
    }
    return { type: "PatternTerm", factors };
  }

  PatternFactor() {
    const primary = this.PatternPrimary();
    let quantifier = null;
    if (this.acceptSymbol("*")) quantifier = { kind: "*" };
    else if (this.acceptSymbol("+")) quantifier = { kind: "+" };
    else if (this.acceptSymbol("?")) quantifier = { kind: "?" };
    else if (this.acceptSymbol("{")) {
      if (this.acceptSymbol(",")) {
        const max = this.UnsignedNumericLiteral();
        this.expectSymbol("}");
        quantifier = { kind: "range", min: null, max };
      } else {
        const min = this.UnsignedNumericLiteral();
        let max = null;
        if (this.acceptSymbol(",")) {
          if (!this.isSymbol("}")) {
            max = this.UnsignedNumericLiteral();
          }
        }
        this.expectSymbol("}");
        quantifier = { kind: "range", min, max };
      }
    } else if (this.acceptSymbol("{")) {
      this.expectSymbol("-");
      const expr = this.PatternExpression();
      this.expectSymbol("-");
      this.expectSymbol("}");
      quantifier = { kind: "group", expr };
    }
    let reluctant = false;
    if (this.acceptSymbol("?")) reluctant = true;
    return { type: "PatternFactor", primary, quantifier, reluctant };
  }

  PatternPrimary() {
    if (this.peek().type === "IDENT") {
      return { type: "PatternPrimary", kind: "IDENT", value: this.SimpleIdentifier() };
    }
    if (this.acceptSymbol("(")) {
      const expr = this.PatternExpression();
      this.expectSymbol(")");
      return { type: "PatternPrimary", kind: "GROUP", expr };
    }
    if (this.acceptSymbol("{")) {
      this.expectSymbol("-");
      const expr = this.PatternExpression();
      this.expectSymbol("-");
      this.expectSymbol("}");
      return { type: "PatternPrimary", kind: "NEGATED", expr };
    }
    if (this.acceptKeyword("PERMUTE")) {
      this.expectSymbol("(");
      const exprs = [this.PatternExpression()];
      while (this.acceptSymbol(",")) {
        exprs.push(this.PatternExpression());
      }
      this.expectSymbol(")");
      return { type: "PatternPrimary", kind: "PERMUTE", exprs };
    }
    return this.notImplemented("PatternPrimary");
  }

  PatternDefinition() {
    const name = this.SimpleIdentifier();
    this.expectKeyword("AS");
    const expr = this.Expression();
    return { type: "PatternDefinition", name, expr };
  }

  StringLiteral() {
    const t = this.peek();
    if (t.type !== "STRING") {
      throw new Error(`Expected string but got ${t.type}:${t.value}`);
    }
    this.next();
    return { type: "StringLiteral", value: t.value };
  }

  SimpleStringLiteral() {
    return this.StringLiteral();
  }

  UnsignedIntLiteral() {
    const t = this.peek();
    if (t.type !== "NUMBER" || !/^[0-9]+$/.test(String(t.value))) {
      throw new Error(`Expected unsigned integer but got ${t.type}:${t.value}`);
    }
    this.next();
    return { type: "UnsignedIntLiteral", value: t.value };
  }

  IntLiteral() {
    let sign = null;
    if (this.acceptSymbol("+")) sign = "+";
    else if (this.acceptSymbol("-")) sign = "-";
    const value = this.UnsignedIntLiteral();
    return { type: "IntLiteral", sign, value };
  }

  UnsignedNumericLiteralOrParam() {
    if (this.isSymbol("?") || (this.isSymbol(":") && this.peekN(1).type === "NUMBER")) {
      return this.DynamicParam();
    }
    return this.UnsignedNumericLiteral();
  }

  TimeUnitOrName() {
    const unit = this.TimeUnit();
    if (unit) return unit;
    return this.SimpleIdentifier();
  }

  TimeUnit() {
    const units = [
      "NANOSECOND", "MICROSECOND", "MILLISECOND", "SECOND",
      "MINUTE", "HOUR", "DAY", "DAYOFWEEK", "DAYOFYEAR", "DOW", "DOY",
      "ISODOW", "ISOYEAR", "MONTH", "QUARTER", "YEAR",
      "EPOCH", "DECADE", "CENTURY", "MILLENNIUM",
    ];
    for (const u of units) {
      if (this.acceptKeyword(u)) return { type: "TimeUnit", unit: u };
    }
    if (this.acceptKeyword("WEEK")) {
      let weekday = null;
      if (this.acceptSymbol("(")) {
        weekday = this.weekdayName();
        this.expectSymbol(")");
      }
      return { type: "TimeUnit", unit: "WEEK", weekday };
    }
    return null;
  }

  weekdayName() {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    for (const d of days) {
      if (this.acceptKeyword(d)) return { type: "weekdayName", value: d };
    }
    return this.notImplemented("weekdayName");
  }

  Year() {
    if (this.acceptKeyword("YEAR")) return { type: "Year", value: "YEAR" };
    if (this.acceptKeyword("YEARS")) return { type: "Year", value: "YEARS" };
    return this.notImplemented("Year");
  }

  Quarter() {
    if (this.acceptKeyword("QUARTER")) return { type: "Quarter", value: "QUARTER" };
    if (this.acceptKeyword("QUARTERS")) return { type: "Quarter", value: "QUARTERS" };
    return this.notImplemented("Quarter");
  }

  Month() {
    if (this.acceptKeyword("MONTH")) return { type: "Month", value: "MONTH" };
    if (this.acceptKeyword("MONTHS")) return { type: "Month", value: "MONTHS" };
    return this.notImplemented("Month");
  }

  Week() {
    if (this.acceptKeyword("WEEK")) return { type: "Week", value: "WEEK" };
    if (this.acceptKeyword("WEEKS")) return { type: "Week", value: "WEEKS" };
    return this.notImplemented("Week");
  }

  Day() {
    if (this.acceptKeyword("DAY")) return { type: "Day", value: "DAY" };
    if (this.acceptKeyword("DAYS")) return { type: "Day", value: "DAYS" };
    return this.notImplemented("Day");
  }

  Hour() {
    if (this.acceptKeyword("HOUR")) return { type: "Hour", value: "HOUR" };
    if (this.acceptKeyword("HOURS")) return { type: "Hour", value: "HOURS" };
    return this.notImplemented("Hour");
  }

  Minute() {
    if (this.acceptKeyword("MINUTE")) return { type: "Minute", value: "MINUTE" };
    if (this.acceptKeyword("MINUTES")) return { type: "Minute", value: "MINUTES" };
    return this.notImplemented("Minute");
  }

  Second() {
    if (this.acceptKeyword("SECOND")) return { type: "Second", value: "SECOND" };
    if (this.acceptKeyword("SECONDS")) return { type: "Second", value: "SECONDS" };
    return this.notImplemented("Second");
  }

  IntervalWithoutQualifier() {
    this.expectKeyword("INTERVAL");
    return { type: "IntervalWithoutQualifier" };
  }

  JsonRepresentation() {
    this.expectKeyword("JSON");
    let encoding = null;
    if (this.acceptKeyword("ENCODING")) {
      if (this.acceptKeyword("UTF8")) encoding = "UTF8";
      else if (this.acceptKeyword("UTF16")) encoding = "UTF16";
      else if (this.acceptKeyword("UTF32")) encoding = "UTF32";
      else {
        const t = this.peek();
        throw new Error(`Expected UTF8|UTF16|UTF32 but got ${t.type}:${t.value}`);
      }
    }
    return { type: "JsonRepresentation", encoding };
  }

  JsonInputClause() {
    this.expectKeyword("FORMAT");
    const json = this.JsonRepresentation();
    return { type: "JsonInputClause", json };
  }

  JsonPathSpec() {
    return this.StringLiteral();
  }

  JsonName() {
    return this.Expression();
  }

  JsonNameAndValue() {
    let key = false;
    if (this.acceptKeyword("KEY")) key = true;
    const name = this.JsonName();
    let separator;
    if (this.acceptKeyword("VALUE")) separator = "VALUE";
    else if (this.acceptSymbol(",")) separator = ",";
    else if (this.acceptSymbol(":")) separator = ":";
    else return this.notImplemented("JsonNameAndValue");
    const value = this.Expression();
    return { type: "JsonNameAndValue", key, name, separator, value };
  }

  JsonConstructorNullClause() {
    if (this.acceptKeyword("NULL")) {
      this.expectKeyword("ON");
      this.expectKeyword("NULL");
      return { type: "JsonConstructorNullClause", value: "NULL ON NULL" };
    }
    if (this.acceptKeyword("ABSENT")) {
      this.expectKeyword("ON");
      this.expectKeyword("NULL");
      return { type: "JsonConstructorNullClause", value: "ABSENT ON NULL" };
    }
    return null;
  }

  JsonOutputClause() {
    const returning = this.JsonReturningClause();
    let format = null;
    if (this.acceptKeyword("FORMAT")) {
      format = this.JsonRepresentation();
    }
    return { type: "JsonOutputClause", returning, format };
  }

  LambdaExpression() {
    const params = this.SimpleIdentifierOrListOrEmpty();
    this.expectSymbol("->");
    const body = this.Expression();
    return { type: "LambdaExpression", params, body };
  }

  PeriodConstructor() {
    this.expectKeyword("PERIOD");
    this.expectSymbol("(");
    const start = this.Expression();
    this.expectSymbol(",");
    const end = this.Expression();
    this.expectSymbol(")");
    return { type: "PeriodConstructor", start, end };
  }

  ArrayLiteral() {
    this.expectSymbol("{");
    let items = [];
    if (!this.isSymbol("}")) {
      if (this.isSymbol("{")) {
        items.push(this.ArrayLiteral());
        while (this.acceptSymbol(",")) {
          items.push(this.ArrayLiteral());
        }
      } else {
        items.push(this.Literal());
        while (this.acceptSymbol(",")) {
          items.push(this.Literal());
        }
      }
    }
    this.expectSymbol("}");
    return { type: "ArrayLiteral", items };
  }

  PrecisionOpt() {
    if (!this.acceptSymbol("(")) return null;
    const value = this.UnsignedIntLiteral();
    this.expectSymbol(")");
    return { type: "Precision", value };
  }

  NullableOptDefaultTrue() {
    if (this.acceptKeyword("NOT")) {
      this.expectKeyword("NULL");
      return false;
    }
    if (this.acceptKeyword("NULL")) {
      return true;
    }
    return true;
  }

  NullableOptDefaultFalse() {
    if (this.acceptKeyword("NOT")) {
      this.expectKeyword("NULL");
      return false;
    }
    if (this.acceptKeyword("NULL")) {
      return true;
    }
    return false;
  }

  JsonArrayAggOrderByClause() {
    return this.OrderBy();
  }

  ContainsSubstrFunctionCall() {
    this.expectKeyword("CONTAINS_SUBSTR");
    this.expectSymbol("(");
    const haystack = this.Expression();
    this.expectSymbol(",");
    const needle = this.Expression();
    let jsonScope = null;
    if (this.acceptSymbol(",")) {
      this.expectKeyword("JSON_SCOPE");
      if (this.acceptSymbol(":=")) {
        jsonScope = this.Expression();
      } else {
        this.expectSymbol(":");
        this.expectSymbol("=");
        jsonScope = this.Expression();
      }
    }
    this.expectSymbol(")");
    return { type: "ContainsSubstrFunctionCall", haystack, needle, jsonScope };
  }

  DateDiffFunctionCall() {
    this.expectKeyword("DATE_DIFF");
    this.expectSymbol("(");
    const left = this.Expression();
    this.expectSymbol(",");
    const right = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "DateDiffFunctionCall", left, right, unit };
  }

  TimestampAddFunctionCall() {
    this.expectKeyword("TIMESTAMPADD");
    this.expectSymbol("(");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(",");
    const interval = this.Expression();
    this.expectSymbol(",");
    const ts = this.Expression();
    this.expectSymbol(")");
    return { type: "TimestampAddFunctionCall", unit, interval, ts };
  }

  TimestampDiffFunctionCall() {
    this.expectKeyword("TIMESTAMPDIFF");
    this.expectSymbol("(");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(",");
    const left = this.Expression();
    this.expectSymbol(",");
    const right = this.Expression();
    this.expectSymbol(")");
    return { type: "TimestampDiffFunctionCall", unit, left, right };
  }

  TimestampDiff3FunctionCall() {
    this.expectKeyword("TIMESTAMP_DIFF");
    this.expectSymbol("(");
    const left = this.Expression();
    this.expectSymbol(",");
    const right = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "TimestampDiff3FunctionCall", left, right, unit };
  }

  DatetimeDiffFunctionCall() {
    this.expectKeyword("DATETIME_DIFF");
    this.expectSymbol("(");
    const left = this.Expression();
    this.expectSymbol(",");
    const right = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "DatetimeDiffFunctionCall", left, right, unit };
  }

  DateTruncFunctionCall() {
    this.expectKeyword("DATE_TRUNC");
    this.expectSymbol("(");
    const expr = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "DateTruncFunctionCall", expr, unit };
  }

  DatetimeTruncFunctionCall() {
    this.expectKeyword("DATETIME_TRUNC");
    this.expectSymbol("(");
    const expr = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "DatetimeTruncFunctionCall", expr, unit };
  }

  TimestampTruncFunctionCall() {
    this.expectKeyword("TIMESTAMP_TRUNC");
    this.expectSymbol("(");
    const expr = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "TimestampTruncFunctionCall", expr, unit };
  }

  TimeDiffFunctionCall() {
    this.expectKeyword("TIME_DIFF");
    this.expectSymbol("(");
    const left = this.Expression();
    this.expectSymbol(",");
    const right = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "TimeDiffFunctionCall", left, right, unit };
  }

  TimeTruncFunctionCall() {
    this.expectKeyword("TIME_TRUNC");
    this.expectSymbol("(");
    const expr = this.Expression();
    this.expectSymbol(",");
    const unit = this.TimeUnitOrName();
    this.expectSymbol(")");
    return { type: "TimeTruncFunctionCall", expr, unit };
  }

  DateTimeConstructorCall() {
    const keyword = String(this.next().value).toUpperCase();
    const params = this.FunctionParameterList();
    return { type: "DateTimeConstructorCall", keyword, params };
  }

  FloorCeilOptions() {
    return this.notImplemented("FloorCeilOptions");
  }

  StandardFloorCeilOptions() {
    return this.notImplemented("StandardFloorCeilOptions");
  }

  JdbcOdbcDataTypeName() {
    const names = [
      "SQL_CHAR", "CHAR", "SQL_VARCHAR", "VARCHAR",
      "SQL_DATE", "DATE", "SQL_TIME", "TIME",
      "SQL_TIMESTAMP", "TIMESTAMP",
      "SQL_DECIMAL", "DECIMAL", "SQL_NUMERIC", "NUMERIC",
      "SQL_BOOLEAN", "BOOLEAN",
      "SQL_INTEGER", "INTEGER", "SQL_BINARY", "BINARY",
      "SQL_VARBINARY", "VARBINARY", "SQL_TINYINT", "TINYINT",
      "SQL_SMALLINT", "SMALLINT", "SQL_BIGINT", "BIGINT",
      "SQL_REAL", "REAL", "SQL_DOUBLE", "DOUBLE",
      "SQL_FLOAT", "FLOAT",
      "SQL_INTERVAL_YEAR", "SQL_INTERVAL_YEAR_TO_MONTH",
      "SQL_INTERVAL_MONTH", "SQL_INTERVAL_DAY",
      "SQL_INTERVAL_DAY_TO_HOUR", "SQL_INTERVAL_DAY_TO_MINUTE",
      "SQL_INTERVAL_DAY_TO_SECOND", "SQL_INTERVAL_HOUR",
      "SQL_INTERVAL_HOUR_TO_MINUTE", "SQL_INTERVAL_HOUR_TO_SECOND",
      "SQL_INTERVAL_MINUTE", "SQL_INTERVAL_MINUTE_TO_SECOND",
      "SQL_INTERVAL_SECOND",
    ];
    for (const n of names) {
      if (this.acceptKeyword(n)) {
        return { type: "JdbcOdbcDataTypeName", value: n };
      }
    }
    return this.notImplemented("JdbcOdbcDataTypeName");
  }

  JdbcOdbcDataType() {
    const name = this.JdbcOdbcDataTypeName();
    return { type: "JdbcOdbcDataType", name };
  }

  CollectionsTypeName() {
    const dataType = this.DataType();
    let kind;
    if (this.acceptKeyword("MULTISET")) kind = "MULTISET";
    else if (this.acceptKeyword("ARRAY")) kind = "ARRAY";
    else return this.notImplemented("CollectionsTypeName");
    return { type: "CollectionsTypeName", dataType, kind };
  }

  CollateClause() {
    this.expectKeyword("COLLATE");
    const name = this.SimpleIdentifier();
    return { type: "CollateClause", name };
  }

  UnusedExtension() {
    return { type: "UnusedExtension" };
  }

  MeasureColumnCommaList() {
    const items = [this.AddMeasureColumn()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddMeasureColumn());
    }
    return { type: "MeasureColumnCommaList", items };
  }

  SubsetDefinitionCommaList() {
    const items = [this.AddSubsetDefinition()];
    while (this.acceptSymbol(",")) {
      items.push(this.AddSubsetDefinition());
    }
    return { type: "SubsetDefinitionCommaList", items };
  }

  PatternDefinitionCommaList() {
    const items = [this.PatternDefinition()];
    while (this.acceptSymbol(",")) {
      items.push(this.PatternDefinition());
    }
    return { type: "PatternDefinitionCommaList", items };
  }

  Natural() {
    if (this.acceptKeyword("NATURAL")) return { type: "Natural", value: "NATURAL" };
    return { type: "Natural", value: "DEFAULT" };
  }

  Scope() {
    if (this.acceptKeyword("SYSTEM")) return { type: "Scope", value: "SYSTEM" };
    if (this.acceptKeyword("SESSION")) return { type: "Scope", value: "SESSION" };
    return this.notImplemented("Scope");
  }

  comp() {
    if (this.acceptSymbol("<")) return "<";
    if (this.acceptSymbol("<=")) return "<=";
    if (this.acceptSymbol(">")) return ">";
    if (this.acceptSymbol(">=")) return ">=";
    if (this.acceptSymbol("=")) return "=";
    if (this.acceptSymbol("<>")) return "<>";
    if (this.acceptSymbol("!=")) return "!=";
    return this.notImplemented("comp");
  }

  periodOperator() {
    return { type: "periodOperator" };
  }

}

module.exports = {
  CalciteLexer,
  CalciteParser,
};

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
    const lexer = new CalciteLexer(src);
    const tokens = lexer.tokenize();
    const parser = new CalciteParser(tokens);
    try {
      parser.SqlStmtList();
      console.log(`OK: ${src}`);
    } catch (e) {
      console.error(`NG: ${src} -> ${e.message}`);
    }
  }
}
