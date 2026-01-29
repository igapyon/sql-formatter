### ANSI SQL 風 DDL EBNF（完成版・単体仕様）

この文法は ANSI SQL を「風味」として整理した簡易版です。
実際のDB方言差が大きいので、実装側では必要に応じて拡張してください。

```ebnf
SqlDdlStmt              ::= CreateSchemaStmt
                          | DropSchemaStmt
                          | CreateTableStmt
                          | DropTableStmt
                          | AlterTableStmt
                          | TruncateTableStmt
                          | CreateViewStmt
                          | DropViewStmt
                          | CreateMaterializedViewStmt
                          | DropMaterializedViewStmt
                          | CreateIndexStmt
                          | DropIndexStmt
                          | CreateSequenceStmt
                          | DropSequenceStmt
                          | AlterSequenceStmt
                          | CreateDomainStmt
                          | AlterDomainStmt
                          | DropDomainStmt
                          | CreateTypeStmt
                          | DropTypeStmt
                          | CreateFunctionStmt
                          | DropFunctionStmt
                          | CreateProcedureStmt
                          | DropProcedureStmt
                          | CreateTriggerStmt
                          | DropTriggerStmt
                          | CommentStmt
                          | GrantStmt
                          | RevokeStmt
                          | CreateRoleStmt
                          | DropRoleStmt
                          | CreateUserStmt
                          | DropUserStmt

CreateSchemaStmt         ::= "CREATE" "SCHEMA"
                             [ "IF" "NOT" "EXISTS" ]
                             SchemaName
                             [ "AUTHORIZATION" SimpleIdentifier ]
                             [ "DEFAULT" "CHARACTER" "SET" SimpleIdentifier ]

DropSchemaStmt           ::= "DROP" "SCHEMA"
                             [ "IF" "EXISTS" ]
                             SchemaName
                             [ "CASCADE" | "RESTRICT" ]

CreateTableStmt          ::= "CREATE" [ "TEMP" | "TEMPORARY" ] "TABLE"
                             [ "IF" "NOT" "EXISTS" ]
                             TableName
                             ( "(" TableElement { "," TableElement } ")"
                             | "AS" QueryOrExpr [ "WITH" "DATA" | "WITH" "NO" "DATA" ]
                             | "LIKE" TableName [ "INCLUDING" "ALL" | "EXCLUDING" "ALL" ]
                             )
                             [ "ON" "COMMIT" ( "PRESERVE" "ROWS" | "DELETE" "ROWS" ) ]
                             [ TablePartitioning ]
                             [ TableOptions ]

TableElement             ::= ColumnDef
                          | TableConstraint

ColumnDef                ::= ColumnName DataType
                             [ ColumnConstraint { ColumnConstraint } ]
                             [ IdentityClause ]
                             [ GeneratedClause ]
                             [ CollateClause ]

TableConstraint          ::= [ "CONSTRAINT" ConstraintName ]
                             ( "PRIMARY" "KEY" "(" ColumnName { "," ColumnName } ")"
                             | "UNIQUE" "(" ColumnName { "," ColumnName } ")"
                             | "FOREIGN" "KEY" "(" ColumnName { "," ColumnName } ")"
                               "REFERENCES" TableName
                               [ "(" ColumnName { "," ColumnName } ")" ]
                               [ ReferenceActions ]
                             | "CHECK" "(" SearchCondition ")"
                             )

ColumnConstraint         ::= "NOT" "NULL"
                          | "NULL"
                          | "PRIMARY" "KEY"
                          | "UNIQUE"
                          | "DEFAULT" DefaultValue
                          | "CHECK" "(" SearchCondition ")"
                          | "REFERENCES" TableName
                            [ "(" ColumnName { "," ColumnName } ")" ]
                            [ ReferenceActions ]
                          | ConstraintAttributes

IdentityClause           ::= "GENERATED"
                             ( "ALWAYS" | "BY" "DEFAULT" )
                             "AS" "IDENTITY"
                             [ "(" IdentityOptions ")" ]

IdentityOptions          ::= IdentityOption { "," IdentityOption }
IdentityOption           ::= "START" "WITH" UnsignedInt
                          | "INCREMENT" "BY" UnsignedInt
                          | "MINVALUE" UnsignedInt
                          | "MAXVALUE" UnsignedInt
                          | "CYCLE"
                          | "NO" "CYCLE"

GeneratedClause          ::= "GENERATED" "ALWAYS" "AS"
                             "(" Expression ")"
                             [ "STORED" | "VIRTUAL" ]

ReferenceActions         ::= [ "ON" "UPDATE" ReferenceAction ]
                             [ "ON" "DELETE" ReferenceAction ]
                             [ MatchType ]
                             [ ConstraintAttributes ]

ReferenceAction          ::= "CASCADE"
                          | "RESTRICT"
                          | "SET" "NULL"
                          | "SET" "DEFAULT"
                          | "NO" "ACTION"

MatchType                ::= "MATCH" ( "FULL" | "PARTIAL" | "SIMPLE" )

ConstraintAttributes     ::= [ "DEFERRABLE" | "NOT" "DEFERRABLE" ]
                             [ "INITIALLY" ( "IMMEDIATE" | "DEFERRED" ) ]

CollateClause            ::= "COLLATE" SimpleIdentifier

DropTableStmt            ::= "DROP" "TABLE"
                             [ "IF" "EXISTS" ]
                             TableName
                             [ "CASCADE" | "RESTRICT" ]

AlterTableStmt           ::= "ALTER" "TABLE"
                             [ "IF" "EXISTS" ]
                             TableName
                             AlterTableAction

AlterTableAction         ::= AddColumnAction
                          | DropColumnAction
                          | AlterColumnAction
                          | AddTableConstraint
                          | DropTableConstraint
                          | RenameTableAction
                          | RenameColumnAction
                          | AlterTableSetOption
                          | AlterTableResetOption
                          | EnableConstraintAction
                          | DisableConstraintAction

AddColumnAction          ::= "ADD" [ "COLUMN" ] ColumnDef

DropColumnAction         ::= "DROP" [ "COLUMN" ] ColumnName
                             [ "RESTRICT" | "CASCADE" ]

AlterColumnAction        ::= "ALTER" [ "COLUMN" ] ColumnName
                             ( "SET" "DATA" "TYPE" DataType
                             | "SET" "DEFAULT" DefaultValue
                             | "DROP" "DEFAULT"
                             | "SET" "NOT" "NULL"
                             | "DROP" "NOT" "NULL"
                             )

AddTableConstraint       ::= "ADD" TableConstraint

DropTableConstraint      ::= "DROP" "CONSTRAINT" ConstraintName

RenameTableAction        ::= "RENAME" "TO" TableName

RenameColumnAction       ::= "RENAME" "COLUMN" ColumnName "TO" ColumnName

AlterTableSetOption      ::= "SET" TableOption
AlterTableResetOption    ::= "RESET" SimpleIdentifier

TruncateTableStmt        ::= "TRUNCATE" "TABLE" TableName [ "RESTART" "IDENTITY" | "CONTINUE" "IDENTITY" ]

EnableConstraintAction   ::= "ENABLE" "CONSTRAINT" ConstraintName
DisableConstraintAction  ::= "DISABLE" "CONSTRAINT" ConstraintName

CreateViewStmt           ::= "CREATE" [ "OR" "REPLACE" ] "VIEW"
                             [ "IF" "NOT" "EXISTS" ]
                             ViewName
                             [ "(" ColumnName { "," ColumnName } ")" ]
                             "AS" QueryOrExpr
                             [ "WITH" ( "CASCADED" | "LOCAL" ) "CHECK" "OPTION" ]

DropViewStmt             ::= "DROP" "VIEW"
                             [ "IF" "EXISTS" ]
                             ViewName
                             [ "CASCADE" | "RESTRICT" ]

CreateMaterializedViewStmt ::= "CREATE" "MATERIALIZED" "VIEW"
                               [ "IF" "NOT" "EXISTS" ]
                               ViewName
                               "AS" QueryOrExpr
                               [ "WITH" "DATA" | "WITH" "NO" "DATA" ]

DropMaterializedViewStmt ::= "DROP" "MATERIALIZED" "VIEW"
                             [ "IF" "EXISTS" ]
                             ViewName
                             [ "CASCADE" | "RESTRICT" ]

CreateIndexStmt          ::= "CREATE" [ "UNIQUE" ] "INDEX"
                             [ "IF" "NOT" "EXISTS" ]
                             IndexName
                             "ON" TableName
                             "(" IndexElement { "," IndexElement } ")"
                             [ IndexOptions ]
                             [ "WHERE" SearchCondition ]

IndexElement             ::= ColumnName [ IndexOrder ]
IndexOrder               ::= "ASC" | "DESC"

IndexOptions             ::= "WITH" "(" StorageParameter { "," StorageParameter } ")"

DropIndexStmt            ::= "DROP" "INDEX"
                             [ "IF" "EXISTS" ]
                             IndexName
                             [ "CASCADE" | "RESTRICT" ]

CreateSequenceStmt       ::= "CREATE" "SEQUENCE"
                             [ "IF" "NOT" "EXISTS" ]
                             SequenceName
                             [ SequenceOptions ]

SequenceOptions          ::= SequenceOption { SequenceOption }
SequenceOption           ::= "START" "WITH" UnsignedInt
                          | "INCREMENT" "BY" UnsignedInt
                          | "MINVALUE" UnsignedInt
                          | "MAXVALUE" UnsignedInt
                          | "CYCLE"
                          | "NO" "CYCLE"
                          | "CACHE" UnsignedInt
                          | "NO" "CACHE"

DropSequenceStmt         ::= "DROP" "SEQUENCE"
                             [ "IF" "EXISTS" ]
                             SequenceName
                             [ "CASCADE" | "RESTRICT" ]

AlterSequenceStmt        ::= "ALTER" "SEQUENCE"
                             [ "IF" "EXISTS" ]
                             SequenceName
                             [ SequenceOptions ]

CreateDomainStmt         ::= "CREATE" "DOMAIN"
                             DomainName
                             [ "AS" ] DataType
                             [ DomainConstraint { DomainConstraint } ]

AlterDomainStmt          ::= "ALTER" "DOMAIN"
                             DomainName
                             ( "SET" "DEFAULT" DefaultValue
                             | "DROP" "DEFAULT"
                             | "ADD" DomainConstraint
                             | "DROP" "CONSTRAINT" ConstraintName
                             )

DropDomainStmt           ::= "DROP" "DOMAIN"
                             DomainName
                             [ "CASCADE" | "RESTRICT" ]

DomainConstraint         ::= [ "CONSTRAINT" ConstraintName ]
                             ( "NOT" "NULL"
                             | "CHECK" "(" SearchCondition ")"
                             )

CreateTypeStmt           ::= "CREATE" "TYPE"
                             TypeName
                             "AS"
                             ( "ENUM" "(" StringLiteral { "," StringLiteral } ")"
                             | "RANGE" "(" DataType ")"
                             | "TABLE" "(" ColumnDef { "," ColumnDef } ")"
                             )

DropTypeStmt             ::= "DROP" "TYPE"
                             TypeName
                             [ "CASCADE" | "RESTRICT" ]

TableOptions             ::= TableOption { TableOption }
TableOption              ::= "WITH" "(" StorageParameter { "," StorageParameter } ")"
                          | "TABLESPACE" SimpleIdentifier
                          | "WITHOUT" "OIDS"

StorageParameter         ::= SimpleIdentifier [ "=" Literal ]

TablePartitioning        ::= "PARTITION" "BY" PartitionMethod
PartitionMethod          ::= "RANGE" "(" ColumnName { "," ColumnName } ")"
                          | "LIST" "(" ColumnName { "," ColumnName } ")"
                          | "HASH" "(" ColumnName { "," ColumnName } ")"

DataType                 ::= SimpleIdentifier
                          | SimpleIdentifier "(" UnsignedInt ")"
                          | SimpleIdentifier "(" UnsignedInt "," UnsignedInt ")"

DefaultValue             ::= Literal
                          | "CURRENT_DATE"
                          | "CURRENT_TIME"
                          | "CURRENT_TIMESTAMP"
                          | "NULL"

SearchCondition          ::= Expression

CreateFunctionStmt       ::= "CREATE" [ "OR" "REPLACE" ] "FUNCTION"
                             RoutineName
                             "(" [ RoutineParameter { "," RoutineParameter } ] ")"
                             [ "RETURNS" DataType ]
                             RoutineBody

DropFunctionStmt         ::= "DROP" "FUNCTION"
                             [ "IF" "EXISTS" ]
                             RoutineName

CreateProcedureStmt      ::= "CREATE" [ "OR" "REPLACE" ] "PROCEDURE"
                             RoutineName
                             "(" [ RoutineParameter { "," RoutineParameter } ] ")"
                             RoutineBody

DropProcedureStmt        ::= "DROP" "PROCEDURE"
                             [ "IF" "EXISTS" ]
                             RoutineName

RoutineParameter         ::= [ ParameterMode ] ParameterName DataType
ParameterMode            ::= "IN" | "OUT" | "INOUT"
RoutineBody              ::= "AS" StatementBlock | "LANGUAGE" SimpleIdentifier StatementBlock
StatementBlock           ::= "BEGIN" { Statement } "END"

CreateTriggerStmt        ::= "CREATE" "TRIGGER"
                             TriggerName
                             TriggerTiming TriggerEvent "ON" TableName
                             [ "FOR" "EACH" ( "ROW" | "STATEMENT" ) ]
                             TriggerBody

DropTriggerStmt          ::= "DROP" "TRIGGER"
                             [ "IF" "EXISTS" ]
                             TriggerName

TriggerTiming            ::= "BEFORE" | "AFTER" | "INSTEAD" "OF"
TriggerEvent             ::= "INSERT" | "UPDATE" | "DELETE"
TriggerBody              ::= StatementBlock | "EXECUTE" "PROCEDURE" RoutineName

CommentStmt              ::= "COMMENT" "ON"
                             ( "TABLE" TableName
                             | "COLUMN" TableName "." ColumnName
                             | "VIEW" ViewName
                             | "INDEX" IndexName
                             | "SEQUENCE" SequenceName
                             | "TYPE" TypeName
                             | "DOMAIN" DomainName
                             | "SCHEMA" SchemaName
                             )
                             "IS" StringLiteral

GrantStmt                ::= "GRANT" PrivilegeList
                             "ON" GrantObject
                             "TO" GranteeList
                             [ "WITH" "GRANT" "OPTION" ]

RevokeStmt               ::= "REVOKE" [ "GRANT" "OPTION" "FOR" ]
                             PrivilegeList
                             "ON" GrantObject
                             "FROM" GranteeList
                             [ "CASCADE" | "RESTRICT" ]

PrivilegeList            ::= Privilege { "," Privilege }
Privilege                ::= "ALL" [ "PRIVILEGES" ]
                          | "SELECT" | "INSERT" | "UPDATE" | "DELETE"
                          | "REFERENCES" | "USAGE" | "EXECUTE"

GrantObject              ::= "TABLE" TableName
                          | "VIEW" ViewName
                          | "SEQUENCE" SequenceName
                          | "FUNCTION" RoutineName
                          | "PROCEDURE" RoutineName
                          | "SCHEMA" SchemaName

GranteeList              ::= Grantee { "," Grantee }
Grantee                  ::= SimpleIdentifier | "PUBLIC"

CreateRoleStmt           ::= "CREATE" "ROLE" RoleName
DropRoleStmt             ::= "DROP" "ROLE" RoleName
CreateUserStmt           ::= "CREATE" "USER" UserName
DropUserStmt             ::= "DROP" "USER" UserName

TableName                ::= CompoundIdentifier
ViewName                 ::= CompoundIdentifier
SchemaName               ::= CompoundIdentifier
IndexName                ::= CompoundIdentifier
SequenceName             ::= CompoundIdentifier
DomainName               ::= CompoundIdentifier
TypeName                 ::= CompoundIdentifier
RoutineName              ::= CompoundIdentifier
TriggerName              ::= CompoundIdentifier
RoleName                 ::= SimpleIdentifier
UserName                 ::= SimpleIdentifier
ColumnName               ::= SimpleIdentifier
ConstraintName           ::= SimpleIdentifier
ParameterName            ::= SimpleIdentifier

UnsignedInt              ::= UnsignedNumericLiteral

/* 参照用の外部非終端（このファイルでは定義しない） */
QueryOrExpr              ::= /* from query grammar */
Expression               ::= /* from expression grammar */
Statement                ::= /* from statement grammar */
Literal                  ::= /* from literal grammar */
CompoundIdentifier       ::= /* from identifier grammar */
SimpleIdentifier         ::= /* from identifier grammar */
StringLiteral            ::= /* from literal grammar */
UnsignedNumericLiteral   ::= /* from literal grammar */
```

