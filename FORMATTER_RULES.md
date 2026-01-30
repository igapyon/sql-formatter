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

## DDL ステートメント

DDL（CREATE/ALTER/DROP TABLE など）のフォーマットルール：

### 基本スタイル
- キーワード: **大文字**（CREATE, TABLE, DROP など）
- インデント: **4 スペース**（DML と同じ）
- カンマ位置: **先頭**（リスト内）

### 複数行構造
- トップレベルキーワードは独立した行
- テーブル名と句はインデント
- 括弧内リスト（カラム定義など）はネストインデント

### 例

**DROP TABLE**
```sql
DROP TABLE IF EXISTS orders CASCADE
```

**CREATE TABLE**
```sql
CREATE TABLE users
    (
        id INT
        , name VARCHAR(100)
    )
```

**CREATE INDEX**
```sql
CREATE UNIQUE INDEX idx_email
ON users
    (
        email
    )
```

**ALTER TABLE**
```sql
ALTER TABLE users
    ADD COLUMN age INT
```

## パススルー（未実装）

以下の機能はフォーマット未実装です。元の SQL がそのまま返されます：

- **CASE 式**: `CASE WHEN ... THEN ... ELSE ... END`
- **SETOP**: UNION, UNION ALL, INTERSECT, EXCEPT
- **WINDOW 関数**: `OVER (PARTITION BY ... ORDER BY ...)`
- **CTE**: `WITH ... AS (...) SELECT ...`
- **関数引数の複雑な改行ルール**
