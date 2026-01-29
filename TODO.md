# TODO (apache-calcite-Parser.js)

## 進捗サマリ
- Stage 1: lexer + 全 production skeleton 済み。
- 入口/Select/From/Join/式/関数/型/JSON/日付系の主要骨格は実装済み。
- md⇔js の production 名・順序は一致済み（ヘルパー除外で一致）。
- 回帰テスト/異常系テストを追加済み（全 187 件通過）。
- lexer 実用化（コメント/文字列エスケープ/指数/引用識別子/Unicode/BigQuery/ヒント/数値種別/Unicodeエスケープ検証）対応済み。
- 構文厳密化（FROM 必須/HAVING 制約/JOIN 条件/フレーム条件/ORDER+FETCH など）対応済み。

## 残り作業（優先順の目安・更新）
1. AST 仕様の整理
   - ノード型の命名とフィールドを最終定義し、テストで固定化
2. 構文厳密化の追加候補
   - 句の出現順序/必須/排他の追加チェック（ORDER/LIMIT/OFFSET/FETCH/QUALIFY など）
   - 省略可能要素の優先順位を整理（誤って別名に吸われる余地の洗い出し）
3. テスト拡張（必要なら）
   - SETOP/ORDER/LIMIT の境界・エラー例を追加
   - フォーマッタのDML/DDL出力（UPDATE/DELETE/CREATE TABLE/CREATE INDEX/DROP）の期待出力テストを追加
4. 仕様(.md)と実装(.js)の差分反映
   - TableRef 修飾子（TableHints/ExtendTable/TableOverOpt/Snapshot）の対応を整理 ✅
   - ASOF JOIN の MATCH_CONDITION を仕様に合わせて反映 ✅
   - lexer の識別子/文字列/数値トークン差分を解消 ✅
     - HYPHENATED/BRACKET/BIG_QUERY 系識別子 ✅
     - PREFIXED/UNICODE/BINARY/UESCAPE/連結文字列 ✅
     - DECIMAL/APPROX 数値リテラル ✅
   - TableHints がコメントとして破棄されないよう lexer と整合 ✅
5. 厳格な突合（最終）
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
- lexer は実用化済み（コメント/エスケープ/指数/引用識別子対応）。予約語判定は isKeyword で大文字比較。
- AST 形式は自由だが、既存の軽量ノード（type + 必要最小限のフィールド）で統一。
- 失敗時は notImplemented を残して段階的に埋める。

## 未実装一覧（notImplemented が残るもの）
（なし）

## フォーマッタ TODO
- UPDATE / DELETE の整形対応
- CREATE TABLE / CREATE INDEX の整形対応
- DROP の整形対応
- INTERVAL リテラルの整形対応
- 未対応箇所のみ原文保持できるよう、ASTに位置情報(start/end)を付与して部分フォーマットを可能にする
- index.html に GitHub リポジトリへのリンクアイコン追加
- index.html の Web デザイン更新