#### 備考
- ANSI SQL の定義をベースに「よくある方言」を許容する形でまとめています。
- `IF NOT EXISTS` / `IF EXISTS`、`TABLESPACE`、`OR REPLACE` などは方言で差があるため必要に応じて削除/追加してください。
- `DataType` は最小形です。型の詳細は方言ごとに拡張する前提です。
- `CREATE INDEX` / `CREATE SEQUENCE` は標準外の実装差が大きいので、必要なDB方言に合わせて調整してください。
- `MATERIALIZED VIEW` / `DOMAIN` / `TYPE` / `TRUNCATE` は実装差が大きく、必要な方言に合わせて調整してください。
- `FUNCTION` / `PROCEDURE` / `TRIGGER` / `GRANT` / `REVOKE` / `ROLE` / `USER` は方言差が大きく、必要に応じて拡張・削除してください。

---

### 方言差分メモ（追記）

#### PostgreSQL でよくある追加/差異
- `CREATE TABLE ... IF NOT EXISTS` / `CREATE INDEX ... IF NOT EXISTS`
- `CREATE MATERIALIZED VIEW` / `REFRESH MATERIALIZED VIEW`
- `CREATE TYPE ... AS ENUM` / `CREATE TYPE ... AS RANGE`
- `ALTER TABLE ... ALTER COLUMN ... TYPE` / `SET/DROP NOT NULL`
- `CREATE EXTENSION`（本メモでは未定義）
- `COMMENT ON ...` が広範囲で使用可能
- `SERIAL` 系型（実質は SEQUENCE）

#### MySQL でよくある追加/差異
- `ENGINE=InnoDB` などのテーブルオプション
- `AUTO_INCREMENT`（IDENTITY の方言）
- `CREATE TABLE ... LIKE ...` はよく使う
- `ALTER TABLE ... MODIFY COLUMN`（PostgreSQL とは書式差）
- `CREATE/DROP USER` / `GRANT` / `REVOKE` の権限仕様が独自
- `PARTITION BY` の書式が独自

#### SQLite でよくある追加/差異
- `CREATE TABLE ... WITHOUT ROWID`
- `AUTOINCREMENT`（主に INTEGER PRIMARY KEY と併用）
- `ALTER TABLE` の対応範囲が限定的
- `DROP COLUMN` が一部バージョンでのみ対応
- 型は柔軟（Affinity ベース）

#### 取り込み方針（例）
- このファイルは共通核 + 方言メモの位置づけ。
- 実装で必要なら「方言専用の追加文法」を別セクションで起こす。
