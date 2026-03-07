# SINGLE_FILE_APP_STRATEGY

## この文書の想定読者

この文書の主な想定読者は、人間の開発者だけではなく生成AIです。

そのため、単なる背景説明ではなく、次を明示します。

- 何が source of truth か
- 何を編集してよいか
- 何を直接編集してはいけないか
- single-file 版と online 版の差分はどこに限定されるか
- 変更時に必ず確認すべきことは何か

この文書を読む生成AIは、ここに書かれた契約を優先して実装・修正を行うことを期待します。

## 目的

このドキュメントは、ブラウザベースのツールを次の 3 層で構成するための方針を整理したものです。

- `index.html`
  - 紹介ページ兼エントリーポイント
- single-file 版
  - 配布・保存・オフライン利用向けの完全単一 HTML
- online 版
  - 外部 JS / CSS を参照する通常構成の HTML

この方針は `sql-formatter` 向けに整理したものですが、他のローカル HTML ツールにも横展開できるように記述します。

## 基本方針

### 1. 入口ページと本体ページを分ける

`index.html` はアプリ本体にしません。役割は次に限定します。

- ツール概要を説明する
- 利用者が得られる機能・メリットを示す
- single-file 版 / online 版 / GitHub などへの導線を出す
- 必要に応じて cache-busting 付きで本体ページへ誘導する

これにより、GitHub Pages などで公開したときに「開いた瞬間に何のツールか分からない」状態を避けられます。

#### AI 向けの判断ルール

- `index.html` にツール本体の UI やロジックを戻さない
- `index.html` は紹介・導線・cache-busting に責務を限定する
- 本体機能の変更は `index.html` ではなく本体テンプレート側に入れる

### 2. 本体は single-file 版と online 版を分ける

本体は 2 種類を用意します。

- single-file 版
  - 必ず 1 ファイルに完結させる
  - オフライン利用、保存、配布、アーカイブに強い
- online 版
  - 通常の複数ファイル構成
  - インライン script を利用できない環境向けの代替実行形態として使える
  - デバッグ、差し替え、保守、開発にも向く

この 2 系統を同じテンプレートから生成することで、見た目と挙動の差異を最小化します。

online 版は単なる開発用ではありません。次のような環境で利用されることを想定します。

- インライン script をセキュリティ対策ソフトや運用ポリシーが拒否する環境
- 単一 HTML よりも、外部ファイル参照のほうが許容されやすい環境
- single-file 版が実行制約に引っかかる場合の代替利用経路

#### AI 向けの判断ルール

- single-file 版と online 版で HTML 構造を分岐させすぎない
- 差分は「資産をインライン化するか」「外部参照するか」に寄せる
- 片方だけに機能追加する実装は原則避ける

### 3. UI は共通レイヤーへ寄せる

複数ページや複数プロジェクトで繰り返し使う UI は共通レイヤーへ寄せます。

このリポジトリでは `lht-cmn` がその役割です。

- 入力欄
- 出力欄
- コピー導線
- ヒーロー
- メニュー
- スイッチ
- toast

このような UI はページごとに再実装せず、共通コンポーネントへ集約します。

一方で、ページ固有のレイアウトや説明文まで共通レイヤーへ持ち込まないことが重要です。

`lht-cmn` の位置づけは、`lht-cmn/README.md` にあるとおり `local-html-tools` 全体で共有する、Material Design を利用した Web Component 集です。

この基盤の考え方は次のとおりです。

- 公開 UI レイヤーは `lht-*` とする
- 画面側から `md-*` を直接使わせない
- `lht-*` は self-contained を原則とする
- 内部実装は Material Web 優先でもよいが、fallback を持ち最低保証で壊れないことを優先する
- 画面ごとの重複実装を減らし、見た目と挙動を共通化する

このリポジトリで `lht-cmn` を使う意味は次のとおりです。

- 入力、出力、コピー、スイッチ、ヒーロー、メニューなどの UI 契約を共通化する
- 単一 HTML 生成前提でも部品再利用性を維持する
- UI 差分を局所化し、ページごとの実装ばらつきを減らす

また、`lht-cmn` はこのプロジェクト専用に開発している内部実装ではなく、外部からコピーして貼り付けて利用している共通資産として扱います。

そのため、このプロジェクトでは `lht-cmn` を自由に書き換えてよい前提で作業してはいけません。

- 原則:
  - このプロジェクト都合で `lht-cmn` を直接改変しない
- 必要な対応:
  - `lht-cmn` 側へ変更提案を出す
  - その変更が取り込まれたものを再取得・反映する
