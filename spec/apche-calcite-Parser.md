### Apache Calcite `SqlParserImpl.jj` EBNF

#### 1. エントリポイントとトップレベル文 (Entry Points & Statements)

```ebnf
SqlStmtList        ::= [ SqlStmt { ";" [ SqlStmt ] } ] <EOF>
SqlStmtEof         ::= SqlStmt <EOF>
SqlExpressionEof   ::= Expression <EOF>

SqlStmt            ::= SqlSetOption | SqlAlter | OrderedQueryOrExpr | SqlExplain 
                     | SqlDescribe | SqlInsert | SqlDelete | SqlUpdate | SqlMerge 
                     | SqlProcedureCall

SqlSetOption       ::= "SET" CompoundIdentifier "=" ( Literal | SimpleIdentifier | "ON" )
                     | "RESET" ( CompoundIdentifier | "ALL" )
SqlAlter           ::= "ALTER" ( "SYSTEM" | "SESSION" ) SqlSetOption

SqlExplain         ::= "EXPLAIN" "PLAN" [ ExplainDetailLevel ] [ ExplainDepth ] [ "AS" ( "XML" | "JSON" | "DOT" ) ] "FOR" SqlQueryOrDml
ExplainDetailLevel ::= ( "EXCLUDING" | "INCLUDING" [ "ALL" ] ) "ATTRIBUTES"
ExplainDepth       ::= "WITH" "TYPE" | "WITH" "IMPLEMENTATION" | "WITHOUT" "IMPLEMENTATION"
SqlQueryOrDml      ::= OrderedQueryOrExpr | SqlInsert | SqlDelete | SqlUpdate | SqlMerge

SqlDescribe        ::= "DESCRIBE" ( ( "DATABASE" | "CATALOG" | "SCHEMA" ) CompoundIdentifier
                                  | [ "TABLE" ] CompoundIdentifier [ SimpleIdentifier ]
                                  | [ "STATEMENT" ] SqlQueryOrDml )

SqlProcedureCall   ::= "CALL" NamedRoutineCall

```

#### 2. クエリとSELECT構文 (Query & SELECT)

```ebnf
OrderedQueryOrExpr ::= QueryOrExpr OrderByLimitOpt
QueryOrExpr        ::= [ WithClause ] LeafQueryOrExpr { AddSetOpQuery }
OrderByLimitOpt    ::= [ OrderBy ]
                       [ LimitClause [ OffsetClause ]
                       | OffsetClause ( [ LimitClause ] | FetchClause )
                       | FetchClause
                       ]
WithClause         ::= "WITH" [ "RECURSIVE" ] WithItem { "," WithItem }
WithItem           ::= SimpleIdentifier [ "(" SimpleIdentifierList ")" ] "AS" ParenthesizedExpression

SqlSelect          ::= "SELECT" [ Hint ] [ SqlSelectKeywords ] [ "STREAM" ] [ "ALL" | "DISTINCT" ]
                       SelectItem { "," SelectItem }
                       [ "FROM" FromClause ]
                       [ "WHERE" Expression ]
                       [ "GROUP" "BY" [ "DISTINCT" | "ALL" ] GroupingElementList ]
                       [ "HAVING" Expression ]
                       [ "WINDOW" WindowDeclaration { "," WindowDeclaration } ]
                       [ "QUALIFY" Expression ]

SelectItem         ::= ( "*" | Expression )
                       [ [ "AS" [ "MEASURE" ] ]
                         ( SimpleIdentifier | SimpleIdentifierFromStringLiteral )
                       ]
GroupingElementList::= GroupingElement { "," GroupingElement }
GroupingElement    ::= "GROUPING" "SETS" "(" GroupingElementList ")"
                     | "ROLLUP" "(" ExpressionList ")"
                     | "CUBE" "(" ExpressionList ")"
                     | "(" ")"
                     | Expression

WindowDeclaration  ::= SimpleIdentifier "AS" WindowSpecification
WindowSpecification::= "(" [ SimpleIdentifier ] 
                           [ "PARTITION" "BY" ExpressionList ] 
                           [ OrderBy ] 
                           [ ( "ROWS" | "RANGE" )
                             ( "BETWEEN" WindowRange "AND" WindowRange | WindowRange )
                             WindowExclusion
                           ] 
                           [ ( "ALLOW" | "DISALLOW" ) "PARTIAL" ] 
                       ")"
WindowRange        ::= "CURRENT" "ROW" 
                     | "UNBOUNDED" ( "PRECEDING" | "FOLLOWING" ) 
                     | Expression ( "PRECEDING" | "FOLLOWING" )
WindowExclusion    ::= "EXCLUDE" ( "CURRENT" "ROW" | "NO" "OTHERS" | "GROUP" | "TIES" )
                     | /* empty (default: NO OTHERS) */

OrderBy            ::= "ORDER" "BY" OrderItemList
OrderItemList      ::= OrderItem { "," OrderItem }
OrderItem          ::= Expression [ "AS" ( SimpleIdentifier | SimpleIdentifierFromStringLiteral ) ] [ "ASC" | "DESC" ] [ "NULLS" ( "FIRST" | "LAST" ) ]

LimitClause        ::= "LIMIT" (
                         UnsignedNumericLiteralOrParam "," ( UnsignedNumericLiteralOrParam | "ALL" )
                       | UnsignedNumericLiteralOrParam
                       | "ALL"
                       )
OffsetClause       ::= "OFFSET" UnsignedNumericLiteralOrParam [ "ROW" | "ROWS" ]
FetchClause        ::= "FETCH" ( "FIRST" | "NEXT" ) UnsignedNumericLiteralOrParam ( "ROW" | "ROWS" ) "ONLY"

```

