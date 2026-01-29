/**
 * Stage 1 hand-written DDL parser based on wellknown-sql-ddl.md.
 * - Library-free lexer (mirrors apache-calcite-Parser.js style)
 * - Minimal structure-first parse for DDL with graceful raw captures
 */
'use strict';

class WellknownDdlLexer {
  constructor(input) {
    this.input = input || "";
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    const s = this.input;
    const len = s.length;
    const skipWhitespace = (p) => {
      while (p < len && /\s/.test(s[p])) p++;
      return p;
    };
    const isIdentStart = (ch) => {
      return ch === "_" || ch === "$" || /\p{L}/u.test(ch);
    };
    const isIdentPart = (ch) => {
      return ch === "_" || ch === "$" || /\p{L}|\p{Nd}/u.test(ch);
    };
    const startsWithKeywordAt = (p, keyword) => {
      const slice = s.slice(p, p + keyword.length);
      if (slice.toUpperCase() !== keyword) return false;
      const next = s[p + keyword.length];
      return !(next && /[A-Za-z0-9_]/.test(next));
    };
    const readQuotedString = (allowBackslashEscape = true) => {
      const start = this.pos;
      let value = "";
      this.pos++;
      while (this.pos < len) {
        if (s[this.pos] === "'") {
          if (s[this.pos + 1] === "'") {
            value += "'";
            this.pos += 2;
            continue;
          }
          break;
        }
        if (allowBackslashEscape && s[this.pos] === "\\" && this.pos + 1 < len) {
          value += s[this.pos + 1];
          this.pos += 2;
          continue;
        }
        value += s[this.pos++];
      }
      if (s[this.pos] === "'") this.pos++;
      return { value, start, end: this.pos };
    };
    const readQuotedIdentifier = (quote) => {
      const start = this.pos;
      let value = "";
      this.pos++;
      while (this.pos < len) {
        if (s[this.pos] === quote) {
          if (s[this.pos + 1] === quote) {
            value += quote;
            this.pos += 2;
            continue;
          }
          break;
        }
        value += s[this.pos++];
      }
      if (s[this.pos] === quote) this.pos++;
      return { value, start, end: this.pos };
    };
    const readDoubleQuotedMaybeString = () => {
      const start = this.pos;
      let value = "";
      let isString = false;
      this.pos++;
      while (this.pos < len) {
        if (s[this.pos] === "\\") {
          if (this.pos + 1 < len) {
            value += s[this.pos + 1];
            this.pos += 2;
            isString = true;
            continue;
          }
        }
        if (s[this.pos] === "\"") {
          if (s[this.pos + 1] === "\"") {
            value += "\"";
            this.pos += 2;
            continue;
          }
          break;
        }
        value += s[this.pos++];
      }
      if (s[this.pos] === "\"") this.pos++;
      return { value, start, end: this.pos, isString };
    };
    const tryReadBracketIdentifier = () => {
      let p = this.pos + 1;
      let value = "";
      while (p < len) {
        if (s[p] === "]") {
          if (s[p + 1] === "]") {
            value += "]";
            p += 2;
            continue;
          }
          break;
        }
        if (s[p] === "\n" || s[p] === "\r") return null;
        value += s[p++];
      }
      if (s[p] !== "]") return null;
      if (!value || !/^[A-Za-z_]/.test(value)) return null;
      const start = this.pos;
      this.pos = p + 1;
      return { value, start, end: this.pos };
    };
    const decodeUnicodeEscapes = (raw, escapeChar) => {
      let out = "";
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== escapeChar) {
          out += ch;
          continue;
        }
        const next = raw[i + 1];
        if (next === escapeChar) {
          out += escapeChar;
          i++;
          continue;
        }
        if (next === "+") {
          const hex = raw.slice(i + 2, i + 8);
          if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            throw new Error("Invalid Unicode escape sequence");
          }
          const code = parseInt(hex, 16);
          if (code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
            throw new Error("Invalid Unicode code point");
          }
          out += String.fromCodePoint(code);
          i += 7;
          continue;
        }
        const hex = raw.slice(i + 1, i + 5);
        if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
          throw new Error("Invalid Unicode escape sequence");
        }
        const code = parseInt(hex, 16);
        if (code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
          throw new Error("Invalid Unicode code point");
        }
        out += String.fromCodePoint(code);
        i += 4;
      }
      return out;
    };

    while (this.pos < s.length) {
      const ch = s[this.pos];
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }
      if (ch === "-" && s[this.pos + 1] === "-") {
        const start = this.pos;
        this.pos += 2;
        let value = "";
        while (this.pos < s.length && s[this.pos] !== "\n") {
          value += s[this.pos++];
        }
        this.tokens.push({ type: "COMMENT_LINE", value: value.trim(), start, end: this.pos });
        continue;
      }
      if (ch === "/" && s[this.pos + 1] === "*" && s[this.pos + 2] !== "+") {
        this.pos += 2;
        while (this.pos < s.length && !(s[this.pos] === "*" && s[this.pos + 1] === "/")) {
          this.pos++;
        }
        if (this.pos < s.length) this.pos += 2;
        continue;
      }
      if (ch === "/" && s[this.pos + 1] === "*" && s[this.pos + 2] === "+") {
        const start = this.pos;
        this.pos += 3;
        let value = "";
        while (this.pos < s.length && !(s[this.pos] === "*" && s[this.pos + 1] === "/")) {
          value += s[this.pos++];
        }
        if (this.pos < s.length) this.pos += 2;
        this.tokens.push({ type: "HINT", value: value.trim(), start, end: this.pos });
        continue;
      }

      if ((ch === "U" || ch === "u") && s[this.pos + 1] === "&" && s[this.pos + 2] === "'") {
        const start = this.pos;
        this.pos += 2;
        let unicodeString = true;
        let escapeChar = "\\";
        if (s[this.pos] === "'") {
          let literal = readQuotedString(!unicodeString);
          let value = literal.value;
          let p = skipWhitespace(this.pos);
          while (s[p] === "'") {
            this.pos = p;
            const extra = readQuotedString(!unicodeString);
            value += extra.value;
            p = skipWhitespace(this.pos);
          }
          if (startsWithKeywordAt(p, "UESCAPE")) {
            let q = skipWhitespace(p + "UESCAPE".length);
            if (s[q] === "'") {
              this.pos = q;
              const esc = readQuotedString(false);
              if (esc.value.length !== 1) {
                throw new Error("UESCAPE must be a single character");
              }
              escapeChar = esc.value;
              p = skipWhitespace(this.pos);
            }
          }
          this.pos = p;
          if (unicodeString) {
            value = decodeUnicodeEscapes(value, escapeChar);
          }
          this.tokens.push({ type: "STRING", value, start, end: this.pos });
          continue;
        } else {
          this.pos = start;
        }
      }
      if (ch === "[") {
        const ident = tryReadBracketIdentifier();
        if (ident) {
          this.tokens.push({ type: "IDENT", value: ident.value, start: ident.start, end: ident.end });
          continue;
        }
      }
      if ((ch === "U" || ch === "u") && s[this.pos + 1] === "&" && s[this.pos + 2] === "\"") {
        const start = this.pos;
        this.pos += 2;
        let { value } = readQuotedIdentifier("\"");
        let p = skipWhitespace(this.pos);
        let escapeChar = "\\";
        if (startsWithKeywordAt(p, "UESCAPE")) {
          let q = skipWhitespace(p + "UESCAPE".length);
          if (s[q] !== "'") {
            throw new Error("UESCAPE requires a quoted escape character");
          }
          this.pos = q;
          const esc = readQuotedString(false);
          if (esc.value.length !== 1) {
            throw new Error("UESCAPE must be a single character");
          }
          escapeChar = esc.value;
          p = skipWhitespace(this.pos);
        }
        this.pos = p;
        value = decodeUnicodeEscapes(value, escapeChar);
        this.tokens.push({ type: "IDENT", value, start, end: this.pos });
        continue;
      }
      if (ch === '"' || ch === "`") {
        if (ch === "\"") {
          const { value, start, end, isString } = readDoubleQuotedMaybeString();
          this.tokens.push({ type: isString ? "STRING" : "IDENT", value, start, end });
        } else {
          const { value, start, end } = readQuotedIdentifier(ch);
          this.tokens.push({ type: "IDENT", value, start, end });
        }
        continue;
      }
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(s[this.pos + 1]))) {
        const start = this.pos;
        let value = "";
        if (ch === ".") {
          value += ".";
          this.pos++;
          while (this.pos < s.length && /[0-9]/.test(s[this.pos])) {
            value += s[this.pos++];
          }
        } else {
          while (this.pos < s.length && /[0-9]/.test(s[this.pos])) {
            value += s[this.pos++];
          }
          if (s[this.pos] === ".") {
            value += ".";
            this.pos++;
            while (this.pos < s.length && /[0-9]/.test(s[this.pos])) {
              value += s[this.pos++];
            }
          }
        }
        if (/[eE]/.test(s[this.pos])) {
          const e = s[this.pos];
          const sign = s[this.pos + 1];
          if (/[0-9\+\-]/.test(sign) && /[0-9]/.test(s[this.pos + 2] || "")) {
            value += e;
            this.pos++;
            if (sign === "+" || sign === "-") {
              value += sign;
              this.pos++;
            }
            while (this.pos < s.length && /[0-9]/.test(s[this.pos])) {
              value += s[this.pos++];
            }
          }
        }
        this.tokens.push({ type: "NUMBER", value, start, end: this.pos });
        continue;
      }
      if (isIdentStart(ch)) {
        const start = this.pos;
        let value = "";
        while (this.pos < s.length && isIdentPart(s[this.pos])) {
          value += s[this.pos++];
        }
        this.tokens.push({ type: "IDENT", value, start, end: this.pos });
        continue;
      }
      if (ch === "'") {
        const start = this.pos;
        const literal = readQuotedString(true);
        this.tokens.push({ type: "STRING", value: literal.value, start, end: literal.end });
        continue;
      }
      const two = s.slice(this.pos, this.pos + 2);
      const twoOps = ["<=", ">=", "<>", "!=", "||", "->"];
      if (twoOps.includes(two)) {
        this.tokens.push({ type: "SYMBOL", value: two, start: this.pos, end: this.pos + 2 });
        this.pos += 2;
        continue;
      }
      this.tokens.push({ type: "SYMBOL", value: ch, start: this.pos, end: this.pos + 1 });
      this.pos++;
    }
    this.tokens.push({ type: "EOF", value: null, start: this.pos, end: this.pos });
    return this.tokens;
  }
}

