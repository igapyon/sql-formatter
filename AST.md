# AST 仕様（暫定）

このドキュメントは、`spec/apache-calcite-Parser.js` が出力する AST の最小仕様をまとめたものです。
現状は実装の読みやすさ優先の軽量ノード構成です。

## 共通ルール
- すべてのノードは `type` フィールドを持つ
- 省略可能要素は `null` または未設定
- リストは配列で表現

## ルート
- `SqlStmtList`
  - `statements`: ステートメント配列
- `SqlStmtEof`
  - `stmt`
- `SqlExpressionEof`
  - `expr`

## クエリ
- `SqlSelect`
  - `hints`, `stream`, `setQuantifier`
  - `selectItems`, `from`, `where`, `groupBy`, `having`, `window`, `qualify`
- `QueryOrExpr`
  - `withList`, `leaf`, `setOps`
- `OrderedQueryOrExpr`
  - `query`, `orderByLimitOpt`

## 句
- `FromClause` / `JoinTable` / `CommaJoin`
- `Where` / `GroupBy` / `Having` / `Window` / `Qualify`
- `OrderBy` / `LimitClause` / `OffsetClause` / `FetchClause`

## テーブル参照
- `TableRef`
  - `base`, `pivot`, `unpivot`, `matchRecognize`, `alias`, `columns`, `tablesample`
- `TableName` / `Subquery` / `Unnest` / `TableFunctionCall`
- `Pivot` / `Unpivot` / `MatchRecognize`

## 式
- `Expression2b`（内部表現）
- `BinaryExpression`
- `Literal` / `StringLiteral` / `NumericLiteral`
- `Identifier` / `CompoundIdentifier`

## 関数
- `NamedFunctionCall` / `BuiltinFunctionCall`
- `MatchRecognizeFunctionCall`

## DML/DDL
- `SqlInsert` / `SqlDelete` / `SqlUpdate` / `SqlMerge`
- `SqlSetOption` / `SqlAlter` / `SqlExplain` / `SqlDescribe`

## 例
```json
{
  "type": "SqlStmtList",
  "statements": [
    {
      "type": "SqlSelect",
      "selectItems": [
        { "type": "AddSelectItem", "expr": { "type": "SelectExpression", "star": true } }
      ],
      "from": {
        "type": "FromClause",
        "first": { "type": "TableRef", "base": { "type": "TableName", "name": { "type": "CompoundTableIdentifier" } } },
        "joins": []
      }
    }
  ]
}
```

## TODO
- 主要ノードのフィールドを詳細化
- `Expression*` 系の正規化
- テストで AST 形を固定
