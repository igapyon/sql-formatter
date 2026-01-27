# TODO (apche-calcite-Parser.js)

## 進捗サマリ
- Stage 1: lexer + 全 production skeleton 済み。
- 入口系と最小パース済み: SqlStmtList/SqlStmt/OrderedQueryOrExpr/QueryOrExpr/OrderByLimitOpt/LeafQueryOrExpr/LeafQuery/SqlSelect/SelectExpression/OrderBy/OrderItemList/WithList。
- 式の核を最低限実装: Expression/Expression2(簡易) + AddExpression2b + Identifier/CompoundIdentifier + Literal/Number/String + ParenthesizedExpression + ExpressionCommaList。

## 残り作業（優先順の目安）
1. Expression2 拡張
   - IN / BETWEEN / LIKE / ILIKE / RLIKE / SIMILAR TO / IS (NULL/TRUE/FALSE/UNKNOWN/...) / EXISTS / UNIQUE などの分岐。
   - SOME/ANY/ALL + comp などの集合比較。
   - ItemAccess（[ OFFSET/ORDINAL/... ]）や PostfixRowOperator。
2. Expression3/AtomicRowExpression 拡張
   - ROW/() 構文、LambdaExpression、CursorExpression。
   - CaseExpression、DynamicParam、ContextVariable、CompoundIdentifier 以外の分岐。
3. 関数呼び出し系
   - NamedRoutineCall / NamedFunctionCall / BuiltinFunctionCall / JdbcFunctionCall。
   - FunctionParameterList / AllOrDistinct / AddArg0/AddArg。
4. リテラル/型
   - DateTimeLiteral / IntervalLiteral / IntervalQualifier / SpecialLiteral 等。
   - DataType 系（CharacterTypeName/RowTypeName/MapTypeName...）。
5. FROM/Join/テーブル参照
   - TableRef/Join/JoinType/JoinTable/ImplicitTableFunctionCallArgs など。
   - Pivot/Unpivot/MatchRecognize/Tablesample/Snapshot/Extend。
6. クエリ拡張
   - SetOp/Query/SqlQueryEof/OrderByOfSetSemanticsTable 等。
7. ユーティリティ補完
   - SimpleIdentifierOrList/ParenthesizedSimpleIdentifierList/ParenthesizedCompoundIdentifierList 等の list 生成。
   - Add* 系 production の本実装。
8. 厳格な突合（最終）
   - apche-calcite-Parser.md を正とし、apche-calcite-Parser.js の整合を最終チェック。
   - 手順（最小）:
     1) .md から production 名一覧を抽出（順序付き）
     2) .js のメソッド名一覧を抽出（順序付き）
     3) 欠落/余剰/順序違い/表記揺れ（大文字小文字・ハイフン等）を差分表にまとめる
     4) 差分を .js に反映し、再抽出して差分が 0 になるまで繰り返す
   - 補足:
     - .md にない production が .js に残っていたら削除
     - production 本文の中で参照している名前も .md と一致させる
   - 成果物:
     - 差分一覧（テキスト）と、反映後の .js

## 実装方針メモ
- lexer は最小: IDENT/NUMBER/STRING/SYMBOL/EOF のみ。予約語判定は isKeyword で大文字比較。
- AST 形式は自由だが、既存の軽量ノード（type + 必要最小限のフィールド）で統一。
- 失敗時は notImplemented を残して段階的に埋める。