class WellknownDdlParser {
  constructor(tokens) {
    this.tokens = tokens || [];
    this.pos = 0;
  }
  isCommentToken(t) { return t && t.type === "COMMENT_LINE"; }
  peekRaw() { return this.tokens[this.pos] || { type: "EOF", value: null }; }
  peek() {
    let i = this.pos;
    while (this.isCommentToken(this.tokens[i])) i++;
    return this.tokens[i] || { type: "EOF", value: null };
  }
  peekN(n) {
    let i = this.pos;
    let count = 0;
    while (i < this.tokens.length) {
      const t = this.tokens[i];
      if (!this.isCommentToken(t)) {
        if (count === n) return t;
        count++;
      }
      i++;
    }
    return { type: "EOF", value: null };
  }
  nextRaw() { return this.tokens[this.pos++] || { type: "EOF", value: null }; }
  next() {
    let t = this.nextRaw();
    while (this.isCommentToken(t)) t = this.nextRaw();
    return t || { type: "EOF", value: null };
  }
  isEOF() { return this.peek().type === "EOF"; }
  isSymbol(value) {
    const t = this.peek();
    return t.type === "SYMBOL" && t.value === value;
  }
  isKeyword(value) {
    const t = this.peek();
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
  expect(type) {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`Expected ${type} but got ${t.type}:${t.value}`);
    }
    return this.next();
  }
  isStatementEnd() {
    return this.isEOF() || this.isSymbol(";");
  }
  stringifyTokens(tokens) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const value = t.type === "STRING" ? `'${t.value}'` : String(t.value);
      if (!out) {
        out = value;
        continue;
      }
      const prev = tokens[i - 1];
      const noSpaceAfterPrev = prev.type === "SYMBOL" && ["(", ".", ","].includes(prev.value);
      const noSpaceBefore = t.type === "SYMBOL" && [")", ".", ",", ";"].includes(t.value);
      out += (noSpaceAfterPrev || noSpaceBefore) ? "" : " ";
      out += value;
    }
    return out.trim();
  }
  collectUntilStatementEnd() {
    const tokens = [];
    while (!this.isStatementEnd()) {
      tokens.push(this.next());
    }
    return tokens;
  }
  parseCompoundIdentifier() {
    const parts = [];
    const first = this.expect("IDENT");
    parts.push(first.value);
    while (this.acceptSymbol(".")) {
      const part = this.expect("IDENT");
      parts.push(part.value);
    }
    return { type: "CompoundIdentifier", parts };
  }
  parseSimpleIdentifier() {
    const t = this.expect("IDENT");
    return { type: "SimpleIdentifier", value: t.value };
  }
  parseIdentifierList() {
    const items = [];
    this.expectSymbol("(");
    if (!this.isSymbol(")")) {
      items.push(this.parseSimpleIdentifier());
      while (this.acceptSymbol(",")) {
        items.push(this.parseSimpleIdentifier());
      }
    }
    this.expectSymbol(")");
    return items;
  }
  parseParenthesizedItemsRaw() {
    const items = [];
    let current = [];
    let depth = 0;
    while (!this.isEOF()) {
      const t = this.next();
      if (t.type === "SYMBOL" && t.value === "(") {
        depth++;
        current.push(t);
        continue;
      }
      if (t.type === "SYMBOL" && t.value === ")") {
        if (depth === 0) {
          if (current.length) items.push(this.stringifyTokens(current));
          return items;
        }
        depth--;
        current.push(t);
        continue;
      }
      if (t.type === "SYMBOL" && t.value === "," && depth === 0) {
        items.push(this.stringifyTokens(current));
        current = [];
        continue;
      }
      current.push(t);
    }
    throw new Error("Unclosed parenthesis");
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

  SqlStmt() {
    return this.SqlDdlStmt();
  }

  SqlDdlStmt() {
    if (this.isKeyword("CREATE")) return this.CreateStmt();
    if (this.isKeyword("DROP")) return this.DropStmt();
    if (this.isKeyword("ALTER")) return this.AlterStmt();
    if (this.isKeyword("TRUNCATE")) return this.TruncateTableStmt();
    if (this.isKeyword("COMMENT")) return this.CommentStmt();
    if (this.isKeyword("GRANT")) return this.GrantStmt();
    if (this.isKeyword("REVOKE")) return this.RevokeStmt();
    throw new Error(`Unsupported DDL statement: ${this.peek().type}:${this.peek().value}`);
  }

  CreateStmt() {
    this.expectKeyword("CREATE");
    if (this.acceptKeyword("SCHEMA")) return this.CreateSchemaStmt();
    if (this.isKeyword("TABLE") || this.isKeyword("TEMP") || this.isKeyword("TEMPORARY")) {
      return this.CreateTableStmt();
    }
    if (this.acceptKeyword("MATERIALIZED")) {
      this.expectKeyword("VIEW");
      return this.CreateMaterializedViewStmt();
    }
    if (this.acceptKeyword("VIEW")) return this.CreateViewStmt();
    if (this.isKeyword("UNIQUE") || this.isKeyword("INDEX")) return this.CreateIndexStmt();
    if (this.acceptKeyword("SEQUENCE")) return this.CreateSequenceStmt();
    if (this.acceptKeyword("TYPE")) return this.CreateTypeStmt();
    if (this.acceptKeyword("DOMAIN")) return this.CreateDomainStmt();
    if (this.acceptKeyword("FUNCTION")) return this.CreateFunctionStmt();
    if (this.acceptKeyword("PROCEDURE")) return this.CreateProcedureStmt();
    if (this.acceptKeyword("TRIGGER")) return this.CreateTriggerStmt();
    if (this.acceptKeyword("ROLE")) return this.CreateRoleStmt();
    if (this.acceptKeyword("USER")) return this.CreateUserStmt();
    if (this.acceptKeyword("OR")) {
      this.expectKeyword("REPLACE");
      if (this.acceptKeyword("VIEW")) return this.CreateViewStmt({ orReplace: true });
      if (this.acceptKeyword("FUNCTION")) return this.CreateFunctionStmt({ orReplace: true });
      if (this.acceptKeyword("PROCEDURE")) return this.CreateProcedureStmt({ orReplace: true });
    }
    throw new Error("Unsupported CREATE statement");
  }

  DropStmt() {
    this.expectKeyword("DROP");
    if (this.acceptKeyword("SCHEMA")) return this.DropSchemaStmt();
    if (this.acceptKeyword("TABLE")) return this.DropTableStmt();
    if (this.acceptKeyword("VIEW")) return this.DropViewStmt();
    if (this.acceptKeyword("MATERIALIZED")) {
      this.expectKeyword("VIEW");
      return this.DropMaterializedViewStmt();
    }
    if (this.acceptKeyword("INDEX")) return this.DropIndexStmt();
    if (this.acceptKeyword("SEQUENCE")) return this.DropSequenceStmt();
    if (this.acceptKeyword("TYPE")) return this.DropTypeStmt();
    if (this.acceptKeyword("DOMAIN")) return this.DropDomainStmt();
    if (this.acceptKeyword("FUNCTION")) return this.DropFunctionStmt();
    if (this.acceptKeyword("PROCEDURE")) return this.DropProcedureStmt();
    if (this.acceptKeyword("TRIGGER")) return this.DropTriggerStmt();
    if (this.acceptKeyword("ROLE")) return this.DropRoleStmt();
    if (this.acceptKeyword("USER")) return this.DropUserStmt();
    throw new Error("Unsupported DROP statement");
  }

  AlterStmt() {
    this.expectKeyword("ALTER");
    if (this.acceptKeyword("TABLE")) return this.AlterTableStmt();
    if (this.acceptKeyword("SEQUENCE")) return this.AlterSequenceStmt();
    if (this.acceptKeyword("DOMAIN")) return this.AlterDomainStmt();
    throw new Error("Unsupported ALTER statement");
  }

  CreateSchemaStmt() {
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateSchemaStmt", ifNotExists, name, raw: this.stringifyTokens(rest) };
  }

  DropSchemaStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropSchemaStmt", ifExists, name, option };
  }

  CreateTableStmt() {
    const temp = this.acceptKeyword("TEMP") || this.acceptKeyword("TEMPORARY");
    this.expectKeyword("TABLE");
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    let body = null;
    if (this.acceptSymbol("(")) {
      const elements = this.parseParenthesizedItemsRaw();
      body = { type: "TableElements", elements };
    } else if (this.acceptKeyword("AS")) {
      const rest = this.collectUntilStatementEnd();
      body = { type: "AsQuery", raw: this.stringifyTokens(rest) };
      return { type: "CreateTableStmt", temp: !!temp, ifNotExists, name, body };
    } else if (this.acceptKeyword("LIKE")) {
      const like = this.parseCompoundIdentifier();
      const rest = this.collectUntilStatementEnd();
      body = { type: "LikeTable", like, raw: this.stringifyTokens(rest) };
      return { type: "CreateTableStmt", temp: !!temp, ifNotExists, name, body };
    } else {
      throw new Error("Expected CREATE TABLE body");
    }
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateTableStmt", temp: !!temp, ifNotExists, name, body, raw: this.stringifyTokens(rest) };
  }

  DropTableStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropTableStmt", ifExists, name, option };
  }

  AlterTableStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "AlterTableStmt", ifExists, name, raw: this.stringifyTokens(rest) };
  }

  TruncateTableStmt() {
    this.expectKeyword("TRUNCATE");
    this.expectKeyword("TABLE");
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("RESTART") ? (this.expectKeyword("IDENTITY"), "RESTART IDENTITY")
      : this.acceptKeyword("CONTINUE") ? (this.expectKeyword("IDENTITY"), "CONTINUE IDENTITY")
      : null;
    return { type: "TruncateTableStmt", name, option };
  }

  CreateViewStmt(extra = {}) {
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    let columns = null;
    if (this.isSymbol("(")) {
      columns = this.parseIdentifierList();
    }
    this.expectKeyword("AS");
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateViewStmt", ifNotExists, name, columns, orReplace: !!extra.orReplace, raw: this.stringifyTokens(rest) };
  }

  DropViewStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropViewStmt", ifExists, name, option };
  }

  CreateMaterializedViewStmt() {
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    this.expectKeyword("AS");
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateMaterializedViewStmt", ifNotExists, name, raw: this.stringifyTokens(rest) };
  }

  DropMaterializedViewStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropMaterializedViewStmt", ifExists, name, option };
  }

  CreateIndexStmt() {
    const unique = !!this.acceptKeyword("UNIQUE");
    this.expectKeyword("INDEX");
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    this.expectKeyword("ON");
    const table = this.parseCompoundIdentifier();
    this.expectSymbol("(");
    const elements = this.parseParenthesizedItemsRaw();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateIndexStmt", unique, ifNotExists, name, table, elements, raw: this.stringifyTokens(rest) };
  }

  DropIndexStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropIndexStmt", ifExists, name, option };
  }

  CreateSequenceStmt() {
    const ifNotExists = !!(this.acceptKeyword("IF") && this.expectKeyword("NOT") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateSequenceStmt", ifNotExists, name, raw: this.stringifyTokens(rest) };
  }

  AlterSequenceStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "AlterSequenceStmt", ifExists, name, raw: this.stringifyTokens(rest) };
  }

  DropSequenceStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropSequenceStmt", ifExists, name, option };
  }

  CreateDomainStmt() {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateDomainStmt", name, raw: this.stringifyTokens(rest) };
  }

  AlterDomainStmt() {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "AlterDomainStmt", name, raw: this.stringifyTokens(rest) };
  }

  DropDomainStmt() {
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropDomainStmt", name, option };
  }

  CreateTypeStmt() {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateTypeStmt", name, raw: this.stringifyTokens(rest) };
  }

  DropTypeStmt() {
    const name = this.parseCompoundIdentifier();
    const option = this.acceptKeyword("CASCADE") ? "CASCADE" : this.acceptKeyword("RESTRICT") ? "RESTRICT" : null;
    return { type: "DropTypeStmt", name, option };
  }

  CreateFunctionStmt(extra = {}) {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateFunctionStmt", name, orReplace: !!extra.orReplace, raw: this.stringifyTokens(rest) };
  }

  DropFunctionStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    return { type: "DropFunctionStmt", ifExists, name };
  }

  CreateProcedureStmt(extra = {}) {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateProcedureStmt", name, orReplace: !!extra.orReplace, raw: this.stringifyTokens(rest) };
  }

  DropProcedureStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    return { type: "DropProcedureStmt", ifExists, name };
  }

  CreateTriggerStmt() {
    const name = this.parseCompoundIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateTriggerStmt", name, raw: this.stringifyTokens(rest) };
  }

  DropTriggerStmt() {
    const ifExists = !!(this.acceptKeyword("IF") && this.expectKeyword("EXISTS"));
    const name = this.parseCompoundIdentifier();
    return { type: "DropTriggerStmt", ifExists, name };
  }

  CommentStmt() {
    this.expectKeyword("COMMENT");
    this.expectKeyword("ON");
    const rest = this.collectUntilStatementEnd();
    return { type: "CommentStmt", raw: this.stringifyTokens(rest) };
  }

  GrantStmt() {
    this.expectKeyword("GRANT");
    const rest = this.collectUntilStatementEnd();
    return { type: "GrantStmt", raw: this.stringifyTokens(rest) };
  }

  RevokeStmt() {
    this.expectKeyword("REVOKE");
    const rest = this.collectUntilStatementEnd();
    return { type: "RevokeStmt", raw: this.stringifyTokens(rest) };
  }

  CreateRoleStmt() {
    const name = this.parseSimpleIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateRoleStmt", name, raw: this.stringifyTokens(rest) };
  }

  DropRoleStmt() {
    const name = this.parseSimpleIdentifier();
    return { type: "DropRoleStmt", name };
  }

  CreateUserStmt() {
    const name = this.parseSimpleIdentifier();
    const rest = this.collectUntilStatementEnd();
    return { type: "CreateUserStmt", name, raw: this.stringifyTokens(rest) };
  }

  DropUserStmt() {
    const name = this.parseSimpleIdentifier();
    return { type: "DropUserStmt", name };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WellknownDdlLexer,
    WellknownDdlParser,
  };
} else if (typeof window !== "undefined") {
  window.WellknownDdlLexer = WellknownDdlLexer;
  window.WellknownDdlParser = WellknownDdlParser;
}