#### 3. FROM句とテーブル参照 (Table References & Joins)

```ebnf
FromClause         ::= TableRef { JoinOrCommaTable }
JoinOrCommaTable   ::= "," TableRef
                     | JoinTable
                     | "CROSS" "APPLY" TableRef
                     | "OUTER" "APPLY" TableRef

JoinType           ::= "JOIN" | "INNER" "JOIN" 
                     | "LEFT" [ "OUTER" | "ASOF" ] "JOIN" 
                     | "RIGHT" [ "OUTER" ] "JOIN" 
                     | "FULL" [ "OUTER" ] "JOIN" 
                     | "CROSS" "JOIN" 
                     | "ASOF" "JOIN"

JoinTable          ::= [ "NATURAL" ] JoinType TableRef [ JoinCondition ]
JoinCondition      ::= "ON" Expression 
                     | "USING" "(" SimpleIdentifierList ")"
                     | "MATCH_CONDITION" Expression "ON" Expression  /* ASOF JOINのみ */

TableRef           ::= TableRefPrimary
                       [ PivotClause ] [ UnpivotClause ]
                       [ [ "AS" ] SimpleIdentifier [ "(" SimpleIdentifierList ")" ] ]
                       [ TablesampleClause ]
TableRefPrimary    ::= CompoundTableIdentifier
                         ( ImplicitTableFunctionCallArgs
                         | [ TableHints ] [ ExtendTable ] [ OverClause ]
                           [ SnapshotClause ] [ MatchRecognizeClause ]
                         )
                     | [ "LATERAL" ] "(" OrderedQueryOrExpr ")" [ OverClause ] [ MatchRecognizeClause ]
                     | [ "LATERAL" ] "UNNEST" "(" ExpressionList ")" [ "WITH" "ORDINALITY" ]
                     | [ "LATERAL" ] TableFunctionCall
                     | ExtendedTableRef

SnapshotClause     ::= "FOR" "SYSTEM_TIME" "AS" "OF" Expression
ExtendTable        ::= [ "EXTEND" ] "(" ColumnType { "," ColumnType } ")"
ColumnType         ::= CompoundIdentifier DataType [ "NOT" "NULL" ]

TablesampleClause  ::= "TABLESAMPLE" ( "SUBSTITUTE" "(" StringLiteral ")" 
                                       | ( "BERNOULLI" | "SYSTEM" ) "(" UnsignedNumericLiteral ")" [ "REPEATABLE" "(" IntLiteral ")" ] )

PivotClause        ::= "PIVOT" "(" PivotAgg { "," PivotAgg } "FOR" SimpleIdentifierOrList "IN" "(" PivotValue { "," PivotValue } ")" ")"
UnpivotClause      ::= "UNPIVOT" [ ( "INCLUDE" | "EXCLUDE" ) "NULLS" ] "(" SimpleIdentifierOrList "FOR" SimpleIdentifierOrList "IN" "(" UnpivotValue { "," UnpivotValue } ")" ")"

MatchRecognizeClause ::= "MATCH_RECOGNIZE" "(" 
                           [ "PARTITION" "BY" ExpressionList ] 
                           [ OrderBy ] 
                           [ "MEASURES" MeasureColumn { "," MeasureColumn } ] 
                           [ ( "ONE" "ROW" | "ALL" "ROWS" ) "PER" "MATCH" ]
                           [ "AFTER" "MATCH" "SKIP" <SkipTo> ]
                           "PATTERN" "(" [ "^" ] PatternExpression [ "$" ] ")" 
                           [ "WITHIN" IntervalLiteral ] 
                           [ "SUBSET" SubsetDefinition { "," SubsetDefinition } ]
                           "DEFINE" PatternDefinition { "," PatternDefinition } 
                         ")"

```

