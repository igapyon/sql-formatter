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

SqlExplain         ::= "EXPLAIN" "PLAN"
                       [ ExplainDetailLevel ]
                       [ ExplainDepth ]
                       [ "AS" ( "XML" | "JSON" | "DOT" ) ]
                       "FOR" SqlQueryOrDml
ExplainDetailLevel ::= ( "EXCLUDING" | "INCLUDING" [ "ALL" ] ) "ATTRIBUTES"
ExplainDepth       ::= "WITH" "TYPE" | "WITH" "IMPLEMENTATION" | "WITHOUT" "IMPLEMENTATION"
                     | /* empty (default: PHYSICAL) */
SqlQueryOrDml      ::= OrderedQueryOrExpr | SqlInsert | SqlDelete | SqlUpdate | SqlMerge

SqlDescribe        ::= "DESCRIBE"
                       ( ( "DATABASE" | "CATALOG" | "SCHEMA" ) CompoundIdentifier
                       | [ "TABLE" ] CompoundIdentifier [ SimpleIdentifier ]
                       | [ "STATEMENT" ] SqlQueryOrDml
                       )

SqlProcedureCall   ::= "CALL" NamedRoutineCall

```

#### 1b. DML (INSERT/UPDATE/DELETE/MERGE)

```ebnf
SqlInsert            ::= ( "INSERT" | "UPSERT" ) SqlInsertKeywords
                       "INTO" CompoundTableIdentifier
                       [ TableHints ] [ ExtendTable ]
                       [ ParenthesizedCompoundIdentifierList ]
                       OrderedQueryOrExpr

SqlInsertKeywords    ::= /* empty (dialect-specific) */

