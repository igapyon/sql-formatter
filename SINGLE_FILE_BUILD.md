# SINGLE_FILE_BUILD

## 目的

このプロジェクトは、開発時はソースを分割し、配布時は単一 HTML を生成する。

- 開発しやすさ: ロジックを `src/` などに分離して保守する
- 配布しやすさ: 最終成果物を単一 HTML として扱う
- 生成物保護: 生成された HTML を直接編集しない

## ファイル構成

- 入力テンプレート: `sql-formatter-src.html`
- アプリロジック: `src/main.ts`
- 既存ロジック: `src/sql-formatter.ts` (source of truth)
- ブラウザ実行用: `src/sql-formatter.js` (build 時自動生成)
- テスト: `test/sql-formatter.test.ts`
- パーサー: `spec/apache-calcite-Parser.js`, `spec/wellknown-sql-ddl.js`
- ビルドスクリプト: `scripts/build.mjs`
- 出力:
  - `sql-formatter.html` (offline)
  - `sql-formatter-online.html` (online)

## テンプレートトークン

`sql-formatter-src.html` の以下トークンをビルドで置換する。

- `{{CALCITE_PARSER_SCRIPT}}`
- `{{DDL_PARSER_SCRIPT}}`
- `{{FORMATTER_SCRIPT}}`
- `{{APP_SCRIPT}}`

## 生成ルール

### offline (`sql-formatter.html`)

- `spec/apache-calcite-Parser.js` をインライン埋め込み
- `spec/wellknown-sql-ddl.js` をインライン埋め込み
- `src/sql-formatter.ts` を JS へ変換してインライン埋め込み
- `src/main.ts` の内容を `{{APP_SCRIPT}}` にインライン埋め込み

### online (`sql-formatter-online.html`)

- `spec/apache-calcite-Parser.js` を `<script src="./spec/apache-calcite-Parser.js">` で参照
- `spec/wellknown-sql-ddl.js` を `<script src="./spec/wellknown-sql-ddl.js">` で参照
- build で生成した `src/sql-formatter.js` を `<script src="./src/sql-formatter.js">` で参照
- `src/main.ts` の内容を `{{APP_SCRIPT}}` にインライン埋め込み

## コマンド契約

`package.json` の scripts は以下を契約とする。

- `npm run build`
  - `npm run test:unit && npm run build:html`
- `npm run build:html`
  - `node ./scripts/build.mjs`
- `npm run test:unit`
  - `node ./test/sql-formatter.test.ts`
- `npm run check:all`
  - `npm run test:unit && npm run build:html`

## 変更ルール

- `sql-formatter.html` と `sql-formatter-online.html` は生成物として扱う
- 生成物を直接編集しない
- 変更は以下のソース側で実施する
  - `sql-formatter-src.html`
  - `src/main.ts`
  - `src/sql-formatter.ts`
  - `test/sql-formatter.test.ts`
  - `scripts/build.mjs`
  - 必要に応じて `spec/*.js`
- 変更後は `npm run build` または `npm run build:html` で再生成する

## 実装メモ

- `scripts/build.mjs` は Node.js の標準 API (`fs/promises`) で実装
- `src/sql-formatter.ts` は build 時に Node.js の `stripTypeScriptTypes` で JS 化され、`src/sql-formatter.js` を自動生成する
- `spec/*.js` は現時点では JS を source of truth として扱う（必要が出るまでは TS 化しない）
- `{{APP_SCRIPT}}` は現在 `src/main.ts` をそのまま連結して埋め込む
- 追加のアプリソースを入れる場合は `scripts/build.mjs` の `APP_SOURCE_FILES` に追記する