#### 4. 式の階層構造 (Expression Hierarchy)

```ebnf
Expression         ::= Expression2
Expression2        ::= { PrefixRowOperator } Expression3
                       { ( BinaryRowOperator Expression3 ) | PostfixRowOperator | SpecialRowOperator }

/* 演算子詳細 */
BinaryRowOperator  ::= "=" | "<<" | ">" | "<" | "<=" | ">=" | "<>" | "!="
                     | "+" | "-" | "*" | "/" | "%" | "||"
                     | "AND" | "OR"
                     | "IS" "DISTINCT" "FROM" | "IS" "NOT" "DISTINCT" "FROM"
                     | "MEMBER" "OF"
                     | "SUBMULTISET" "OF" | "NOT" "SUBMULTISET" "OF"
                     | "CONTAINS" | "OVERLAPS"
                     | "^" | "&" | "EQUALS"
                     | "PRECEDES" | "SUCCEEDS"
                     | "IMMEDIATELY" "PRECEDES" | "IMMEDIATELY" "SUCCEEDS"
                     | MultisetBinaryOperator
MultisetBinaryOperator ::= "UNION" [ "ALL" | "DISTINCT" ]
                        | "INTERSECT" [ "ALL" | "DISTINCT" ]
                        | "EXCEPT" [ "ALL" | "DISTINCT" ]

PrefixRowOperator  ::= "+" | "-" | "NOT" | "EXISTS" | "UNIQUE"
PostfixRowOperator ::= "IS" [ "NOT" ]
                         ( "NULL" | "TRUE" | "FALSE" | "UNKNOWN"
                         | "A" "SET" | "EMPTY"
                         | "JSON" [ "VALUE" | "OBJECT" | "ARRAY" | "SCALAR" ]
                         )
                     | "FORMAT" JsonRepresentation

SpecialRowOperator ::= [ "NOT" ] "IN" "(" ( OrderedQueryOrExpr | ExpressionList ) ")"
                     | [ "NOT" ] "BETWEEN" [ "SYMMETRIC" | "ASYMMETRIC" ] Expression2 "AND" Expression2
                     | [ "NOT" ] ( "LIKE" | "ILIKE" | "RLIKE" | "SIMILAR" "TO" ) Expression2 [ "ESCAPE" Expression3 ]

Expression3        ::= AtomicRowExpression 
                     | CursorExpression 
                     | [ "ROW" ] "(" [ "DISTINCT" | "ALL" ] ExpressionList ")" 
                     | LambdaExpression

AtomicRowExpression::= Literal | DynamicParam | BuiltinFunctionCall | JdbcFunctionCall 
                     | MultisetConstructor | ArrayConstructor | MapConstructor | PeriodConstructor
                     | NamedFunctionCall | ContextVariable | CompoundIdentifier | "*"
                     | NewSpecification | CaseExpression | SequenceExpression

```

#### 5. 関数、コンストラクタ、特殊構文 (Special Functions & Constructors)

