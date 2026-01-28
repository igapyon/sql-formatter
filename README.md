# SQL Formatter (WIP)

このリポジトリは、最終的に **SQL Formatter** を作るためのプロジェクトです。
現在は前段として **SQL パーサー** を実装しています。

![Playground screenshot](screenshot.png)

## 目的
- 最終目標: SQL を整形するフォーマッタの実装
- 現状: SQL パーサーを自作し、AST を生成する段階

## 現在の構成
- `spec/apache-calcite-Parser.js`: パーサー本体（lexer + parser）
- `spec/apache-calcite-Parser-test.js`: 回帰/異常系テスト
- `spec/apache-calcite-Parser.md`: 仕様（EBNFベース）
- `spec/apache-calcite-Parser.jj`: 参照文法
- `AST.md`: AST 仕様（暫定）
- `FORMATTER_RULES.md`: SQL Formatter の出力ルール
- `index-parser.html`: SQL → AST 出力の簡易デモ
- `index.html`: SQL Formatter の UI（WIP）

## 使い方（開発時）
テストを実行してパーサーの動作確認ができます。

```bash
node spec/apache-calcite-Parser-test.js
```

## 直近の作業予定
- **index-parser.html**: SQL → AST を出力する簡易デモ（実装済み）
- **index.html**: 将来的に SQL Formatter の UI を実装予定
- AST 仕様の整理と固定化
- 構文の厳密化（句の順序/排他の追加チェック）
- 最終的に formatter へ接続

## 仕様情報の流れ（開発過程）
- `spec/apache-calcite-Parser.jj` の文法を元に `spec/apache-calcite-Parser.md`（EBNF仕様）を作成
- `spec/apache-calcite-Parser.md` を元に `spec/apache-calcite-Parser.js`（実装）を生成

## デモ機能
- AST の JSON 出力
- トークン一覧の表示
- エラートークンのハイライト表示

## ライセンス
`LICENSE` を参照してください。
