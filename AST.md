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
  - `hints`: `TableHints | null`
  - `stream`: `boolean`
  - `setQuantifier`: `"ALL" | "DISTINCT" | null`
  - `selectItems`: `AddSelectItem[]`
  - `from`: `FromClause | null`
  - `where`: `Where | null`
  - `groupBy`: `GroupBy | null`
  - `having`: `Having | null`
  - `window`: `Window | null`
  - `qualify`: `Qualify | null`
- `QueryOrExpr`
  - `withList`, `leaf`, `setOps`
- `OrderedQueryOrExpr`
  - `query`, `orderByLimitOpt`

## 句
- `FromClause`
  - `first`: `TableRef`
  - `joins`: (`JoinTable` | `CommaJoin` | `ApplyJoin`)[]
- `JoinTable`
  - `natural`: `boolean`
  - `joinType`: `string` (e.g. `"JOIN"`, `"LEFT JOIN"`)
  - `table`: `TableRef`
  - `condition`: `On | Using | null`
- `CommaJoin`
  - `table`
- `Where`
  - `expr`
- `GroupBy`
  - `set`: `"DISTINCT" | "ALL" | null`
  - `list`: `GroupingElementList`
- `Having`
  - `expr`
- `Window`
  - `items`: `AddWindowSpec[]`
- `Qualify`
  - `expr`
- `OrderBy`
  - `list`: `OrderItemList`
- `LimitClause`
  - `value`, `offset`
- `OffsetClause`
  - `value`, `rows`
- `FetchClause`
  - `mode`, `value`, `rows`

## テーブル参照
- `TableRef`
  - `base`, `pivot`, `unpivot`, `matchRecognize`, `alias`, `columns`, `tablesample`
- `TableName`
  - `name`: `CompoundTableIdentifier`
- `Subquery`
  - `query`: `OrderedQueryOrExpr`
- `Unnest`
  - `items`: `Expression[]`
  - `withOrdinality`: `boolean`
- `TableFunctionCall`
  - `call`: `NamedRoutineCall`
- `Pivot`
  - `aggs`: `AddPivotAgg[]`
  - `axis`: `SimpleIdentifierOrList`
  - `values`: `AddPivotValue[]`
- `Unpivot`
  - `nulls`: `"INCLUDE" | "EXCLUDE" | null`
  - `columns`: `SimpleIdentifierOrList`
  - `axis`: `SimpleIdentifierOrList`
  - `values`: `AddUnpivotValue[]`
- `MatchRecognize`
  - `partitionBy`, `orderBy`, `measures`, `rowsPerMatch`, `afterMatchSkip`
  - `pattern`, `anchorStart`, `anchorEnd`, `within`, `subsets`, `define`

## 式
- `Expression2b`（内部表現）
  - `prefixes`, `base`, `extensions`
- `BinaryExpression`
  - `operator`, `left`, `right`
- `Literal`
  - `value`
- `StringLiteral`
  - `value`
- `NumericLiteral`
  - `value`
- `Identifier`
  - `name`
- `CompoundIdentifier`
  - `parts`

## 関数
- `NamedFunctionCall`
  - `name`, `args`, `orderBy`, `withinGroup`, `nullTreatment`, `filter`, `over`
- `BuiltinFunctionCall`
  - `kind` ごとにフィールドが異なる（各関数ノード参照）
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
- `Expression*` 系の正規化
- `BuiltinFunctionCall` の各関数ノードの仕様を追加
- テストで AST 形を固定