```ebnf
BuiltinFunctionCall ::= ( "CAST" | "SAFE_CAST" | "TRY_CAST" ) "(" Expression "AS" ( DataType | "INTERVAL" IntervalQualifier ) [ "FORMAT" StringLiteral ] ")"
                      | "EXTRACT" "(" TimeUnitOrName "FROM" Expression ")"
                      | "POSITION" "(" AtomicRowExpression "IN" Expression [ "FROM" Expression ] ")"
                      | "CONVERT" "(" ( Expression "USING" SimpleIdentifier | DataType "," Expression [ "," ( UnsignedNumericLiteral | "NULL" ) ] ) ")"
                      | "TRANSLATE" "(" Expression ( "USING" SimpleIdentifier | { "," Expression } ) ")"
                      | "OVERLAY" "(" Expression "PLACING" Expression "FROM" Expression [ "FOR" Expression ] ")"
                      | ( "FLOOR" | "CEIL" ) "(" Expression [ "TO" TimeUnitOrName ] ")" [ OverClause ]
                      | "SUBSTRING" "(" Expression ( "FROM" | "," ) Expression [ ( "FOR" | "," ) Expression ] ")"
                      | "TRIM" "(" [ ( "BOTH" | "TRAILING" | "LEADING" ) [ Expression ] "FROM" ] Expression ")"
                      | DateDiffFunctionCall | TimestampAddFunctionCall | JsonFunctionCall | GroupByWindowingCall | ...

JsonFunctionCall    ::= "JSON_VALUE" "(" JsonApiCommonSyntax [ "RETURNING" DataType ] { JsonValueBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
                      | "JSON_QUERY" "(" JsonApiCommonSyntax [ "RETURNING" DataType ] [ JsonWrapperBehavior "WRAPPER" ] { JsonQueryBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
                      | "JSON_OBJECT" "(" [ JsonNameAndValue { "," JsonNameAndValue } ] [ JsonConstructorNullClause ] ")"
                      | "JSON_ARRAY" "(" [ Expression { "," Expression } ] [ JsonConstructorNullClause ] ")"

CaseExpression      ::= "CASE" [ Expression ] { "WHEN" Expression "THEN" Expression } [ "ELSE" Expression ] "END"
MultisetConstructor ::= "MULTISET" ( "(" OrderedQueryOrExpr ")" | "[" ExpressionList "]" )
ArrayConstructor    ::= "ARRAY" ( "(" OrderedQueryOrExpr ")" | "[" [ ExpressionList ] "]" | "(" [ ExpressionList ] ")" )
MapConstructor      ::= "MAP" ( "(" OrderedQueryOrExpr ")" | "[" [ ExpressionList ] "]" | "(" [ ExpressionList ] ")" )

```

#### 6. データ型とリテラル (Types & Literals)

```ebnf
DataType           ::= TypeName { ( "MULTISET" | "ARRAY" ) }
TypeName           ::= SqlTypeName | RowTypeName | MapTypeName | CompoundIdentifier
SqlTypeName        ::= "BOOLEAN" | ( "INTEGER" | "INT" ) [ "UNSIGNED" ] | "TINYINT" [ "UNSIGNED" ] | "SMALLINT" [ "UNSIGNED" ] | "BIGINT" [ "UNSIGNED" ] 
                     | "REAL" | "DOUBLE" [ "PRECISION" ] | "FLOAT" | "BINARY" [ "VARYING" ] | "VARBINARY" | "UUID"
                     | ( "DECIMAL" | "DEC" | "NUMERIC" ) [ "(" UnsignedIntLiteral [ "," IntLiteral ] ")" ]
                     | ( "CHARACTER" [ "VARYING" ] | "CHAR" | "VARCHAR" ) [ "(" UnsignedIntLiteral ")" ] [ "CHARACTER" "SET" Identifier ]
                     | "DATE" | "TIME" [ Precision ] [ TimeZoneOpt ] | "TIMESTAMP" [ Precision ] [ TimeZoneOpt ] | "GEOMETRY" | "VARIANT"

RowTypeName        ::= "ROW" "(" SimpleIdentifier DataType [ "NULL" | "NOT" "NULL" ] { "," ... } ")"
MapTypeName        ::= "MAP" "<" DataType "," DataType ">"

Literal            ::= NumericLiteral | StringLiteral | SpecialLiteral | DateTimeLiteral | IntervalLiteral
NumericLiteral     ::= [ "+" | "-" ] ( UnsignedInteger | Decimal | Approx )
SpecialLiteral     ::= "TRUE" | "FALSE" | "UNKNOWN" | "NULL"
DateTimeLiteral    ::= "DATE" StringLiteral | "TIME" StringLiteral | "TIMESTAMP" StringLiteral | "{d '...'}" | "{t '...'}" | "{ts '...'}"
IntervalLiteral    ::= "INTERVAL" [ "+" | "-" ] StringLiteral IntervalQualifier
IntervalQualifier  ::= TimeUnit [ "(" Precision [ "," Precision ] ")" ] [ "TO" TimeUnit ]
