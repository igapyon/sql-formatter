# lht-cmn Feedback

## 背景

`sql-formatter` では `lht-text-field-help` を使って `SQL Input` の説明文を表示したい。

ただし現状の `lht-cmn` では、`md-outlined-text-field` が利用できる環境では `help-text` が下部の supporting text として表示される一方、fallback の `textarea` / `input` では `title` 属性へ退避されるだけで、画面下部に説明文が出ない。

この差により、同じ `lht-text-field-help` を使っていても Material 利用可否で UX が変わる。

## 提案

`lht-text-field-help` の fallback でも、`help-text` を画面下部へ表示できるようにしたい。

あわせて、Material Web の依存も `lht-cmn` の配布単位として扱えるようにしたい。

## 期待する仕様

- `help-text` は Material 利用時と fallback 時で、できるだけ同じ意味で見えること
- `focus` 時に説明文が表示されること
- `blur` 後は `hide-delay-ms` に従って非表示になること
- `hide-delay-ms` 未指定時の既定値は現在どおり `160ms` でよい
- fallback 時も `title` のみへ退避する挙動ではなく、視認できる説明文を持つこと

## この提案の理由

- `lht-text-field-help` を使う側は、Material 読込の有無を意識せずに同じ UI 契約を期待したい
- ページ側で個別に補助説明 DOM を足す実装を避けたい
- `lht-cmn` の self-contained 方針とも整合しやすい
- 生成AIや後続開発者が、fallback 差分のために各画面で独自実装を足すことを防ぎたい

## 配布単位に関する提案

- `lht-cmn` が Material Web を優先利用する方針であるなら、必要な Material bundle も `lht-cmn` 一式の一部として扱いたい
- 利用側プロジェクトが毎回 `md-outlined-text-field` などの依存実体を個別に vendor する運用は避けたい
- 理想形は、利用側が `lht-cmn` を最新版一式で取り込めば、必要な Material 依存も揃う状態である
- その結果、利用側は `lht-cmn/css/components.css` と `lht-cmn/js/components.js`、および `lht-cmn` が定める依存セットをそのまま配布対象に含めればよい
- もし bundle を `lht-cmn/js/components.js` 側へ内包しない場合でも、`lht-cmn` 配下の標準パスとして同梱場所を固定してほしい

## `sql-formatter` 側の当面対応

このリポジトリでは当面の対処として、`md-outlined-text-field` を vendor 読込して `lht-text-field-help` の supporting text 表示を有効化している。

ただしこれは `sql-formatter` 側の回避策であり、根本的には fallback 時の表示保証が `lht-cmn` 側にあるほうが望ましい。

また、Material bundle を `sql-formatter` 側の `vendor/` へ置いているのも暫定措置であり、将来的には `lht-cmn` 側の配布単位として扱える形へ寄せたい。