- 例外:
  - ローカル確認のため一時的に試すことはあり得る
  - ただし恒久対応としては扱わない

#### AI 向けの判断ルール

- 再利用対象だけを `lht-cmn` に入れる
- 単一ページでしか使わない説明文、余白調整、導線文言はページ側に置く
- 共通化のためにページ固有要件を `lht-cmn` に持ち込まない
- このプロジェクトの都合だけで `lht-cmn` を直接編集しない
- `lht-cmn` に不足がある場合は、このリポジトリ内で恒久修正するのではなく、変更提案対象として扱う

## このリポジトリでの構成

### 入口

- `index.html`
  - ランディングページ
  - `sql-formatter.html` と `sql-formatter-online.html` への導線を持つ
  - クリック直前に `v=` を付与して cache-busting する

### 本体

- `sql-formatter-src.html`
  - 本体テンプレート
- `sql-formatter.html`
  - single-file 版
- `sql-formatter-online.html`
  - online 版

### スクリプト

- `scripts/build.mjs`
  - テンプレートから single-file 版と online 版を生成する

### 共通 UI

- `lht-cmn/css/components.css`
- `lht-cmn/js/components.js`

## lht-cmn の扱い

`lht-cmn` はこのリポジトリに存在しますが、このリポジトリ固有の都合に合わせて自由に改変してよい対象ではありません。

扱いは次のとおりです。

- `lht-cmn` は取り込み済みの共通資産
- このプロジェクトでの責務は「利用すること」
- 改善が必要な場合は `lht-cmn` 側への変更提案として扱う
- このプロジェクト固有の暫定事情を `lht-cmn` に蓄積しない

#### AI 向けの禁止事項

- `lht-cmn/css/components.css` をこのプロジェクト都合だけで恒久修正すること
- `lht-cmn/js/components.js` をこのプロジェクト都合だけで恒久修正すること
- `lht-cmn` をこのリポジトリ専用資産だとみなすこと

#### AI 向けの判断ルール

- まずページ側の工夫で吸収できるかを検討する
- 吸収できない場合は「`lht-cmn` 側へ変更提案が必要な要件」として整理する
- このリポジトリの成果として `lht-cmn` 直接改変を残さない

## Source Of Truth

このリポジトリでは、次を source of truth とします。

- 本体 HTML 構造
  - `sql-formatter-src.html`
- アプリ制御
  - `src/main.ts`
- formatter ロジック
  - `src/sql-formatter.ts`
- parser / DDL parser
  - `spec/apache-calcite-Parser.js`
  - `spec/wellknown-sql-ddl.js`
- 共通 UI
  - `lht-cmn/css/components.css`
  - `lht-cmn/js/components.js`
- ビルド仕様
  - `scripts/build.mjs`

生成物は source of truth ではありません。

- `sql-formatter.html`
- `sql-formatter-online.html`
- `src/sql-formatter.js`

#### AI 向けの判断ルール

- 生成物に直接パッチを当てない
- 変更は必ず source of truth 側へ入れる
- 生成物だけ直して source 側を直さない状態を作らない

## ビルド戦略

### テンプレートベースで生成する

本体 HTML は手で複数管理しません。テンプレートを 1 つ持ち、ビルド時に差し込みます。

このリポジトリでは `sql-formatter-src.html` がテンプレートです。

テンプレートには、single-file 版と online 版で差し替えるためのトークンを置きます。

例:

- `{{LHT_COMPONENTS_STYLE}}`
- `{{LHT_COMPONENTS_SCRIPT}}`
- `{{CALCITE_PARSER_SCRIPT}}`
- `{{DDL_PARSER_SCRIPT}}`
- `{{FORMATTER_SCRIPT}}`
- `{{APP_SCRIPT}}`

### ソースと生成物の責務を分ける

このリポジトリでは、次を原則にします。

- `sql-formatter.html` と `sql-formatter-online.html` は生成物
- 生成物を直接編集しない
- 変更は次のソース側に対して行う
  - `sql-formatter-src.html`
  - `src/main.ts`
  - `src/sql-formatter.ts`
  - `scripts/build.mjs`
  - 必要に応じて `spec/*.js`

#### AI 向けの禁止事項

- `sql-formatter.html` を直接編集して終わらせること
- `sql-formatter-online.html` を直接編集して終わらせること
- `src/sql-formatter.js` を source of truth とみなして編集すること

### single-file 版では可能な限りインライン化する

