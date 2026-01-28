# SQL Formatter ルール（暫定）

本ドキュメントは SQL Formatter の出力スタイルを定義するルール表です。

## 基本スタイル
- インデント: **4 スペース**
- キーワード: **大文字 (UPPER)**
- 末尾セミコロン: **なし**
- カンマ位置: **先頭**

## SELECT 句
- カラムは **1 行 1 カラム**
- 例:
  ```sql
  SELECT
      col_a
    , col_b
    , SUM(col_c)
  FROM table_name
  ```

## 主要句の改行方針
- 以下の句は **必ず改行**
  - `FROM`
  - `JOIN`
  - `WHERE`
  - `GROUP BY`
  - `HAVING`
  - `ORDER BY`

## JOIN の整形
- JOIN 句は 1 行 1 句
- `ON` / `USING` は次行にインデント

例:
```sql
FROM table_a a
JOIN table_b b
    ON a.id = b.id
```

## WHERE / GROUP BY / HAVING / ORDER BY
- 各句は 1 行開始
- `AND` / `OR` は **次行** に出す

例:
```sql
WHERE a = 1
  AND b = 2
```

## TODO
- サブクエリ・括弧のインデント方針
- 関数引数の改行ルール
- CASE 式の整形ルール
- SETOP（UNION/INTERSECT/EXCEPT）の改行規則
- WINDOW 句/OVER 句の改行規則
