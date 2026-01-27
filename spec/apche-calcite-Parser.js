/**
 * SECTION 0: LEXER (字句解析)
 * 全てのキーワードと記号を抽出します。
 */
class CalciteLexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.tokens = [];
        this.keywords = new Set([
            "SELECT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "LIMIT", "OFFSET", "FETCH",
            "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "JOIN", "ON", "USING", "NATURAL",
            "WITH", "AS", "DISTINCT", "ALL", "AND", "OR", "NOT", "IS", "NULL", "TRUE", "FALSE",
            "CASE", "WHEN", "THEN", "ELSE", "END", "CAST", "EXTRACT", "IN", "BETWEEN", "LIKE",
            "SET", "RESET", "ALTER", "SYSTEM", "SESSION", "EXPLAIN", "PLAN", "FOR", "DESCRIBE", "CALL"
            // 必要に応じて追加
        ]);
    }

    tokenize() {
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (/\s/.test(char)) { this.pos++; continue; }
            
            if (/[a-zA-Z_]/.test(char)) {
                let value = "";
                while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
                    value += this.input[this.pos++];
                }
                const upper = value.toUpperCase();
                this.tokens.push({ type: this.keywords.has(upper) ? upper : "IDENTIFIER", value: upper });
                continue;
            }

            if (/[0-9]/.test(char)) {
                let value = "";
                while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
                    value += this.input[this.pos++];
                }
                this.tokens.push({ type: "LITERAL_NUM", value });
                continue;
            }

            if (char === "'") {
                let value = "";
                this.pos++; // skip '
                while (this.pos < this.input.length && this.input[this.pos] !== "'") {
                    value += this.input[this.pos++];
                }
                this.pos++; // skip '
                this.tokens.push({ type: "LITERAL_STR", value });
                continue;
            }

            const symbols = [
                { s: "||", t: "CONCAT" }, { s: "<>", t: "NE" }, { s: "!=", t: "NE" },
                { s: "<=", t: "LTE" }, { s: ">=", t: "GTE" }, { s: "(", t: "LPAREN" },
                { s: ")", t: "RPAREN" }, { s: ",", t: "COMMA" }, { s: ";", t: "SEMI" },
                { s: "=", t: "EQ" }, { s: "<", t: "LT" }, { s: ">", t: "GT" },
                { s: "+", t: "PLUS" }, { s: "-", t: "MINUS" }, { s: "*", t: "STAR" },
                { s: "/", t: "SLASH" }, { s: ".", t: "DOT" }
            ];

            let matched = false;
            for (const sym of symbols) {
                if (this.input.startsWith(sym.s, this.pos)) {
                    this.tokens.push({ type: sym.t, value: sym.s });
                    this.pos += sym.s.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) this.pos++;
        }
        this.tokens.push({ type: "EOF", value: null });
        return this.tokens;
    }
}

/**
 * SECTION 1-6: PARSER (構文解析)
 */
class CalciteParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() { return this.tokens[this.pos]; }
    eat(type) {
        if (this.peek().type === type) return this.tokens[this.pos++];
        throw new Error(`Unexpected token: ${this.peek().type} (Expected: ${type})`);
    }
    match(...types) { return types.includes(this.peek().type); }

    // --- 1. エントリポイント ---
    parseSqlStmtList() {
        const stmts = [this.parseSqlStmt()];
        while (this.match("SEMI")) {
            this.eat("SEMI");
            if (!this.match("EOF")) stmts.push(this.parseSqlStmt());
        }
        return stmts;
    }

    parseSqlStmt() {
        const t = this.peek().type;
        if (t === "SET" || t === "RESET") return this.parseSqlSetOption();
        if (t === "ALTER") return this.parseSqlAlter();
        if (t === "EXPLAIN") return this.parseSqlExplain();
        if (t === "DESCRIBE") return this.parseSqlDescribe();
        if (t === "CALL") return this.parseSqlProcedureCall();
        return this.parseOrderedQueryOrExpr();
    }

    // --- 2. クエリとSELECT構文 ---
    parseOrderedQueryOrExpr() {
        let withClause = null;
        if (this.match("WITH")) withClause = this.parseWithClause();
        
        let query = this.parseSqlSelect(); // 本来は LeafQueryOrExpr
        
        if (this.match("ORDER")) query.orderBy = this.parseOrderBy();
        if (this.match("LIMIT")) query.limit = this.parseLimit();
        
        return { type: "OrderedQuery", withClause, query };
    }

    parseSqlSelect() {
        this.eat("SELECT");
        const distinct = this.match("DISTINCT") ? this.eat("DISTINCT") : null;
        
        const selectItems = [];
        do {
            if (this.match("COMMA")) this.eat("COMMA");
            selectItems.push(this.parseSelectItem());
        } while (this.match("COMMA"));

        let from = null;
        if (this.match("FROM")) {
            this.eat("FROM");
            from = this.parseFromClause();
        }

        let where = null;
        if (this.match("WHERE")) {
            this.eat("WHERE");
            where = this.parseExpression();
        }

        return { type: "SqlSelect", distinct, selectItems, from, where };
    }

    parseSelectItem() {
        if (this.match("STAR")) return { type: "AllColumns", value: this.eat("STAR").value };
        const expr = this.parseExpression();
        let alias = null;
        if (this.match("AS") || this.match("IDENTIFIER")) {
            if (this.match("AS")) this.eat("AS");
            alias = this.eat("IDENTIFIER").value;
        }
        return { type: "SelectItem", expr, alias };
    }

    // --- 3. FROM句とテーブル参照 ---
    parseFromClause() {
        let tableRef = this.parseTableRef();
        const joins = [];
        while (this.match("JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "COMMA")) {
            joins.push(this.parseJoin());
        }
        return { tableRef, joins };
    }

    parseTableRef() {
        const name = this.eat("IDENTIFIER").value; // 簡易化: CompoundIdentifier
        let alias = null;
        if (this.match("AS") || this.match("IDENTIFIER")) {
            if (this.match("AS")) this.eat("AS");
            alias = this.eat("IDENTIFIER").value;
        }
        return { type: "Table", name, alias };
    }

    parseJoin() {
        let type = "INNER";
        if (this.match("COMMA")) { this.eat("COMMA"); return { type: "COMMA", table: this.parseTableRef() }; }
        if (this.match("LEFT")) { this.eat("LEFT"); type = "LEFT"; if (this.match("OUTER")) this.eat("OUTER"); }
        this.eat("JOIN");
        const table = this.parseTableRef();
        let condition = null;
        if (this.match("ON")) { this.eat("ON"); condition = this.parseExpression(); }
        return { type, table, condition };
    }

    // --- 4. 式の階層構造 (Precedence) ---
    parseExpression() { return this.parseBinary(0); }

    // 演算子の優先順位
    parseBinary(precedence) {
        const ops = [
            ["OR"], ["AND"], ["EQ", "NE", "LT", "GT", "LTE", "GTE", "IS", "LIKE", "IN"], ["PLUS", "MINUS"], ["STAR", "SLASH"]
        ];
        if (precedence >= ops.length) return this.parseAtomic();

        let left = this.parseBinary(precedence + 1);
        while (this.match(...ops[precedence])) {
            const op = this.eat(this.peek().type).value;
            const right = this.parseBinary(precedence + 1);
            left = { type: "BinaryExpr", op, left, right };
        }
        return left;
    }

    parseAtomic() {
        const t = this.peek();
        if (t.type === "LITERAL_NUM" || t.type === "LITERAL_STR") return { type: "Literal", value: this.eat(t.type).value };
        if (t.type === "IDENTIFIER") {
            const id = this.eat("IDENTIFIER").value;
            if (this.match("LPAREN")) return this.parseFunctionCall(id);
            return { type: "Identifier", name: id };
        }
        if (t.type === "LPAREN") {
            this.eat("LPAREN");
            const expr = this.parseExpression();
            this.eat("RPAREN");
            return expr;
        }
        if (t.type === "CASE") return this.parseCase();
        throw new Error(`Unknown atomic: ${t.type}`);
    }

    // --- 5. 関数と特殊構文 ---
    parseFunctionCall(name) {
        this.eat("LPAREN");
        const args = [];
        if (!this.match("RPAREN")) {
            do {
                if (this.match("COMMA")) this.eat("COMMA");
                args.push(this.parseExpression());
            } while (this.match("COMMA"));
        }
        this.eat("RPAREN");
        return { type: "FunctionCall", name, args };
    }

    parseCase() {
        this.eat("CASE");
        const whens = [];
        while (this.match("WHEN")) {
            this.eat("WHEN");
            const cond = this.parseExpression();
            this.eat("THEN");
            const res = this.parseExpression();
            whens.push({ cond, res });
        }
        this.eat("ELSE");
        const fallback = this.parseExpression();
        this.eat("END");
        return { type: "CaseExpr", whens, fallback };
    }

    // --- 6. データ型とリテラル (一部) ---
    parseDataType() {
        const typeName = this.eat("IDENTIFIER").value;
        let precision = null;
        if (this.match("LPAREN")) {
            this.eat("LPAREN");
            precision = this.eat("LITERAL_NUM").value;
            this.eat("RPAREN");
        }
        return { typeName, precision };
    }
    
    // 省略された細かいパーサー(SetOption, Explain等)
    parseSqlSetOption() { const op = this.eat(this.peek().type).value; return { type: "SetOption", op, id: this.eat("IDENTIFIER").value }; }
    parseOrderBy() { this.eat("ORDER"); this.eat("BY"); return "ORDER_BY_CLAUSE"; }
    parseLimit() { this.eat("LIMIT"); return this.eat("LITERAL_NUM").value; }
    parseWithClause() { this.eat("WITH"); return "WITH_CLAUSE"; }
}

/**
 * 実行テスト
 */
const sql = "SELECT id, name FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE status = 'active' AND price > 100;";
const lexer = new CalciteLexer(sql);
const tokens = lexer.tokenize();
const parser = new CalciteParser(tokens);

try {
    const ast = parser.parseSqlStmtList();
    console.log(JSON.stringify(ast, null, 2));
} catch (e) {
    console.error(e.message);
}