single-file 版では、実行に必要な CSS / JS を HTML に埋め込みます。

このリポジトリでは `sql-formatter.html` に次を内包します。

- `lht-cmn/css/components.css`
- `lht-cmn/js/components.js`
- parser
- formatter
- app script

結果として `sql-formatter.html` 単体で動作可能な状態を作ります。

#### AI 向けの達成条件

- `sql-formatter.html` は追加ファイルなしで動作できること
- `lht-cmn` への `<link>` / `<script src>` 参照が残らないこと
- parser / formatter / app script も実行に必要な形で内包されること

### online 版では通常の外部参照を維持する

online 版では、実行時に外部 CSS / JS を読み込みます。

このリポジトリでは `sql-formatter-online.html` が次を外部参照します。

- `./lht-cmn/css/components.css`
- `./lht-cmn/js/components.js`
- `./spec/apache-calcite-Parser.js`
- `./spec/wellknown-sql-ddl.js`
- `./src/sql-formatter.js`

この構成は、開発中の差し替えやデバッグに向きます。

#### AI 向けの達成条件

- `sql-formatter-online.html` は外部参照を維持すること
- online 版を single-file 化しないこと
- 外部参照パスを壊さないこと

## 現在のビルド契約

### 入力

- テンプレート
  - `sql-formatter-src.html`
- UI 共通資産
  - `lht-cmn/css/components.css`
  - `lht-cmn/js/components.js`
- formatter 本体
  - `src/sql-formatter.ts`
- アプリ制御
  - `src/main.ts`
- parser / DDL parser
  - `spec/apache-calcite-Parser.js`
  - `spec/wellknown-sql-ddl.js`

### 出力

- `sql-formatter.html`
  - 完全単一ファイル版
- `sql-formatter-online.html`
  - 外部参照を持つ通常版
- `src/sql-formatter.js`
  - build 時に `src/sql-formatter.ts` から生成されるブラウザ実行用 JS

### 実行コマンド

- `npm run build`
  - `npm run test:unit && npm run build:html`
- `npm run build:html`
  - `node ./scripts/build.mjs`
- `npm run test:unit`
  - `node ./test/sql-formatter.test.ts`
- `npm run check:all`
  - `npm run test:unit && npm run build:html`

### build.mjs の役割

- `sql-formatter-src.html` を読み込む
- `src/sql-formatter.ts` を `stripTypeScriptTypes` で JS 化する
- `src/sql-formatter.js` を再生成する
- single-file 版には必要資産をインライン埋め込みする
- online 版には必要資産を外部参照として差し込む
- `sql-formatter.html` と `sql-formatter-online.html` を出力する

#### AI 向けの判断ルール

- 新しい内包対象や外部参照対象を追加した場合は `scripts/build.mjs` に差し込みルールを明示する
- 差し込みトークンを増やした場合は、この文書にも追記する

### offline / online の差分

- offline (`sql-formatter.html`)
  - `lht-cmn/css/components.css` をインライン埋め込み
  - `lht-cmn/js/components.js` をインライン埋め込み
  - parser をインライン埋め込み
  - DDL parser をインライン埋め込み
  - formatter をインライン埋め込み
  - app script をインライン埋め込み

- online (`sql-formatter-online.html`)
  - `./lht-cmn/css/components.css` を外部参照
  - `./lht-cmn/js/components.js` を外部参照
  - `./spec/apache-calcite-Parser.js` を外部参照
  - `./spec/wellknown-sql-ddl.js` を外部参照
  - `./src/sql-formatter.js` を外部参照
  - app script はテンプレートへ差し込む

## 変更時の実務手順

### UI 変更

1. まず `sql-formatter-src.html` を編集する
2. 必要なら `src/main.ts` を編集する
3. `lht-cmn` に不足がある場合は、このリポジトリで恒久修正せず変更提案事項として整理する
4. `npm run build` を実行する
5. 生成物に意図した差分が出ていることを確認する

### formatter ロジック変更

1. `src/sql-formatter.ts` を編集する
2. 必要なら `test/sql-formatter.test.ts` を更新する
3. `npm run build` を実行する
4. `src/sql-formatter.js` と生成 HTML へ反映されていることを確認する

### build 仕様変更

1. `scripts/build.mjs` を編集する
2. 必要なら `sql-formatter-src.html` のトークンも更新する
3. `npm run build` を実行する
4. offline / online の差分が意図どおりか確認する

## cache-busting 方針

### 入口ページ側で付与する

`index.html` では、本体ページを開く直前に `v=` クエリを更新します。

