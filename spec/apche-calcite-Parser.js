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
      const twoOps = ["<=", ">=", "<>", "!=", "||", "::", "->"];
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
    return this.notImplemented("SqlSetOption");
  }

  SqlAlter() {
    return this.notImplemented("SqlAlter");
  }

  SqlExplain() {
    return this.notImplemented("SqlExplain");
  }

  ExplainDetailLevel() {
    return this.notImplemented("ExplainDetailLevel");
  }

  ExplainDepth() {
    return this.notImplemented("ExplainDepth");
  }

  SqlQueryOrDml() {
    return this.notImplemented("SqlQueryOrDml");
  }

  SqlDescribe() {
    return this.notImplemented("SqlDescribe");
  }

  SqlProcedureCall() {
    return this.notImplemented("SqlProcedureCall");
  }

  SqlInsert() {
    return this.notImplemented("SqlInsert");
  }

  SqlInsertKeywords() {
    return this.notImplemented("SqlInsertKeywords");
  }

  SqlDelete() {
    return this.notImplemented("SqlDelete");
  }

  SqlUpdate() {
    return this.notImplemented("SqlUpdate");
  }

  SqlMerge() {
    return this.notImplemented("SqlMerge");
  }

  WhenMatchedClause() {
    return this.notImplemented("WhenMatchedClause");
  }

  WhenNotMatchedClause() {
    return this.notImplemented("WhenNotMatchedClause");
  }

  Where() {
    return this.notImplemented("Where");
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
    return this.notImplemented("LeafQuery");
  }

  ExplicitTable() {
    return this.notImplemented("ExplicitTable");
  }

  TableConstructor() {
    return this.notImplemented("TableConstructor");
  }

  RowConstructor() {
    return this.notImplemented("RowConstructor");
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
    // hints and SqlSelectKeywords are dialect-specific; skip here.
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
    return this.notImplemented("GroupingElementList");
  }

  WindowSpecification() {
    return this.notImplemented("WindowSpecification");
  }

  WindowRange() {
    return this.notImplemented("WindowRange");
  }

  WindowExclusion() {
    return this.notImplemented("WindowExclusion");
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
    return this.notImplemented("LimitClause");
  }

  OffsetClause() {
    return this.notImplemented("OffsetClause");
  }

  FetchClause() {
    return this.notImplemented("FetchClause");
  }

  FromClause() {
    return this.notImplemented("FromClause");
  }

  JoinOrCommaTable() {
    return this.notImplemented("JoinOrCommaTable");
  }

  JoinType() {
    return this.notImplemented("JoinType");
  }

  JoinTable() {
    return this.notImplemented("JoinTable");
  }

  TableRef() {
    return this.notImplemented("TableRef");
  }

  TableRef1() {
    return this.notImplemented("TableRef1");
  }

  TableRef2() {
    return this.notImplemented("TableRef2");
  }

  TableRef3() {
    return this.notImplemented("TableRef3");
  }

  Snapshot() {
    return this.notImplemented("Snapshot");
  }

  ExtendTable() {
    return this.notImplemented("ExtendTable");
  }

  ExtendList() {
    return this.notImplemented("ExtendList");
  }

  Tablesample() {
    return this.notImplemented("Tablesample");
  }

  Pivot() {
    return this.notImplemented("Pivot");
  }

  Unpivot() {
    return this.notImplemented("Unpivot");
  }

  MatchRecognize() {
    return this.notImplemented("MatchRecognize");
  }

  Expression() {
    return this.Expression2();
  }

  Expression2() {
    let left = this.AddExpression2b();
    while (true) {
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
    return this.notImplemented("BinaryRowOperator");
  }

  BinaryMultisetOperator() {
    return this.notImplemented("BinaryMultisetOperator");
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
      return this.notImplemented("PostfixRowOperator");
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
    if (this.isKeyword("CAST") || this.isKeyword("SAFE_CAST") || this.isKeyword("TRY_CAST")) {
      return this.BuiltinFunctionCall();
    }
    if (t.type === "IDENT" || this.isKeyword("SPECIFIC")) {
      const save = this.pos;
      const fn = this.NamedFunctionCall();
      if (fn) return fn;
      this.pos = save;
    }
    if (t.type === "STRING" || t.type === "NUMBER") {
      return this.Literal();
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
    if (t.type === "IDENT") {
      return this.CompoundIdentifier();
    }
    return this.notImplemented("AtomicRowExpression");
  }

  BuiltinFunctionCall() {
    const keyword = String(this.next().value).toUpperCase();
    this.expectSymbol("(");
    const expr = this.Expression();
    let asType = null;
    if (this.acceptKeyword("AS")) {
      asType = this.CompoundIdentifier();
    }
    this.expectSymbol(")");
    return { type: "BuiltinFunctionCall", keyword, expr, asType };
  }

  JsonApiCommonSyntax() {
    return this.notImplemented("JsonApiCommonSyntax");
  }

  JsonReturningClause() {
    return this.notImplemented("JsonReturningClause");
  }

  JsonExistsFunctionCall() {
    return this.notImplemented("JsonExistsFunctionCall");
  }

  JsonExistsErrorBehavior() {
    return this.notImplemented("JsonExistsErrorBehavior");
  }

  JsonValueFunctionCall() {
    return this.notImplemented("JsonValueFunctionCall");
  }

  JsonValueEmptyOrErrorBehavior() {
    return this.notImplemented("JsonValueEmptyOrErrorBehavior");
  }

  JsonQueryFunctionCall() {
    return this.notImplemented("JsonQueryFunctionCall");
  }

  JsonQueryWrapperBehavior() {
    return this.notImplemented("JsonQueryWrapperBehavior");
  }

  JsonQueryEmptyOrErrorBehavior() {
    return this.notImplemented("JsonQueryEmptyOrErrorBehavior");
  }

  JsonObjectFunctionCall() {
    return this.notImplemented("JsonObjectFunctionCall");
  }

  JsonObjectAggFunctionCall() {
    return this.notImplemented("JsonObjectAggFunctionCall");
  }

  JsonArrayFunctionCall() {
    return this.notImplemented("JsonArrayFunctionCall");
  }

  JsonArrayAggFunctionCall() {
    return this.notImplemented("JsonArrayAggFunctionCall");
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
    return this.notImplemented("MultisetConstructor");
  }

  ArrayConstructor() {
    return this.notImplemented("ArrayConstructor");
  }

  MapConstructor() {
    return this.notImplemented("MapConstructor");
  }

  DataType() {
    return this.notImplemented("DataType");
  }

  TypeName() {
    return this.notImplemented("TypeName");
  }

  SqlTypeName() {
    return this.notImplemented("SqlTypeName");
  }

  SqlTypeName1() {
    return this.notImplemented("SqlTypeName1");
  }

  SqlTypeName2() {
    return this.notImplemented("SqlTypeName2");
  }

  SqlTypeName3() {
    return this.notImplemented("SqlTypeName3");
  }

  CharacterTypeName() {
    return this.notImplemented("CharacterTypeName");
  }

  DateTimeTypeName() {
    return this.notImplemented("DateTimeTypeName");
  }

  TimeZoneOpt() {
    return this.notImplemented("TimeZoneOpt");
  }

  RowTypeName() {
    return this.notImplemented("RowTypeName");
  }

  MapTypeName() {
    return this.notImplemented("MapTypeName");
  }

  Literal() {
    const t = this.peek();
    if (t.type === "STRING") return this.StringLiteral();
    if (t.type === "NUMBER") return this.NumericLiteral();
    return this.notImplemented("Literal");
  }

  LiteralOrIntervalExpression() {
    return this.Literal();
  }

  IntervalLiteralOrExpression() {
    return this.notImplemented("IntervalLiteralOrExpression");
  }

  NonIntervalLiteral() {
    return this.notImplemented("NonIntervalLiteral");
  }

  NumericLiteral() {
    const t = this.peek();
    if (t.type !== "NUMBER") {
      throw new Error(`Expected number but got ${t.type}:${t.value}`);
    }
    this.next();
    return { type: "NumericLiteral", value: t.value };
  }

  UnsignedNumericLiteral() {
    return this.notImplemented("UnsignedNumericLiteral");
  }

  SpecialLiteral() {
    return this.notImplemented("SpecialLiteral");
  }

  DateTimeLiteral() {
    return this.notImplemented("DateTimeLiteral");
  }

  IntervalLiteral() {
    return this.notImplemented("IntervalLiteral");
  }

  IntervalQualifier() {
    return this.notImplemented("IntervalQualifier");
  }

  IntervalQualifierStart() {
    return this.notImplemented("IntervalQualifierStart");
  }

  AddSetOpQuery() {
    return this.notImplemented("AddSetOpQuery");
  }

  BinaryQueryOperator() {
    return this.notImplemented("BinaryQueryOperator");
  }

  AddSetOpQueryOrExpr() {
    return this.notImplemented("AddSetOpQueryOrExpr");
  }

  Query() {
    return this.notImplemented("Query");
  }

  SqlQueryEof() {
    return this.notImplemented("SqlQueryEof");
  }

  ExprOrJoinOrOrderedQuery() {
    return this.notImplemented("ExprOrJoinOrOrderedQuery");
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
    return this.notImplemented("ParenthesizedQueryOrCommaList");
  }

  ParenthesizedQueryOrCommaListWithDefault() {
    return this.notImplemented("ParenthesizedQueryOrCommaListWithDefault");
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
    return this.notImplemented("CompoundTableIdentifier");
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
    return this.notImplemented("SimpleIdentifierFromStringLiteral");
  }

  ParenthesizedCompoundIdentifierList() {
    return this.notImplemented("ParenthesizedCompoundIdentifierList");
  }

  NotNullOpt() {
    return this.notImplemented("NotNullOpt");
  }

  TableHints() {
    return this.notImplemented("TableHints");
  }

  SqlSelectKeywords() {
    return this.notImplemented("SqlSelectKeywords");
  }

  ParenthesizedLiteralOptionCommaList() {
    return this.notImplemented("ParenthesizedLiteralOptionCommaList");
  }

  ParenthesizedKeyValueOptionCommaList() {
    return this.notImplemented("ParenthesizedKeyValueOptionCommaList");
  }

  GroupBy() {
    return this.notImplemented("GroupBy");
  }

  Having() {
    return this.notImplemented("Having");
  }

  Window() {
    return this.notImplemented("Window");
  }

  Qualify() {
    return this.notImplemented("Qualify");
  }

  TableOverOpt() {
    return this.notImplemented("TableOverOpt");
  }

  Over() {
    return this.notImplemented("Over");
  }

  ExtendedTableRef() {
    return this.notImplemented("ExtendedTableRef");
  }

  TableFunctionCall() {
    return this.notImplemented("TableFunctionCall");
  }

  ImplicitTableFunctionCallArgs() {
    return this.notImplemented("ImplicitTableFunctionCallArgs");
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
    return this.notImplemented("AddExpressions");
  }

  AddGroupingElement() {
    return this.notImplemented("AddGroupingElement");
  }

  AddWindowSpec() {
    return this.notImplemented("AddWindowSpec");
  }

  AddWithItem() {
    return this.notImplemented("AddWithItem");
  }

  AddSelectItem() {
    return this.notImplemented("AddSelectItem");
  }

  AddRowConstructor() {
    return this.notImplemented("AddRowConstructor");
  }

  AddSimpleIdentifiers() {
    return this.notImplemented("AddSimpleIdentifiers");
  }

  AddIdentifierSegment() {
    return this.notImplemented("AddIdentifierSegment");
  }

  AddTableIdentifierSegment() {
    return this.notImplemented("AddTableIdentifierSegment");
  }

  AddOrderItem() {
    return this.notImplemented("AddOrderItem");
  }

  AddMeasureColumn() {
    return this.notImplemented("AddMeasureColumn");
  }

  AddSubsetDefinition() {
    return this.notImplemented("AddSubsetDefinition");
  }

  AddPivotAgg() {
    return this.notImplemented("AddPivotAgg");
  }

  AddPivotValue() {
    return this.notImplemented("AddPivotValue");
  }

  AddUnpivotValue() {
    return this.notImplemented("AddUnpivotValue");
  }

  AddKeyValueOption() {
    return this.notImplemented("AddKeyValueOption");
  }

  AddOptionValue() {
    return this.notImplemented("AddOptionValue");
  }

  AddColumnType() {
    return this.notImplemented("AddColumnType");
  }

  AddCompoundIdentifierType() {
    return this.notImplemented("AddCompoundIdentifierType");
  }

  AddCompoundIdentifierTypes() {
    return this.notImplemented("AddCompoundIdentifierTypes");
  }

  AddHint() {
    return this.notImplemented("AddHint");
  }

  Default() {
    return this.notImplemented("Default");
  }

  TableParam() {
    return this.notImplemented("TableParam");
  }

  PartitionedQueryOrQueryOrExpr() {
    return this.notImplemented("PartitionedQueryOrQueryOrExpr");
  }

  PartitionedByAndOrderBy() {
    return this.notImplemented("PartitionedByAndOrderBy");
  }

  OrderByOfSetSemanticsTable() {
    return this.notImplemented("OrderByOfSetSemanticsTable");
  }

  NamedFunctionCall() {
    const namedCall = this.NamedCall();
    if (!namedCall) return null;
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
    return { type: "NamedFunctionCall", namedCall, filter, over };
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
    return this.notImplemented("ReservedFunctionName");
  }

  NonReservedJdbcFunctionName() {
    return this.notImplemented("NonReservedJdbcFunctionName");
  }

  NonReservedKeyWord() {
    return this.notImplemented("NonReservedKeyWord");
  }

  NonReservedKeyWord0of3() {
    return this.notImplemented("NonReservedKeyWord0of3");
  }

  NonReservedKeyWord1of3() {
    return this.notImplemented("NonReservedKeyWord1of3");
  }

  NonReservedKeyWord2of3() {
    return this.notImplemented("NonReservedKeyWord2of3");
  }

  StringAggFunctionCall() {
    return this.notImplemented("StringAggFunctionCall");
  }

  PercentileFunctionCall() {
    return this.notImplemented("PercentileFunctionCall");
  }

  GroupByWindowingCall() {
    return this.notImplemented("GroupByWindowingCall");
  }

  MatchRecognizeFunctionCall() {
    return this.notImplemented("MatchRecognizeFunctionCall");
  }

  MatchRecognizeCallWithModifier() {
    return this.notImplemented("MatchRecognizeCallWithModifier");
  }

  MatchRecognizeNavigationLogical() {
    return this.notImplemented("MatchRecognizeNavigationLogical");
  }

  MatchRecognizeNavigationPhysical() {
    return this.notImplemented("MatchRecognizeNavigationPhysical");
  }

  withinDistinct() {
    return this.notImplemented("withinDistinct");
  }

  withinGroup() {
    return this.notImplemented("withinGroup");
  }

  NullTreatment() {
    return this.notImplemented("NullTreatment");
  }

  nullTreatment() {
    return this.notImplemented("nullTreatment");
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
    return this.notImplemented("ContextVariable");
  }

  NewSpecification() {
    return this.notImplemented("NewSpecification");
  }

  SequenceExpression() {
    return this.notImplemented("SequenceExpression");
  }

  SimpleIdentifierOrList() {
    return this.notImplemented("SimpleIdentifierOrList");
  }

  PatternExpression() {
    return this.notImplemented("PatternExpression");
  }

  PatternTerm() {
    return this.notImplemented("PatternTerm");
  }

  PatternFactor() {
    return this.notImplemented("PatternFactor");
  }

  PatternPrimary() {
    return this.notImplemented("PatternPrimary");
  }

  PatternDefinition() {
    return this.notImplemented("PatternDefinition");
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
    return this.notImplemented("SimpleStringLiteral");
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
    return this.notImplemented("IntLiteral");
  }

  UnsignedNumericLiteralOrParam() {
    return this.notImplemented("UnsignedNumericLiteralOrParam");
  }

  TimeUnitOrName() {
    return this.notImplemented("TimeUnitOrName");
  }

  TimeUnit() {
    return this.notImplemented("TimeUnit");
  }

  weekdayName() {
    return this.notImplemented("weekdayName");
  }

  Year() {
    return this.notImplemented("Year");
  }

  Quarter() {
    return this.notImplemented("Quarter");
  }

  Month() {
    return this.notImplemented("Month");
  }

  Week() {
    return this.notImplemented("Week");
  }

  Day() {
    return this.notImplemented("Day");
  }

  Hour() {
    return this.notImplemented("Hour");
  }

  Minute() {
    return this.notImplemented("Minute");
  }

  Second() {
    return this.notImplemented("Second");
  }

  IntervalWithoutQualifier() {
    return this.notImplemented("IntervalWithoutQualifier");
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
    return this.notImplemented("JsonInputClause");
  }

  JsonPathSpec() {
    return this.notImplemented("JsonPathSpec");
  }

  JsonName() {
    return this.notImplemented("JsonName");
  }

  JsonNameAndValue() {
    return this.notImplemented("JsonNameAndValue");
  }

  JsonConstructorNullClause() {
    return this.notImplemented("JsonConstructorNullClause");
  }

  JsonOutputClause() {
    return this.notImplemented("JsonOutputClause");
  }

  LambdaExpression() {
    const params = this.SimpleIdentifierOrListOrEmpty();
    this.expectSymbol("->");
    const body = this.Expression();
    return { type: "LambdaExpression", params, body };
  }

  PeriodConstructor() {
    return this.notImplemented("PeriodConstructor");
  }

  ArrayLiteral() {
    return this.notImplemented("ArrayLiteral");
  }

  PrecisionOpt() {
    return this.notImplemented("PrecisionOpt");
  }

  NullableOptDefaultTrue() {
    return this.notImplemented("NullableOptDefaultTrue");
  }

  NullableOptDefaultFalse() {
    return this.notImplemented("NullableOptDefaultFalse");
  }

  JsonArrayAggOrderByClause() {
    return this.notImplemented("JsonArrayAggOrderByClause");
  }

  ContainsSubstrFunctionCall() {
    return this.notImplemented("ContainsSubstrFunctionCall");
  }

  DateDiffFunctionCall() {
    return this.notImplemented("DateDiffFunctionCall");
  }

  TimestampAddFunctionCall() {
    return this.notImplemented("TimestampAddFunctionCall");
  }

  TimestampDiffFunctionCall() {
    return this.notImplemented("TimestampDiffFunctionCall");
  }

  TimestampDiff3FunctionCall() {
    return this.notImplemented("TimestampDiff3FunctionCall");
  }

  DatetimeDiffFunctionCall() {
    return this.notImplemented("DatetimeDiffFunctionCall");
  }

  DateTruncFunctionCall() {
    return this.notImplemented("DateTruncFunctionCall");
  }

  DatetimeTruncFunctionCall() {
    return this.notImplemented("DatetimeTruncFunctionCall");
  }

  TimestampTruncFunctionCall() {
    return this.notImplemented("TimestampTruncFunctionCall");
  }

  TimeDiffFunctionCall() {
    return this.notImplemented("TimeDiffFunctionCall");
  }

  TimeTruncFunctionCall() {
    return this.notImplemented("TimeTruncFunctionCall");
  }

  DateTimeConstructorCall() {
    return this.notImplemented("DateTimeConstructorCall");
  }

  FloorCeilOptions() {
    return this.notImplemented("FloorCeilOptions");
  }

  StandardFloorCeilOptions() {
    return this.notImplemented("StandardFloorCeilOptions");
  }

  JdbcOdbcDataTypeName() {
    return this.notImplemented("JdbcOdbcDataTypeName");
  }

  JdbcOdbcDataType() {
    return this.notImplemented("JdbcOdbcDataType");
  }

  CollectionsTypeName() {
    return this.notImplemented("CollectionsTypeName");
  }

  CollateClause() {
    return this.notImplemented("CollateClause");
  }

  UnusedExtension() {
    return this.notImplemented("UnusedExtension");
  }

  MeasureColumnCommaList() {
    return this.notImplemented("MeasureColumnCommaList");
  }

  SubsetDefinitionCommaList() {
    return this.notImplemented("SubsetDefinitionCommaList");
  }

  PatternDefinitionCommaList() {
    return this.notImplemented("PatternDefinitionCommaList");
  }

  Natural() {
    return this.notImplemented("Natural");
  }

  Scope() {
    return this.notImplemented("Scope");
  }

  comp() {
    return this.notImplemented("comp");
  }

  periodOperator() {
    return this.notImplemented("periodOperator");
  }

}

module.exports = {
  CalciteLexer,
  CalciteParser,
};

if (require.main === module) {
  const src = "SELECT 1";
  const lexer = new CalciteLexer(src);
  const tokens = lexer.tokenize();
  const parser = new CalciteParser(tokens);
  try {
    parser.SqlStmtList();
  } catch (e) {
    console.error(e.message);
  }
}