SqlDelete            ::= "DELETE" "FROM" CompoundTableIdentifier
                       [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       [ Where ]

SqlUpdate            ::= "UPDATE" CompoundTableIdentifier
                       [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       "SET" CompoundIdentifier "=" Expression
                       { "," CompoundIdentifier "=" Expression }
                       [ Where ]

SqlMerge             ::= "MERGE" "INTO" CompoundTableIdentifier
                       [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       "USING" TableRef
                       "ON" Expression
                       ( WhenMatchedClause [ WhenNotMatchedClause ]
                       | WhenNotMatchedClause
                       )

WhenMatchedClause    ::= "WHEN" "MATCHED" "THEN"
                       "UPDATE" "SET" CompoundIdentifier "=" Expression
                       { "," CompoundIdentifier "=" Expression }

WhenNotMatchedClause ::= "WHEN" "NOT" "MATCHED" "THEN" "INSERT"
                         SqlInsertKeywords
                         [ ParenthesizedSimpleIdentifierList ]
                         ( "VALUES" RowConstructor
                         | "(" "VALUES" RowConstructor ")" )

Where                ::= "WHERE" Expression
```

#### 2. クエリとSELECT構文 (Query & SELECT)

```ebnf
OrderedQueryOrExpr  ::= QueryOrExpr OrderByLimitOpt
QueryOrExpr         ::= [ WithList ] LeafQueryOrExpr { AddSetOpQuery }
OrderByLimitOpt     ::= [ OrderBy ]
                       [ LimitClause [ OffsetClause ]
                       | OffsetClause ( [ LimitClause ] | FetchClause )
                       | FetchClause
                       ]
LeafQueryOrExpr     ::= LeafQuery | Expression
LeafQuery           ::= SqlSelect | TableConstructor | ExplicitTable
ExplicitTable       ::= "TABLE" CompoundIdentifier
TableConstructor    ::= ( "VALUES" | "VALUE" ) RowConstructor { "," RowConstructor }
RowConstructor      ::= "(" "ROW" ParenthesizedQueryOrCommaListWithDefault ")"
                     | [ "ROW" ] ParenthesizedQueryOrCommaListWithDefault
                     | Expression
WithList            ::= "WITH" [ "RECURSIVE" ] AddWithItem { "," AddWithItem }

SqlSelect           ::= "SELECT"
                       [ "/*+" AddHint { "," AddHint } "*/" ]
                       [ SqlSelectKeywords ]
                       [ "STREAM" ]
                       [ "ALL" | "DISTINCT" ]
                       AddSelectItem { "," AddSelectItem }
                       ( "FROM" FromClause
                         [ Where ]
                         [ GroupBy ]
                         [ Having ]
                         [ Window ]
                         [ Qualify ]
                       | /* empty */
                       )

SelectExpression    ::= "*" | Expression
GroupingElementList ::= AddGroupingElement { "," AddGroupingElement }

WindowSpecification ::= "(" [ SimpleIdentifier ] 
                           [ "PARTITION" "BY" ExpressionCommaList ] 
                           [ OrderBy ] 
                           [ ( "ROWS" | "RANGE" )
                             ( "BETWEEN" WindowRange "AND" WindowRange | WindowRange )
                             WindowExclusion
                           ] 
                           [ ( "ALLOW" | "DISALLOW" ) "PARTIAL" ] 
                       ")"
WindowRange         ::= "CURRENT" "ROW" 
                     | "UNBOUNDED" ( "PRECEDING" | "FOLLOWING" ) 
                     | Expression ( "PRECEDING" | "FOLLOWING" )
WindowExclusion     ::= "EXCLUDE" ( "CURRENT" "ROW" | "NO" "OTHERS" | "GROUP" | "TIES" )
                     | /* empty (default: NO OTHERS) */

OrderBy             ::= "ORDER" "BY" OrderItemList
OrderItemList       ::= AddOrderItem { "," AddOrderItem }

LimitClause         ::= "LIMIT" (
                         UnsignedNumericLiteralOrParam "," ( UnsignedNumericLiteralOrParam | "ALL" )
                       | UnsignedNumericLiteralOrParam
                       | "ALL"
                       )
OffsetClause        ::= "OFFSET" UnsignedNumericLiteralOrParam [ "ROW" | "ROWS" ]
FetchClause         ::= "FETCH" ( "FIRST" | "NEXT" ) UnsignedNumericLiteralOrParam ( "ROW" | "ROWS" ) "ONLY"

```

#### 3. FROM句とテーブル参照 (Table References & Joins)

```ebnf
FromClause       ::= TableRef { JoinOrCommaTable }
JoinOrCommaTable ::= "," TableRef
                     | JoinTable
                     | "CROSS" "APPLY" TableRef
                     | "OUTER" "APPLY" TableRef

JoinType         ::= "JOIN" | "INNER" "JOIN" 
                     | "LEFT" [ "OUTER" | "ASOF" ] "JOIN" 
                     | "RIGHT" [ "OUTER" ] "JOIN" 
                     | "FULL" [ "OUTER" ] "JOIN" 
                     | "CROSS" "JOIN" 
                     | "ASOF" "JOIN"

JoinTable        ::= [ "NATURAL" ] JoinType TableRef
                       ( [ "MATCH_CONDITION" Expression ] "ON" Expression  /* ASOF JOINのみ */
                       | "USING" ParenthesizedSimpleIdentifierList
                       | /* empty */
                       )

TableRef         ::= TableRef3
TableRef1        ::= TableRef3
TableRef2        ::= TableRef3
TableRef3        ::= CompoundTableIdentifier
                       ( ImplicitTableFunctionCallArgs
                       | [ TableHints ] [ ExtendTable ] [ TableOverOpt ]
                         [ Snapshot ] [ MatchRecognize ]
                       )
                     | [ "LATERAL" ] "(" OrderedQueryOrExpr ")"
                       [ TableOverOpt ] [ MatchRecognize ]
                     | [ "LATERAL" ] "UNNEST" "(" ExpressionCommaList ")"
                       [ "WITH" "ORDINALITY" ]
                     | [ "LATERAL" ] TableFunctionCall
                     | ExtendedTableRef
                     [ Pivot ] [ Unpivot ]
                     [ [ "AS" ] SimpleIdentifier [ ParenthesizedSimpleIdentifierList ] ]
                     [ Tablesample ]

Snapshot         ::= "FOR" "SYSTEM_TIME" "AS" "OF" Expression
ExtendTable      ::= [ "EXTEND" ] ExtendList
ExtendList       ::= "(" AddColumnType { "," AddColumnType } ")"

Tablesample      ::= "TABLESAMPLE"
                       ( "SUBSTITUTE" "(" StringLiteral ")"
                       | ( "BERNOULLI" | "SYSTEM" ) "(" UnsignedNumericLiteral ")"
                         [ "REPEATABLE" "(" IntLiteral ")" ]
                       )

Pivot            ::= "PIVOT" "(" AddPivotAgg { "," AddPivotAgg } "FOR"
                       SimpleIdentifierOrList "IN"
                       "(" AddPivotValue { "," AddPivotValue } ")" ")"
Unpivot          ::= "UNPIVOT" [ ( "INCLUDE" | "EXCLUDE" ) "NULLS" ]
                       "(" SimpleIdentifierOrList "FOR" SimpleIdentifierOrList "IN"
                       "(" AddUnpivotValue { "," AddUnpivotValue } ")" ")"

MatchRecognize   ::= "MATCH_RECOGNIZE" "("
                       [ "PARTITION" "BY" ExpressionCommaList ]
                       [ OrderBy ]
                       [ "MEASURES" AddMeasureColumn { "," AddMeasureColumn } ]
                       [ ( "ONE" "ROW" | "ALL" "ROWS" ) "PER" "MATCH" ]
                       [ "AFTER" "MATCH" "SKIP"
                         ( "PAST" "LAST" "ROW"
                         | "TO" "NEXT" "ROW"
                         | "TO" "FIRST" SimpleIdentifier
                         | "TO" [ "LAST" ] SimpleIdentifier
                         )
                       ]
                       "PATTERN" "(" [ "^" ] PatternExpression [ "$" ] ")"
                       [ "WITHIN" IntervalLiteral ]
                       [ "SUBSET" AddSubsetDefinition { "," AddSubsetDefinition } ]
                       "DEFINE" PatternDefinition { "," PatternDefinition }
                       ")"

```

#### 4. 式の階層構造 (Expression Hierarchy)

```ebnf
Expression             ::= Expression2
Expression2            ::= AddExpression2b
                       {
                         ( [ "NOT" ] "IN"
                         | comp ( "SOME" | "ANY" | "ALL" )
                         ) "(" ( OrderedQueryOrExpr | ExpressionCommaList ) ")"
                       | [ "NOT" ] "BETWEEN" [ "SYMMETRIC" | "ASYMMETRIC" ]
                         Expression2 "AND" Expression2
                       | [ "NOT" ] ( "LIKE" | "ILIKE" | "RLIKE" | "SIMILAR" "TO" )
                         Expression2 [ "ESCAPE" Expression3 ]
                       | BinaryRowOperator AddExpression2b
                       | "[" ( "OFFSET" | "ORDINAL" | "SAFE_OFFSET" | "SAFE_ORDINAL" )
                           "(" Expression ")"
                         | Expression
                         "]" { "." SimpleIdentifier }
                       | PostfixRowOperator
                       }
RowExpressionExtension ::= SimpleIdentifier
                        | SimpleIdentifier "(" [ "*" | /* empty */ | FunctionParameterList ] ")"

/* 演算子詳細 */
BinaryRowOperator      ::= "=" | "<<" | ">" | "<" | "<=" | ">=" | "<>" | "!="
                     | "+" | "-" | "*" | "/" | "%" | "||"
                     | "AND" | "OR"
                     | "IS" "DISTINCT" "FROM" | "IS" "NOT" "DISTINCT" "FROM"
                     | "MEMBER" "OF"
                     | "SUBMULTISET" "OF" | "NOT" "SUBMULTISET" "OF"
                     | "CONTAINS" | "OVERLAPS"
                     | "^" | "&" | "EQUALS"
                     | "PRECEDES" | "SUCCEEDS"
                     | "IMMEDIATELY" "PRECEDES" | "IMMEDIATELY" "SUCCEEDS"
                     | BinaryMultisetOperator
BinaryMultisetOperator ::= "UNION" [ "ALL" | "DISTINCT" ]
                        | "INTERSECT" [ "ALL" | "DISTINCT" ]
                        | "EXCEPT" [ "ALL" | "DISTINCT" ]

PrefixRowOperator      ::= "+" | "-" | "NOT" | "EXISTS" | "UNIQUE"
PostfixRowOperator     ::= "IS" [ "NOT" ]
                         ( "NULL" | "TRUE" | "FALSE" | "UNKNOWN"
                         | "A" "SET" | "EMPTY"
                         | "JSON" [ "VALUE" | "OBJECT" | "ARRAY" | "SCALAR" ]
                         )
                     | "FORMAT" JsonRepresentation

Expression3            ::= AtomicRowExpression
                     | CursorExpression
                     | "ROW" "(" OrderedQueryOrExpr | ExpressionCommaList ")"   /* explicit ROW */
                     | [ "ROW" ] "(" OrderedQueryOrExpr | ExpressionCommaList ")" [ IntervalQualifier ] /* row/paren form */
                     | LambdaExpression

AtomicRowExpression    ::= LiteralOrIntervalExpression | DynamicParam | BuiltinFunctionCall | JdbcFunctionCall 
                     | MultisetConstructor | ArrayConstructor | MapConstructor | PeriodConstructor
                     | NamedFunctionCall | ContextVariable | CompoundIdentifier | "*"
                     | NewSpecification | CaseExpression | SequenceExpression

```

#### 5. 関数、コンストラクタ、特殊構文 (Special Functions & Constructors)

```ebnf
BuiltinFunctionCall           ::= ( "CAST" | "SAFE_CAST" | "TRY_CAST" )
                        "(" Expression "AS"
                          ( DataType | "INTERVAL" IntervalQualifier )
                          [ "FORMAT" StringLiteral ]
                        ")"
                      | "EXTRACT" "(" TimeUnitOrName "FROM" Expression ")"
                      | "POSITION" "(" AtomicRowExpression "IN" Expression [ "FROM" Expression ] ")"
                      | "CONVERT" "("
                          ( Expression "USING" SimpleIdentifier
                          | Expression "," SimpleIdentifier [ "," SimpleIdentifier ]
                          | ( DataType | "INTERVAL" IntervalQualifier )
                            "," Expression [ "," ( UnsignedNumericLiteral | "NULL" ) ]
                          )
                        ")"
                      | "TRANSLATE" "(" Expression ( "USING" SimpleIdentifier | { "," Expression } ) ")"
                      | "OVERLAY" "(" Expression "PLACING" Expression "FROM" Expression [ "FOR" Expression ] ")"
                      | ( "FLOOR" | "CEIL" | "CEILING" )
                        "(" Expression [ "TO" TimeUnitOrName ] ")"
                      | "SUBSTRING" "(" Expression ( "FROM" | "," ) Expression [ ( "FOR" | "," ) Expression ] ")"
                      | "TRIM" "("
                          ( ( "BOTH" | "TRAILING" | "LEADING" ) [ Expression ] "FROM" Expression
                          | Expression [ "FROM" Expression ]
                          )
                        ")"
                      | ContainsSubstrFunctionCall
                      | DateTimeConstructorCall
                      | DateDiffFunctionCall | DateTruncFunctionCall | DatetimeTruncFunctionCall
                      | TimestampAddFunctionCall | TimestampDiffFunctionCall | TimestampDiff3FunctionCall | TimestampTruncFunctionCall
                      | DatetimeDiffFunctionCall | TimeDiffFunctionCall | TimeTruncFunctionCall
                      | MatchRecognizeFunctionCall
                      | JsonExistsFunctionCall | JsonValueFunctionCall | JsonQueryFunctionCall
                      | JsonObjectFunctionCall | JsonObjectAggFunctionCall
                      | JsonArrayFunctionCall | JsonArrayAggFunctionCall
                      | GroupByWindowingCall | ...

JsonApiCommonSyntax           ::= Expression "," Expression
                        [ "PASSING" Expression "AS" SimpleIdentifier
                          { "," Expression "AS" SimpleIdentifier }
                        ]
JsonReturningClause           ::= "RETURNING" DataType
JsonExistsFunctionCall        ::= "JSON_EXISTS" "(" JsonApiCommonSyntax [ JsonExistsErrorBehavior "ON" "ERROR" ] ")"
JsonExistsErrorBehavior       ::= "TRUE" | "FALSE" | "UNKNOWN" | "ERROR"

JsonValueFunctionCall         ::= "JSON_VALUE" "(" JsonApiCommonSyntax
                           [ JsonReturningClause ]
                           { JsonValueEmptyOrErrorBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
JsonValueEmptyOrErrorBehavior ::= "ERROR" | "NULL" | ( "DEFAULT" Expression )

JsonQueryFunctionCall         ::= "JSON_QUERY" "(" JsonApiCommonSyntax
                           [ JsonReturningClause ]
                           [ JsonQueryWrapperBehavior "WRAPPER" ]
                           { JsonQueryEmptyOrErrorBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
JsonQueryWrapperBehavior      ::= "WITHOUT" [ "ARRAY" ]
                           | "WITH" "CONDITIONAL" [ "ARRAY" ]
                           | "WITH" [ "UNCONDITIONAL" ] [ "ARRAY" ]
JsonQueryEmptyOrErrorBehavior ::= "ERROR" | "NULL" | "EMPTY" "ARRAY" | "EMPTY" "OBJECT"

JsonObjectFunctionCall        ::= "JSON_OBJECT" "(" [ JsonNameAndValue { "," JsonNameAndValue } ] [ JsonConstructorNullClause ] ")"
JsonObjectAggFunctionCall     ::= "JSON_OBJECTAGG" "(" JsonNameAndValue [ JsonConstructorNullClause ] ")"
JsonArrayFunctionCall         ::= "JSON_ARRAY" "(" [ Expression { "," Expression } ] [ JsonConstructorNullClause ] ")"
JsonArrayAggFunctionCall      ::= "JSON_ARRAYAGG"
                             "(" Expression [ OrderBy ] [ JsonConstructorNullClause ] ")"
                             [ withinGroup ]

CaseExpression                ::= "CASE" [ Expression ] { "WHEN" ExpressionCommaList "THEN" Expression } [ "ELSE" Expression ] "END"
MultisetConstructor           ::= "MULTISET" ( "(" LeafQueryOrExpr ")" | "[" ExpressionCommaList "]" )
ArrayConstructor              ::= "ARRAY" ( "(" ")" | "(" ( OrderedQueryOrExpr | ExpressionCommaList ) ")" | "[" [ ExpressionCommaList ] "]" )
MapConstructor                ::= "MAP" ( "(" ")" | "(" ( OrderedQueryOrExpr | ExpressionCommaList ) ")" | "[" [ ExpressionCommaList ] "]" )

```

#### 6. データ型とリテラル (Types & Literals)

```ebnf
DataType                    ::= TypeName { ( "MULTISET" | "ARRAY" ) }
TypeName                    ::= SqlTypeName | RowTypeName | MapTypeName | CompoundIdentifier
SqlTypeName                 ::= SqlTypeName1 | SqlTypeName2 | SqlTypeName3 | CharacterTypeName | DateTimeTypeName
SqlTypeName1                ::= "GEOMETRY" | "BOOLEAN"
                     | ( "INTEGER" | "INT" ) [ "UNSIGNED" ] | "UNSIGNED"
                     | "TINYINT" [ "UNSIGNED" ] | "SMALLINT" [ "UNSIGNED" ] | "BIGINT" [ "UNSIGNED" ]
                     | "REAL" | "DOUBLE" [ "PRECISION" ] | "FLOAT"
                     | "VARIANT" | "UUID"
SqlTypeName2                ::= ( "BINARY" [ "VARYING" ] | "VARBINARY" ) [ Precision ]
SqlTypeName3                ::= ( "DECIMAL" | "DEC" | "NUMERIC" | "ANY" ) [ "(" UnsignedIntLiteral [ "," IntLiteral ] ")" ]
CharacterTypeName           ::= ( ( "CHARACTER" | "CHAR" ) [ "VARYING" ] | "VARCHAR" )
                       [ Precision ] [ "CHARACTER" "SET" Identifier ]
DateTimeTypeName            ::= "DATE"
                     | "TIME" [ Precision ] [ TimeZoneOpt ]
                     | "TIMESTAMP" [ Precision ] [ TimeZoneOpt ]
TimeZoneOpt                 ::= "WITH" [ "LOCAL" ] "TIME" "ZONE"
                     | "WITHOUT" "TIME" "ZONE"
                     | /* empty */

RowTypeName                 ::= "ROW" "("
                       SimpleIdentifier DataType [ "NULL" | "NOT" "NULL" ]
                       { "," SimpleIdentifier DataType [ "NULL" | "NOT" "NULL" ] }
                       ")"
MapTypeName                 ::= "MAP" "<" DataType "," DataType ">"

Literal                     ::= NonIntervalLiteral | IntervalLiteral
LiteralOrIntervalExpression ::= IntervalLiteralOrExpression | NonIntervalLiteral
IntervalLiteralOrExpression ::= "INTERVAL" [ "+" | "-" ]
                               ( SimpleStringLiteral IntervalQualifier
                               | ( "(" Expression ")" | UnsignedNumericLiteral | CompoundIdentifier )
                                 IntervalQualifierStart
                               )
NonIntervalLiteral          ::= NumericLiteral | StringLiteral | SpecialLiteral | DateTimeLiteral
NumericLiteral              ::= [ "+" | "-" ] UnsignedNumericLiteral
UnsignedNumericLiteral      ::= UNSIGNED_INTEGER_LITERAL
                        | DECIMAL_NUMERIC_LITERAL
                        | "DECIMAL" SimpleStringLiteral
                        | APPROX_NUMERIC_LITERAL
SpecialLiteral              ::= "TRUE" | "FALSE" | "UNKNOWN" | "NULL"
DateTimeLiteral             ::= "{d" StringLiteral "}" | "{t" StringLiteral "}" | "{ts" StringLiteral "}"
                     | "DATE" SimpleStringLiteral
                     | "DATETIME" SimpleStringLiteral
                     | "TIME" SimpleStringLiteral
                     | "UUID" SimpleStringLiteral
                     | "TIMESTAMP" SimpleStringLiteral
                     | "TIME" "WITH" [ "LOCAL" ] "TIME" "ZONE" SimpleStringLiteral
                     | "TIMESTAMP" "WITH" [ "LOCAL" ] "TIME" "ZONE" SimpleStringLiteral
IntervalLiteral             ::= "INTERVAL" [ "+" | "-" ] SimpleStringLiteral IntervalQualifier
IntervalQualifier           ::= ( "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE" )
                       [ "(" UnsignedIntLiteral ")" ]
                       [ "TO" ( "MONTH" | "HOUR" | "MINUTE" | "SECOND" ) ]
                     | "SECOND" [ "(" UnsignedIntLiteral [ "," UnsignedIntLiteral ] ")" ]
IntervalQualifierStart      ::= ( "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE" )
                           [ "(" UnsignedIntLiteral ")" ]
                         | "SECOND" [ "(" UnsignedIntLiteral [ "," UnsignedIntLiteral ] ")" ]
```

#### 7. 補助規則 (Helper Productions)

```ebnf
AddSetOpQuery                            ::= BinaryQueryOperator LeafQueryOrExpr
BinaryQueryOperator                      ::= ( "UNION" | "INTERSECT" | "EXCEPT" ) [ "ALL" | "DISTINCT" ]
AddSetOpQueryOrExpr                      ::= BinaryQueryOperator LeafQueryOrExpr

Query                                    ::= [ WithList ] LeafQuery { AddSetOpQuery }
SqlQueryEof                              ::= OrderedQueryOrExpr <EOF>
ExprOrJoinOrOrderedQuery                 ::= Query OrderByLimitOpt
                           | TableRef1 { JoinTable } { AddSetOpQuery }

ParenthesizedExpression                  ::= "(" ( OrderedQueryOrExpr | Expression ) ")"
ParenthesizedQueryOrCommaList            ::= "(" ( OrderedQueryOrExpr | ExpressionCommaList ) ")"
ParenthesizedQueryOrCommaListWithDefault ::= "(" [ ( Expression | "DEFAULT" )
                                                 { "," ( Expression | "DEFAULT" ) } ] ")"
ExpressionCommaList                      ::= Expression { "," Expression }

SimpleIdentifier                         ::= Identifier
SimpleIdentifierOrListOrEmpty            ::= SimpleIdentifier | ParenthesizedSimpleIdentifierList | "(" ")"
ParenthesizedSimpleIdentifierList        ::= "(" SimpleIdentifier { "," SimpleIdentifier } ")"
CompoundIdentifier                       ::= Identifier { "." Identifier } [ "." "*" ]
CompoundTableIdentifier                  ::= Identifier { "." Identifier }
Identifier                               ::= IDENTIFIER | HYPHENATED_IDENTIFIER | QUOTED_IDENTIFIER
                      | BACK_QUOTED_IDENTIFIER | BIG_QUERY_BACK_QUOTED_IDENTIFIER
                      | BRACKET_QUOTED_IDENTIFIER
SimpleIdentifierFromStringLiteral        ::= StringLiteral
ParenthesizedCompoundIdentifierList      ::= "(" AddCompoundIdentifierType { "," AddCompoundIdentifierType } ")"
NotNullOpt                               ::= "NOT" "NULL" | /* empty (nullable) */

TableHints                               ::= "/*+" AddHint { "," AddHint } "*/"
SqlSelectKeywords                        ::= /* empty (dialect-specific) */
ParenthesizedLiteralOptionCommaList      ::= "(" [ Literal { "," Literal } ] ")"
ParenthesizedKeyValueOptionCommaList     ::= "(" ( SimpleIdentifier | StringLiteral ) "=" StringLiteral
                                         { "," ( SimpleIdentifier | StringLiteral ) "=" StringLiteral } ")"

Where                                    ::= "WHERE" Expression
GroupBy                                  ::= "GROUP" "BY" [ "DISTINCT" | "ALL" ] GroupingElementList
Having                                   ::= "HAVING" Expression
Window                                   ::= "WINDOW" AddWindowSpec { "," AddWindowSpec }
Qualify                                  ::= "QUALIFY" Expression

TableOverOpt                             ::= /* empty (extension point) */
Over                                     ::= TableOverOpt
ExtendedTableRef                         ::= /* empty (parser extension point) */

TableFunctionCall                        ::= "TABLE" "(" [ "SPECIFIC" ] NamedRoutineCall ")"
ImplicitTableFunctionCallArgs            ::= CompoundIdentifier "(" [ AddArg0 { "," AddArg } ] ")"
NamedRoutineCall                         ::= CompoundIdentifier "(" [ AddArg0 { "," AddArg } ] ")"
FunctionParameterList                    ::= "(" [ AllOrDistinct ] AddArg0 { "," AddArg } ")"
AllOrDistinct                            ::= "ALL" | "DISTINCT"
UnquantifiedFunctionParameterList        ::= FunctionParameterList

AddArg0                                  ::= [ SimpleIdentifier ":=" ]
                       ( Default | LambdaExpression | TableParam | PartitionedQueryOrQueryOrExpr )
AddArg                                   ::= [ SimpleIdentifier ":=" ]
                       ( Default | LambdaExpression | TableParam | Expression )
AddExpression                            ::= Expression
AddExpression2b                          ::= { PrefixRowOperator } Expression3 { "." RowExpressionExtension }
AddExpressions                           ::= ExpressionCommaList
AddGroupingElement                       ::= "GROUPING" "SETS" "(" GroupingElementList ")"
                     | "ROLLUP" "(" ExpressionCommaList ")"
                     | "CUBE" "(" ExpressionCommaList ")"
                     | "(" ")"
                     | Expression
AddWindowSpec                            ::= SimpleIdentifier "AS" WindowSpecification
AddWithItem                              ::= SimpleIdentifier [ ParenthesizedSimpleIdentifierList ] "AS" ParenthesizedExpression
AddSelectItem                            ::= SelectExpression
                       [ [ "AS" [ "MEASURE" ] ]
                         ( SimpleIdentifier | SimpleIdentifierFromStringLiteral )
                       ]
AddRowConstructor                        ::= RowConstructor
AddSimpleIdentifiers                     ::= SimpleIdentifier { "," SimpleIdentifier }
AddIdentifierSegment                     ::= Identifier
AddTableIdentifierSegment                ::= Identifier
AddOrderItem                             ::= Expression [ "AS" ( SimpleIdentifier | SimpleIdentifierFromStringLiteral ) ]
                       [ "ASC" | "DESC" ] [ "NULLS" ( "FIRST" | "LAST" ) ]
AddMeasureColumn                         ::= Expression "AS" SimpleIdentifier
AddSubsetDefinition                      ::= SimpleIdentifier "=" "(" ExpressionCommaList ")"
AddPivotAgg                              ::= NamedFunctionCall [ [ "AS" ] SimpleIdentifier ]
AddPivotValue                            ::= RowConstructor [ [ "AS" ] SimpleIdentifier ]
AddUnpivotValue                          ::= SimpleIdentifierOrList [ "AS" RowConstructor ]
AddKeyValueOption                        ::= ( SimpleIdentifier | StringLiteral ) "=" StringLiteral
AddOptionValue                           ::= NumericLiteral | StringLiteral
AddColumnType                            ::= CompoundIdentifier DataType [ NotNullOpt ]
AddCompoundIdentifierType                ::= CompoundIdentifier [ DataType [ NotNullOpt ] ]
AddCompoundIdentifierTypes               ::= AddCompoundIdentifierType { "," AddCompoundIdentifierType }
AddHint                                  ::= SimpleIdentifier [ "(" [ Literal { "," Literal } ] ")" ]
Default                                  ::= "DEFAULT"
TableParam                               ::= ExplicitTable
                       [ "PARTITION" "BY" SimpleIdentifierOrList ]
                       [ OrderByOfSetSemanticsTable ]
PartitionedQueryOrQueryOrExpr            ::= OrderedQueryOrExpr
                                 [ "PARTITION" "BY" SimpleIdentifierOrList ]
                                 [ OrderByOfSetSemanticsTable ]
PartitionedByAndOrderBy                  ::= [ "PARTITION" "BY" SimpleIdentifierOrList ]
                            [ OrderByOfSetSemanticsTable ]
OrderByOfSetSemanticsTable               ::= "ORDER" "BY"
                               ( "(" AddOrderItem { "," AddOrderItem } ")"
                               | AddOrderItem
                               )
// NOTE: OrderByOfSetSemanticsTable is a restricted ORDER BY used for set-semantics tables;
// it allows a parenthesized list or a single OrderItem, unlike the general OrderBy rule.
NamedFunctionCall                        ::= ( StringAggFunctionCall | PercentileFunctionCall | NamedCall )
                       [ nullTreatment ] [ withinDistinct ] [ withinGroup ]
                       [ "FILTER" "(" "WHERE" Expression ")" ]
                       [ "OVER" ( SimpleIdentifier | WindowSpecification ) ]
NamedCall                                ::= [ "SPECIFIC" ] FunctionName
                       ( "(" "*" ")" | "(" ")" | FunctionParameterList )
FunctionName                             ::= CompoundIdentifier | ReservedFunctionName
ReservedFunctionName                     ::= NonReservedJdbcFunctionName | /* reserved keywords usable as function names */
NonReservedJdbcFunctionName              ::= "SUBSTRING"
NonReservedKeyWord                       ::= /* non-reserved keyword set (lexer-defined) */
NonReservedKeyWord0of3                   ::= NonReservedKeyWord
NonReservedKeyWord1of3                   ::= NonReservedKeyWord
NonReservedKeyWord2of3                   ::= NonReservedKeyWord

StringAggFunctionCall                    ::= ( "ARRAY_AGG" | "ARRAY_CONCAT_AGG" | "GROUP_CONCAT" | "STRING_AGG" )
                          "(" [ AllOrDistinct ] Expression { "," Expression }
                          [ NullTreatment ] [ OrderBy ] [ "SEPARATOR" StringLiteral ] ")"

PercentileFunctionCall                   ::= ( "PERCENTILE_CONT" | "PERCENTILE_DISC" )
                          "(" Expression
                          [ "," NumericLiteral [ NullTreatment ] ] ")"

GroupByWindowingCall                     ::= ( "TUMBLE" | "HOP" | "SESSION" ) FunctionParameterList

MatchRecognizeFunctionCall               ::= "CLASSIFIER" "(" ")" | "MATCH_NUMBER" "(" ")"
                             | MatchRecognizeNavigationLogical
                             | MatchRecognizeNavigationPhysical
                             | MatchRecognizeCallWithModifier
MatchRecognizeCallWithModifier           ::= ( "RUNNING" | "FINAL" ) NamedFunctionCall
MatchRecognizeNavigationLogical          ::= [ "RUNNING" | "FINAL" ] ( "FIRST" | "LAST" )
                                   "(" Expression [ "," NumericLiteral ] ")"
MatchRecognizeNavigationPhysical         ::= ( "PREV" | "NEXT" )
                                     "(" Expression [ "," NumericLiteral ] ")"

withinDistinct                           ::= "WITHIN" "DISTINCT" "(" ExpressionCommaList ")"
withinGroup                              ::= "WITHIN" "GROUP" "(" OrderBy ")"
NullTreatment                            ::= ( "IGNORE" | "RESPECT" ) "NULLS"
nullTreatment                            ::= NullTreatment
JdbcFunctionCall                         ::= "{fn" CompoundIdentifier "(" [ Expression { "," Expression } ] ")" "}"

DynamicParam                             ::= "?" | ":" UnsignedIntLiteral
CursorExpression                         ::= "CURSOR" "(" OrderedQueryOrExpr ")"
ContextVariable                          ::= "CURRENT_USER" | "CURRENT_DATE" | "CURRENT_TIME"
                     | "CURRENT_TIMESTAMP" | "LOCALTIME" | "LOCALTIMESTAMP"
NewSpecification                         ::= "NEW" SimpleIdentifier
SequenceExpression                       ::= ( "NEXT" | "CURRENT" ) "VALUE" "FOR" CompoundIdentifier

SimpleIdentifierOrList                   ::= SimpleIdentifier | ParenthesizedSimpleIdentifierList
PatternExpression                        ::= PatternTerm { "|" PatternTerm }
PatternTerm                              ::= PatternFactor { PatternFactor }
PatternFactor                            ::= PatternPrimary
                       [ "*" | "+" | "?"
                       | "{" UnsignedNumericLiteral [ "," [ UnsignedNumericLiteral ] ] "}"
                       | "{" "," UnsignedNumericLiteral "}"
                       | "{" "-" PatternExpression "-" "}"
                       ] [ "?" ]
PatternPrimary                           ::= SimpleIdentifier
                    | "(" PatternExpression ")"
                    | "{" "-" PatternExpression "-" "}"
                    | "PERMUTE" "(" PatternExpression { "," PatternExpression } ")"
PatternDefinition                        ::= SimpleIdentifier "AS" Expression

StringLiteral                            ::= BINARY_STRING_LITERAL { QUOTED_STRING }
                    | ( PREFIXED_STRING_LITERAL | QUOTED_STRING | UNICODE_STRING_LITERAL )
                      { QUOTED_STRING } [ "UESCAPE" QUOTED_STRING ]
                    | C_STYLE_ESCAPED_STRING_LITERAL
                    | BIG_QUERY_DOUBLE_QUOTED_STRING
                    | BIG_QUERY_QUOTED_STRING
SimpleStringLiteral                      ::= QUOTED_STRING | BIG_QUERY_QUOTED_STRING | BIG_QUERY_DOUBLE_QUOTED_STRING

UnsignedIntLiteral                       ::= UNSIGNED_INTEGER_LITERAL
IntLiteral                               ::= [ "+" | "-" ] UNSIGNED_INTEGER_LITERAL
UnsignedNumericLiteralOrParam            ::= UnsignedNumericLiteral | DynamicParam

TimeUnitOrName                           ::= TimeUnit | SimpleIdentifier
TimeUnit                                 ::= "NANOSECOND" | "MICROSECOND" | "MILLISECOND" | "SECOND"
                     | "MINUTE" | "HOUR" | "DAY"
                     | "DAYOFWEEK" | "DAYOFYEAR" | "DOW" | "DOY"
                     | "ISODOW" | "ISOYEAR"
                     | "WEEK" [ "(" weekdayName ")" ]
                     | "MONTH" | "QUARTER" | "YEAR"
                     | "EPOCH" | "DECADE" | "CENTURY" | "MILLENNIUM"
weekdayName                              ::= "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY"
                     | "THURSDAY" | "FRIDAY" | "SATURDAY"
Year                                     ::= "YEAR" | "YEARS"
Quarter                                  ::= "QUARTER" | "QUARTERS"
Month                                    ::= "MONTH" | "MONTHS"
Week                                     ::= "WEEK" | "WEEKS"
Day                                      ::= "DAY" | "DAYS"
Hour                                     ::= "HOUR" | "HOURS"
Minute                                   ::= "MINUTE" | "MINUTES"
Second                                   ::= "SECOND" | "SECONDS"
IntervalWithoutQualifier                 ::= "INTERVAL" /* default SECOND */

JsonRepresentation                       ::= "JSON" [ "ENCODING" ( "UTF8" | "UTF16" | "UTF32" ) ]
JsonInputClause                          ::= "FORMAT" JsonRepresentation
JsonPathSpec                             ::= StringLiteral
JsonName                                 ::= Expression
JsonNameAndValue                         ::= [ "KEY" ] JsonName ( "VALUE" | "," | ":" ) Expression
JsonConstructorNullClause                ::= "NULL" "ON" "NULL" | "ABSENT" "ON" "NULL"
JsonOutputClause                         ::= JsonReturningClause [ "FORMAT" JsonRepresentation ]

LambdaExpression                         ::= SimpleIdentifierOrListOrEmpty "->" Expression

PeriodConstructor                        ::= "PERIOD" "(" Expression "," Expression ")"
ArrayLiteral                             ::= "{" ( Literal { "," Literal }
                           | ArrayLiteral { "," ArrayLiteral }
                           | /* empty */
                           ) "}"

PrecisionOpt                             ::= "(" UnsignedIntLiteral ")" | /* empty */
NullableOptDefaultTrue                   ::= "NULL" | "NOT" "NULL" | /* empty (default true) */
NullableOptDefaultFalse                  ::= "NULL" | "NOT" "NULL" | /* empty (default false) */

JsonArrayAggOrderByClause                ::= OrderBy

ContainsSubstrFunctionCall               ::= "CONTAINS_SUBSTR" "(" Expression "," Expression
                               [ "," "JSON_SCOPE" ":=" Expression ] ")"

DateDiffFunctionCall                     ::= "DATE_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
TimestampAddFunctionCall                 ::= "TIMESTAMPADD" "(" TimeUnitOrName "," Expression "," Expression ")"
TimestampDiffFunctionCall                ::= "TIMESTAMPDIFF" "(" TimeUnitOrName "," Expression "," Expression ")"
TimestampDiff3FunctionCall               ::= "TIMESTAMP_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
DatetimeDiffFunctionCall                 ::= "DATETIME_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
DateTruncFunctionCall                    ::= "DATE_TRUNC" "(" Expression "," TimeUnitOrName ")"
DatetimeTruncFunctionCall                ::= "DATETIME_TRUNC" "(" Expression "," TimeUnitOrName ")"
TimestampTruncFunctionCall               ::= "TIMESTAMP_TRUNC" "(" Expression "," TimeUnitOrName ")"
TimeDiffFunctionCall                     ::= "TIME_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
TimeTruncFunctionCall                    ::= "TIME_TRUNC" "(" Expression "," TimeUnitOrName ")"

DateTimeConstructorCall                  ::= ( "DATE" | "TIME" | "DATETIME" | "TIMESTAMP" )
                              FunctionParameterList

FloorCeilOptions                         ::= StandardFloorCeilOptions
StandardFloorCeilOptions                 ::= "(" Expression [ "TO" TimeUnitOrName ] ")"
                             [ "OVER" ( SimpleIdentifier | WindowSpecification ) ]

JdbcOdbcDataTypeName                     ::= "SQL_CHAR" | "CHAR" | "SQL_VARCHAR" | "VARCHAR"
                       | "SQL_DATE" | "DATE" | "SQL_TIME" | "TIME"
                       | "SQL_TIMESTAMP" | "TIMESTAMP"
                       | "SQL_DECIMAL" | "DECIMAL" | "SQL_NUMERIC" | "NUMERIC"
                       | "SQL_BOOLEAN" | "BOOLEAN"
                       | "SQL_INTEGER" | "INTEGER" | "SQL_BINARY" | "BINARY"
                       | "SQL_VARBINARY" | "VARBINARY" | "SQL_TINYINT" | "TINYINT"
                       | "SQL_SMALLINT" | "SMALLINT" | "SQL_BIGINT" | "BIGINT"
                       | "SQL_REAL" | "REAL" | "SQL_DOUBLE" | "DOUBLE"
                       | "SQL_FLOAT" | "FLOAT"
                       | "SQL_INTERVAL_YEAR" | "SQL_INTERVAL_YEAR_TO_MONTH"
                       | "SQL_INTERVAL_MONTH" | "SQL_INTERVAL_DAY"
                       | "SQL_INTERVAL_DAY_TO_HOUR" | "SQL_INTERVAL_DAY_TO_MINUTE"
                       | "SQL_INTERVAL_DAY_TO_SECOND" | "SQL_INTERVAL_HOUR"
                       | "SQL_INTERVAL_HOUR_TO_MINUTE" | "SQL_INTERVAL_HOUR_TO_SECOND"
                       | "SQL_INTERVAL_MINUTE" | "SQL_INTERVAL_MINUTE_TO_SECOND"
                       | "SQL_INTERVAL_SECOND"
JdbcOdbcDataType                         ::= JdbcOdbcDataTypeName

CollectionsTypeName                      ::= DataType ( "MULTISET" | "ARRAY" )
CollateClause                            ::= "COLLATE" SimpleIdentifier
UnusedExtension                          ::= /* empty (extension point) */

MeasureColumnCommaList                   ::= AddMeasureColumn { "," AddMeasureColumn }
SubsetDefinitionCommaList                ::= AddSubsetDefinition { "," AddSubsetDefinition }
PatternDefinitionCommaList               ::= PatternDefinition { "," PatternDefinition }

Natural                                  ::= "NATURAL" | /* empty */
Scope                                    ::= "SYSTEM" | "SESSION"
comp                                     ::= "<" | "<=" | ">" | ">=" | "=" | "<>" | "!="
periodOperator                           ::= /* TODO: period operator (overlaps) */

```
