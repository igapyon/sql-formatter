# AGENTS.md

このリポジトリで作業するエージェント向けの最小ガイドです。

## 目的
- 最終目標: SQL Formatter の実装
- 現状: SQL パーサーの実装とテストの整備

## 主要ファイル
- `spec/apache-calcite-Parser.js`: lexer + parser 本体
- `spec/apache-calcite-Parser-test.js`: 回帰/異常系テスト
- `spec/apache-calcite-Parser.md`: 仕様（EBNFベース）
- `index-parser.html`: SQL → AST 出力の簡易デモ

## 作業の基本方針
- `.md` と `.js` の production 名は一致させる
- 変更後は `node spec/apache-calcite-Parser-test.js` を実行
- 破壊的変更は `TODO.md` に記録

## 進捗の記録
- 直近のタスクは `TODO.md` を参照

## 実行コマンド
```bash
node spec/apache-calcite-Parser-test.js
```
