# TODO (apache-calcite-Parser.js)

## 進捗サマリ
- Stage 1: lexer + 全 production skeleton 済み。
- 入口/Select/From/Join/式/関数/型/JSON/日付系の主要骨格は実装済み。
- md⇔js の production 名・順序は一致済み（ヘルパー除外で一致）。
- 直近の回帰テスト（select/cte/dml/pivot/match_recognize 等）は通過。

## 残り作業（優先順の目安・更新）
1. テスト強化（回帰・境界）
   - SELECT/SETOP/ORDER/LIMIT/WINDOW/PIVOT/MATCH_RECOGNIZE の多様例
   - 異常系（エラー期待）を追加してパーサの誤飲みを検出
2. lexer の実用化
   - コメント（--, /* */）, 文字列エスケープ, 数値（指数, 小数点）, 引用付き識別子
   - 予約語と識別子の扱い（大小/引用）を整理
3. 構文厳密化
   - 句の出現順序/必須/排他のチェックを追加
   - 省略可能要素の優先順位を見直し（誤って別名に吸われるなど）
4. DDL/DML の網羅性
   - SqlSetOption/SqlAlter/SqlExplain 等の分岐を拡充
5. AST 仕様の整理
   - ノード型の命名とフィールドを最終定義し、テストで固定化
6. 厳格な突合（最終）
   - apache-calcite-Parser.md を正とし、apache-calcite-Parser.js の整合を最終チェック。
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
（なし）