目的は次のとおりです。

- GitHub Pages などのキャッシュ影響を軽減する
- 利用者が古い本体を開き続ける確率を下げる

この方式は、入口から本体へ遷移する導線に対して有効です。

### 注意点

この方式だけでは、本体 URL を直接ブックマークしている利用者には効きません。

そのため、公開運用で厳密にキャッシュを制御したい場合は、次も検討対象です。

- ファイル名自体にバージョンを含める
- 配信側の cache-control を調整する

ただし、静的配布前提のツールでは、入口ページで `v=` を付ける方式は実装コストに対して効果が高いです。

#### AI 向けの判断ルール

- 本体ページ側へ場当たりで cache-busting 用スクリプトを追加しない
- 入口から本体へ行く導線の cache-busting は `index.html` 側に集約する

## この方式のメリット

### 配布性

- single-file 版を 1 ファイルで配れる
- オフライン利用しやすい
- 保存、バックアップ、アーカイブが容易

### 保守性

- online 版で通常の開発フローを維持できる
- テンプレート 1 つから両方生成するため、差異管理がしやすい
- UI を共通レイヤーへ寄せることでページ間の重複を減らせる

### 説明性

- `index.html` をランディングページにすることで、公開時の入口が分かりやすくなる
- 本体ページを直接開かなくても、先に用途とメリットを伝えられる

## この方式の注意点

### 1. single-file 版と online 版が乖離しないようにする

見た目や挙動がずれ始めると、2 系統の維持コストが急に上がります。

そのため、原則として:

- テンプレートは 1 つ
- 差異は差し込み方式だけ

に保つべきです。

#### AI 向けの失敗パターン

- offline 版だけ HTML 構造を変える
- online 版だけ機能を増やす
- 両者で別々のテンプレートを作り始める

### 2. 共通 UI レイヤーへ入れすぎない

`lht-cmn` のような共通レイヤーは有効ですが、ページ固有要件まで抱え込むと逆に扱いづらくなります。

共通化する対象は:

- 入出力 UI
- メニュー
- toast
- スイッチ
- ヒーロー

など、複数ページで明確に再利用するものに絞ります。

#### AI 向けの失敗パターン

- 1 ページ専用のレイアウト事情を `lht-cmn` に入れる
- 文言や余白調整だけのために新規共通コンポーネントを増やす

### 3. 入口ページに機能を持たせすぎない

`index.html` は本体ではありません。

役割を増やしすぎると、再び本体との責務が曖昧になります。

#### AI 向けの失敗パターン

- `index.html` に formatter 本体 UI を戻す
- `index.html` に parser / formatter ロジックを持ち込む

## 他プロジェクトへ横展開する際のチェックリスト

- 本体 HTML を single-file 版と online 版に分ける必要があるか
- `index.html` を紹介ページに分離したほうがよいか
- 共通 UI レイヤーへ寄せるべき UI があるか
- テンプレート 1 つから生成できる構成になっているか
- single-file 版で何を内包し、何を外に残すか定義されているか
- cache-busting を入口ページ側で扱うか、配信側で扱うか決めているか

## 推奨ルール

- 本体テンプレートは 1 つにする
- single-file 版と online 版の差はビルド時差し込みに限定する
- `index.html` は紹介と導線に専念させる
- 共通 UI はレイヤー化し、ページ固有レイアウトはページ側に残す
- single-file 版は「本当に 1 ファイルで動くか」を常に確認する
- 生成物は直接編集しない
- 変更後は `npm run build` で再生成する

## AI への最終指示

このリポジトリを変更する生成AIは、次を守ること。

1. まず source of truth 側を編集する
2. 生成物を直接修正して完了にしない
3. offline / online の差分はビルド差し込みに限定する
4. `index.html` は本体ではなく入口として扱う
5. `lht-cmn` は共通 UI に限定し、ページ固有要件を持ち込まない
6. 変更後は `npm run build` を実行して生成物を更新する
7. 必要ならこの文書自体も現状に合わせて更新する

## このリポジトリでの要約

このリポジトリでは、次の分担に整理しています。

- `index.html`
  - 紹介ページ
- `sql-formatter.html`
  - 完全単一ファイル版
- `sql-formatter-online.html`
  - 外部参照を持つ通常版
- `lht-cmn`
  - 共通 UI 基盤
- `scripts/build.mjs`
  - 上記を生成・切替するビルドスクリプト

この構成は、単一 HTML 配布を維持しながら、開発・保守・横展開も成立させるためのバランス案です。
