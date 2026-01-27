# TODO (apche-calcite-Parser.js)

## 進捗サマリ
- Stage 1: lexer + 全 production skeleton 済み。
- 入口/Select/From/Join/式/関数/型/JSON/日付系の主要骨格は実装済み。
- md⇔js の production 名・順序は一致済み（ヘルパー除外で一致）。

## 残り作業（優先順の目安・更新）
1. SetOp/Query 周り
   - AddSetOpQuery / BinaryQueryOperator / AddSetOpQueryOrExpr / Query / SqlQueryEof
   - PartitionedQueryOrQueryOrExpr / OrderByOfSetSemanticsTable
2. テーブル参照の拡張
   - Snapshot / Tablesample / Pivot / Unpivot / MatchRecognize / TableOverOpt / Over / ExtendedTableRef
3. LIMIT/OFFSET/FETCH と ORDER BY 制約
   - LimitClause / OffsetClause / FetchClause
4. Add* 系の実装（実用上の肝）
   - AddSelectItem / AddOrderItem / AddGroupingElement / AddWindowSpec / AddWithItem など
5. DDL/DML の細部
   - SqlSetOption/SqlAlter/SqlExplain などの分岐網羅（現状は最小実装）
6. 低優先ユーティリティ
   - ReservedFunctionName / NonReserved* / CollectionsTypeName / CollateClause など
7. 厳格な突合（最終）
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

## 未実装一覧（notImplemented が残るもの）
AddExpression / AddCompoundIdentifierTypes /
ReservedFunctionName / NonReservedKeyWord /
StringAggFunctionCall / PercentileFunctionCall / GroupByWindowingCall /
MatchRecognizeFunctionCall / MatchRecognizeCallWithModifier / MatchRecognizeNavigationLogical / MatchRecognizeNavigationPhysical /
NullTreatment /
DynamicParam / ContextVariable / SequenceExpression /
PatternPrimary / weekdayName / Year / Quarter / Month / Week / Day / Hour / Minute / Second /
JsonNameAndValue /
FloorCeilOptions / StandardFloorCeilOptions /
JdbcOdbcDataTypeName / CollectionsTypeName /
Scope / comp
