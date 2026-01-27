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
                     | /* empty (default: PHYSICAL) */
SqlQueryOrDml      ::= OrderedQueryOrExpr | SqlInsert | SqlDelete | SqlUpdate | SqlMerge

SqlDescribe        ::= "DESCRIBE" ( ( "DATABASE" | "CATALOG" | "SCHEMA" ) CompoundIdentifier
                                  | [ "TABLE" ] CompoundIdentifier [ SimpleIdentifier ]
                                  | [ "STATEMENT" ] SqlQueryOrDml )

SqlProcedureCall   ::= "CALL" NamedRoutineCall

```

#### 1b. DML (INSERT/UPDATE/DELETE/MERGE)

```ebnf
SqlInsert          ::= ( "INSERT" | "UPSERT" ) SqlInsertKeywords
                       "INTO" CompoundTableIdentifier [ TableHints ] [ ExtendTable ]
                       [ ParenthesizedCompoundIdentifierList ]
                       OrderedQueryOrExpr

SqlInsertKeywords  ::= /* empty (dialect-specific) */

SqlDelete          ::= "DELETE" "FROM" CompoundTableIdentifier [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       [ Where ]

SqlUpdate          ::= "UPDATE" CompoundTableIdentifier [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       "SET" CompoundIdentifier "=" Expression
                       { "," CompoundIdentifier "=" Expression }
                       [ Where ]

SqlMerge           ::= "MERGE" "INTO" CompoundTableIdentifier [ TableHints ] [ ExtendTable ]
                       [ [ "AS" ] SimpleIdentifier ]
                       "USING" TableRef
                       "ON" Expression
                       ( WhenMatchedClause [ WhenNotMatchedClause ]
                       | WhenNotMatchedClause
                       )

WhenMatchedClause  ::= "WHEN" "MATCHED" "THEN"
                       "UPDATE" "SET" CompoundIdentifier "=" Expression
                       { "," CompoundIdentifier "=" Expression }

WhenNotMatchedClause ::= "WHEN" "NOT" "MATCHED" "THEN" "INSERT"
                         SqlInsertKeywords
                         [ ParenthesizedSimpleIdentifierList ]
                         ( "VALUES" RowConstructor
                         | "(" "VALUES" RowConstructor ")" )

Where              ::= "WHERE" Expression
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
LeafQueryOrExpr    ::= LeafQuery | Expression
LeafQuery          ::= SqlSelect | TableConstructor | ExplicitTable
ExplicitTable      ::= "TABLE" CompoundIdentifier
TableConstructor   ::= ( "VALUES" | "VALUE" ) RowConstructor { "," RowConstructor }
RowConstructor     ::= "(" "ROW" ParenthesizedQueryOrCommaListWithDefault ")"
                     | [ "ROW" ] ParenthesizedQueryOrCommaListWithDefault
                     | Expression
WithClause         ::= "WITH" [ "RECURSIVE" ] WithItem { "," WithItem }
WithItem           ::= SimpleIdentifier [ "(" SimpleIdentifierList ")" ] "AS" ParenthesizedExpression

SqlSelect          ::= "SELECT" [ Hint ] [ SqlSelectKeywords ] [ "STREAM" ] [ "ALL" | "DISTINCT" ]
                       SelectItem { "," SelectItem }
                       ( "FROM" FromClause
                         [ "WHERE" Expression ]
                         [ "GROUP" "BY" [ "DISTINCT" | "ALL" ] GroupingElementList ]
                         [ "HAVING" Expression ]
                         [ "WINDOW" WindowDeclaration { "," WindowDeclaration } ]
                         [ "QUALIFY" Expression ]
                       | /* empty */
                       )

SelectItem         ::= ( "*" | Expression )
                       [ [ "AS" [ "MEASURE" ] ]
                         ( SimpleIdentifier | SimpleIdentifierFromStringLiteral )
                       ]
SelectExpression   ::= "*" | Expression
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
JoinCondition      ::= [ "MATCH_CONDITION" Expression ] "ON" Expression  /* ASOF JOINのみ */
                     | "USING" "(" SimpleIdentifierList ")"

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
ExtendList         ::= "(" ColumnType { "," ColumnType } ")"

TablesampleClause  ::= "TABLESAMPLE" ( "SUBSTITUTE" "(" StringLiteral ")" 
                                       | ( "BERNOULLI" | "SYSTEM" ) "(" UnsignedNumericLiteral ")" [ "REPEATABLE" "(" IntLiteral ")" ] )

PivotClause        ::= "PIVOT" "(" PivotAgg { "," PivotAgg } "FOR" SimpleIdentifierOrList "IN" "(" PivotValue { "," PivotValue } ")" ")"
UnpivotClause      ::= "UNPIVOT" [ ( "INCLUDE" | "EXCLUDE" ) "NULLS" ] "(" SimpleIdentifierOrList "FOR" SimpleIdentifierOrList "IN" "(" UnpivotValue { "," UnpivotValue } ")" ")"

MatchRecognizeClause ::= "MATCH_RECOGNIZE" "(" 
                           [ "PARTITION" "BY" ExpressionList ] 
                           [ OrderBy ] 
                           [ "MEASURES" MeasureColumn { "," MeasureColumn } ] 
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
                           [ "SUBSET" SubsetDefinition { "," SubsetDefinition } ]
                           "DEFINE" PatternDefinition { "," PatternDefinition } 
                         ")"

```

#### 4. 式の階層構造 (Expression Hierarchy)

```ebnf
Expression         ::= Expression2
Expression2        ::= Expression2b
                       {
                         InPredicate
                       | BetweenPredicate
                       | LikePredicate [ "ESCAPE" Expression3 ]
                       | BinaryRowOperator Expression2b
                       | ItemAccess
                       | PostfixRowOperator
                       }
Expression2b       ::= { PrefixRowOperator } Expression3 { "." RowExpressionExtension }
ComparisonOperator ::= "<" | "<=" | ">" | ">=" | "=" | "<>" | "!="

InPredicate        ::= ( [ "NOT" ] "IN"
                       | ComparisonOperator ( "SOME" | "ANY" | "ALL" )
                       )
                       "(" ( OrderedQueryOrExpr | ExpressionList ) ")"
BetweenPredicate   ::= [ "NOT" ] "BETWEEN" [ "SYMMETRIC" | "ASYMMETRIC" ] Expression2 "AND" Expression2
LikePredicate      ::= [ "NOT" ] ( "LIKE" | "ILIKE" | "RLIKE" | "SIMILAR" "TO" ) Expression2
ItemAccess         ::= "[" ( "OFFSET" | "ORDINAL" | "SAFE_OFFSET" | "SAFE_ORDINAL" )
                           "(" Expression ")" 
                         | Expression
                       "]" { "." SimpleIdentifier }
RowExpressionExtension ::= SimpleIdentifier
                        | SimpleIdentifier "(" [ "*" | /* empty */ | FunctionParameterList ] ")"

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
                     | BinaryMultisetOperator
BinaryMultisetOperator ::= "UNION" [ "ALL" | "DISTINCT" ]
                        | "INTERSECT" [ "ALL" | "DISTINCT" ]
                        | "EXCEPT" [ "ALL" | "DISTINCT" ]

PrefixRowOperator  ::= "+" | "-" | "NOT" | "EXISTS" | "UNIQUE"
PostfixRowOperator ::= "IS" [ "NOT" ]
                         ( "NULL" | "TRUE" | "FALSE" | "UNKNOWN"
                         | "A" "SET" | "EMPTY"
                         | "JSON" [ "VALUE" | "OBJECT" | "ARRAY" | "SCALAR" ]
                         )
                     | "FORMAT" JsonRepresentation

Expression3        ::= AtomicRowExpression
                     | CursorExpression
                     | "ROW" "(" OrderedQueryOrExpr | ExpressionList ")"   /* explicit ROW */
                     | [ "ROW" ] "(" OrderedQueryOrExpr | ExpressionList ")" [ IntervalQualifier ] /* row/paren form */
                     | LambdaExpression

AtomicRowExpression::= LiteralOrIntervalExpression | DynamicParam | BuiltinFunctionCall | JdbcFunctionCall 
                     | MultisetConstructor | ArrayConstructor | MapConstructor | PeriodConstructor
                     | NamedFunctionCall | ContextVariable | CompoundIdentifier | "*"
                     | NewSpecification | CaseExpression | SequenceExpression

```

#### 5. 関数、コンストラクタ、特殊構文 (Special Functions & Constructors)

```ebnf
BuiltinFunctionCall ::= ( "CAST" | "SAFE_CAST" | "TRY_CAST" ) "(" Expression "AS" ( DataType | "INTERVAL" IntervalQualifier ) [ "FORMAT" StringLiteral ] ")"
                      | "EXTRACT" "(" TimeUnitOrName "FROM" Expression ")"
                      | "POSITION" "(" AtomicRowExpression "IN" Expression [ "FROM" Expression ] ")"
                      | "CONVERT" "("
                          ( Expression "USING" SimpleIdentifier
                          | Expression "," SimpleIdentifier [ "," SimpleIdentifier ]
                          | ( DataType | "INTERVAL" IntervalQualifier ) "," Expression [ "," ( UnsignedNumericLiteral | "NULL" ) ]
                          )
                        ")"
                      | "TRANSLATE" "(" Expression ( "USING" SimpleIdentifier | { "," Expression } ) ")"
                      | "OVERLAY" "(" Expression "PLACING" Expression "FROM" Expression [ "FOR" Expression ] ")"
                      | ( "FLOOR" | "CEIL" | "CEILING" ) "(" Expression [ "TO" TimeUnitOrName ] ")" [ OverClause ]
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

JsonApiCommonSyntax ::= Expression "," Expression
                        [ "PASSING" Expression "AS" SimpleIdentifier { "," Expression "AS" SimpleIdentifier } ]
JsonReturningClause ::= "RETURNING" DataType
JsonExistsFunctionCall ::= "JSON_EXISTS" "(" JsonApiCommonSyntax [ JsonExistsErrorBehavior "ON" "ERROR" ] ")"
JsonExistsErrorBehavior ::= "TRUE" | "FALSE" | "UNKNOWN" | "ERROR"

JsonValueFunctionCall  ::= "JSON_VALUE" "(" JsonApiCommonSyntax
                           [ JsonReturningClause ]
                           { JsonValueEmptyOrErrorBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
JsonValueBehavior      ::= JsonValueEmptyOrErrorBehavior
JsonValueEmptyOrErrorBehavior ::= "ERROR" | "NULL" | ( "DEFAULT" Expression )

JsonQueryFunctionCall  ::= "JSON_QUERY" "(" JsonApiCommonSyntax
                           [ JsonReturningClause ]
                           [ JsonQueryWrapperBehavior "WRAPPER" ]
                           { JsonQueryEmptyOrErrorBehavior "ON" ( "EMPTY" | "ERROR" ) } ")"
JsonWrapperBehavior    ::= JsonQueryWrapperBehavior
JsonQueryWrapperBehavior ::= "WITHOUT" [ "ARRAY" ]
                           | "WITH" "CONDITIONAL" [ "ARRAY" ]
                           | "WITH" [ "UNCONDITIONAL" ] [ "ARRAY" ]
JsonQueryBehavior      ::= JsonQueryEmptyOrErrorBehavior
JsonQueryEmptyOrErrorBehavior ::= "ERROR" | "NULL" | "EMPTY" "ARRAY" | "EMPTY" "OBJECT"

JsonObjectFunctionCall ::= "JSON_OBJECT" "(" [ JsonNameAndValue { "," JsonNameAndValue } ] [ JsonConstructorNullClause ] ")"
JsonObjectAggFunctionCall ::= "JSON_OBJECTAGG" "(" JsonNameAndValue [ JsonConstructorNullClause ] ")"
JsonArrayFunctionCall  ::= "JSON_ARRAY" "(" [ Expression { "," Expression } ] [ JsonConstructorNullClause ] ")"
JsonArrayAggFunctionCall ::= "JSON_ARRAYAGG" "(" Expression [ OrderBy ] [ JsonConstructorNullClause ] ")"
                           [ WithinGroupClause ]
WithinGroupClause    ::= "WITHIN" "GROUP" "(" OrderBy ")"

CaseExpression      ::= "CASE" [ Expression ] { "WHEN" ExpressionList "THEN" Expression } [ "ELSE" Expression ] "END"
MultisetConstructor ::= "MULTISET" ( "(" LeafQueryOrExpr ")" | "[" ExpressionList "]" )
ArrayConstructor    ::= "ARRAY" ( "(" ")" | "(" ( OrderedQueryOrExpr | ExpressionList ) ")" | "[" [ ExpressionList ] "]" )
MapConstructor      ::= "MAP" ( "(" ")" | "(" ( OrderedQueryOrExpr | ExpressionList ) ")" | "[" [ ExpressionList ] "]" )

```

#### 6. データ型とリテラル (Types & Literals)

```ebnf
DataType           ::= TypeName { ( "MULTISET" | "ARRAY" ) }
TypeName           ::= SqlTypeName | RowTypeName | MapTypeName | CompoundIdentifier
SqlTypeName        ::= SqlTypeName1 | SqlTypeName2 | SqlTypeName3 | CharacterTypeName | DateTimeTypeName
SqlTypeName1       ::= "GEOMETRY" | "BOOLEAN"
                     | ( "INTEGER" | "INT" ) [ "UNSIGNED" ] | "UNSIGNED"
                     | "TINYINT" [ "UNSIGNED" ] | "SMALLINT" [ "UNSIGNED" ] | "BIGINT" [ "UNSIGNED" ]
                     | "REAL" | "DOUBLE" [ "PRECISION" ] | "FLOAT"
                     | "VARIANT" | "UUID"
SqlTypeName2       ::= ( "BINARY" [ "VARYING" ] | "VARBINARY" ) [ Precision ]
SqlTypeName3       ::= ( "DECIMAL" | "DEC" | "NUMERIC" | "ANY" ) [ "(" UnsignedIntLiteral [ "," IntLiteral ] ")" ]
CharacterTypeName  ::= ( ( "CHARACTER" | "CHAR" ) [ "VARYING" ] | "VARCHAR" )
                       [ Precision ] [ "CHARACTER" "SET" Identifier ]
DateTimeTypeName   ::= "DATE"
                     | "TIME" [ Precision ] [ TimeZoneOpt ]
                     | "TIMESTAMP" [ Precision ] [ TimeZoneOpt ]
TimeZoneOpt        ::= "WITH" [ "LOCAL" ] "TIME" "ZONE"
                     | "WITHOUT" "TIME" "ZONE"
                     | /* empty */

RowTypeName        ::= "ROW" "(" SimpleIdentifier DataType [ "NULL" | "NOT" "NULL" ]
                       { "," SimpleIdentifier DataType [ "NULL" | "NOT" "NULL" ] } ")"
MapTypeName        ::= "MAP" "<" DataType "," DataType ">"

Literal            ::= NonIntervalLiteral | IntervalLiteral
LiteralOrIntervalExpression ::= IntervalLiteralOrExpression | NonIntervalLiteral
IntervalLiteralOrExpression ::= "INTERVAL" [ "+" | "-" ]
                               ( SimpleStringLiteral IntervalQualifier
                               | ( "(" Expression ")" | UnsignedNumericLiteral | CompoundIdentifier )
                                 IntervalQualifierStart
                               )
NonIntervalLiteral ::= NumericLiteral | StringLiteral | SpecialLiteral | DateTimeLiteral
NumericLiteral     ::= [ "+" | "-" ] UnsignedNumericLiteral
UnsignedNumericLiteral ::= UnsignedInteger | DecimalNumeric | DecimalStringLiteral | ApproxNumeric
UnsignedInteger     ::= UNSIGNED_INTEGER_LITERAL
DecimalNumeric      ::= DECIMAL_NUMERIC_LITERAL
DecimalStringLiteral::= "DECIMAL" SimpleStringLiteral
ApproxNumeric       ::= APPROX_NUMERIC_LITERAL
SpecialLiteral     ::= "TRUE" | "FALSE" | "UNKNOWN" | "NULL"
DateTimeLiteral    ::= "{d" StringLiteral "}" | "{t" StringLiteral "}" | "{ts" StringLiteral "}"
                     | "DATE" SimpleStringLiteral
                     | "DATETIME" SimpleStringLiteral
                     | "TIME" SimpleStringLiteral
                     | "UUID" SimpleStringLiteral
                     | "TIMESTAMP" SimpleStringLiteral
                     | "TIME" "WITH" [ "LOCAL" ] "TIME" "ZONE" SimpleStringLiteral
                     | "TIMESTAMP" "WITH" [ "LOCAL" ] "TIME" "ZONE" SimpleStringLiteral
IntervalLiteral    ::= "INTERVAL" [ "+" | "-" ] SimpleStringLiteral IntervalQualifier
IntervalQualifier  ::= ( "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE" )
                       [ "(" UnsignedIntLiteral ")" ]
                       [ "TO" ( "MONTH" | "HOUR" | "MINUTE" | "SECOND" ) ]
                     | "SECOND" [ "(" UnsignedIntLiteral [ "," UnsignedIntLiteral ] ")" ]
IntervalQualifierStart ::= ( "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE" )
                           [ "(" UnsignedIntLiteral ")" ]
                         | "SECOND" [ "(" UnsignedIntLiteral [ "," UnsignedIntLiteral ] ")" ]
```

#### 7. 補助規則 (Helper Productions)

```ebnf
// NOTE: Some productions below are aliases (EBNF conveniences) that expand
// inline sequences from .jj; they do not correspond to standalone JavaCC
// productions but are semantically equivalent.
AddSetOpQuery       ::= BinaryQueryOperator LeafQueryOrExpr
BinaryQueryOperator ::= ( "UNION" | "INTERSECT" | "EXCEPT" ) [ "ALL" | "DISTINCT" ]
AddSetOpQueryOrExpr ::= BinaryQueryOperator LeafQueryOrExpr

Query              ::= [ WithList ] LeafQuery { AddSetOpQuery }
WithList           ::= "WITH" [ "RECURSIVE" ] WithItem { "," WithItem }
SqlQueryEof         ::= OrderedQueryOrExpr <EOF>
ExprOrJoinOrOrderedQuery ::= Query OrderByLimitOpt
                           | TableRef1 { JoinTable } { AddSetOpQuery }

ParenthesizedExpression ::= "(" ( OrderedQueryOrExpr | Expression ) ")"
ParenthesizedQueryOrCommaList ::= "(" ( OrderedQueryOrExpr | ExpressionList ) ")"
ParenthesizedQueryOrCommaListWithDefault ::= "(" [ ExpressionOrDefault { "," ExpressionOrDefault } ] ")"
ExpressionList      ::= Expression { "," Expression }
ExpressionCommaList ::= Expression { "," Expression }
ExpressionOrDefault ::= Expression | "DEFAULT"

SimpleIdentifierList ::= SimpleIdentifier { "," SimpleIdentifier }
SimpleIdentifier    ::= Identifier
SimpleIdentifierOrListOrEmpty ::= SimpleIdentifier | "(" SimpleIdentifierList ")" | "(" ")"
ParenthesizedSimpleIdentifierList ::= "(" SimpleIdentifierList ")"
CompoundIdentifier  ::= Identifier { "." Identifier } [ "." "*" ]
CompoundTableIdentifier ::= TableIdentifierSegment { "." TableIdentifierSegment }
TableIdentifierSegment ::= Identifier
Identifier          ::= IDENTIFIER | HYPHENATED_IDENTIFIER | QUOTED_IDENTIFIER
                      | BACK_QUOTED_IDENTIFIER | BIG_QUERY_BACK_QUOTED_IDENTIFIER
                      | BRACKET_QUOTED_IDENTIFIER
SimpleIdentifierFromStringLiteral ::= StringLiteral
ParenthesizedCompoundIdentifierList ::= "(" CompoundIdentifierType { "," CompoundIdentifierType } ")"
CompoundIdentifierType ::= CompoundIdentifier [ DataType [ NotNullOpt ] ]
NotNullOpt          ::= "NOT" "NULL" | /* empty (nullable) */

Hint               ::= "/*+" HintItem { "," HintItem } "*/"
HintItem           ::= SimpleIdentifier [ "(" [ Literal { "," Literal } ] ")" ]
TableHints         ::= Hint
SqlSelectKeywords  ::= /* empty (dialect-specific) */
ParenthesizedLiteralOptionCommaList ::= "(" [ Literal { "," Literal } ] ")"
ParenthesizedKeyValueOptionCommaList ::= "(" KeyValueOption { "," KeyValueOption } ")"
KeyValueOption     ::= ( SimpleIdentifier | StringLiteral ) "=" StringLiteral

Where              ::= "WHERE" Expression
GroupBy            ::= "GROUP" "BY" [ "DISTINCT" | "ALL" ] GroupingElementList
Having             ::= "HAVING" Expression
Window             ::= "WINDOW" WindowDeclaration { "," WindowDeclaration }
Qualify            ::= "QUALIFY" Expression

OverClause         ::= /* empty (table OVER not enabled in base parser) */
TableOverOpt       ::= /* empty (extension point) */
Over               ::= TableOverOpt
ExtendedTableRef   ::= /* empty (parser extension point) */

TableFunctionCall  ::= "TABLE" "(" [ "SPECIFIC" ] NamedRoutineCall ")"
ImplicitTableFunctionCallArgs ::= CompoundIdentifier "(" [ Arg0 { "," Arg } ] ")"
NamedRoutineCall   ::= CompoundIdentifier "(" [ Arg0 { "," Arg } ] ")"
FunctionParameterList ::= "(" [ SetQuantifier ] Arg0 { "," Arg } ")"
SetQuantifier      ::= "ALL" | "DISTINCT"
AllOrDistinct      ::= "ALL" | "DISTINCT"
UnquantifiedFunctionParameterList ::= FunctionParameterList

AddArg0            ::= Arg0
AddArg             ::= Arg
AddExpression      ::= Expression
AddExpression2b    ::= Expression2b
AddExpressions     ::= ExpressionCommaList
AddGroupingElement ::= GroupingElement
AddWindowSpec      ::= WindowDeclaration
AddWithItem        ::= WithItem
AddSelectItem      ::= SelectItem
AddRowConstructor  ::= RowConstructor
AddSimpleIdentifiers ::= SimpleIdentifierList
AddIdentifierSegment ::= Identifier
AddTableIdentifierSegment ::= TableIdentifierSegment
AddOrderItem       ::= OrderItem
AddMeasureColumn   ::= MeasureColumn
AddSubsetDefinition ::= SubsetDefinition
AddPivotAgg        ::= PivotAgg
AddPivotValue      ::= PivotValue
AddUnpivotValue    ::= UnpivotValue
AddKeyValueOption  ::= KeyValueOption
AddOptionValue     ::= NumericLiteral | StringLiteral
AddColumnType      ::= ColumnType
AddCompoundIdentifierType ::= CompoundIdentifierType
AddCompoundIdentifierTypes ::= CompoundIdentifierType { "," CompoundIdentifierType }
AddHint            ::= HintItem
Arg0               ::= [ SimpleIdentifier ":=" ]
                       ( Default | LambdaExpression | TableParam | PartitionedQueryOrQueryOrExpr )
Arg                ::= [ SimpleIdentifier ":=" ]
                       ( Default | LambdaExpression | TableParam | Expression )
Default            ::= "DEFAULT"
TableParam         ::= ExplicitTable
                       [ "PARTITION" "BY" SimpleIdentifierOrList ]
                       [ OrderByOfSetSemanticsTable ]
PartitionedQueryOrQueryOrExpr ::= OrderedQueryOrExpr
                                 [ "PARTITION" "BY" SimpleIdentifierOrList ]
                                 [ OrderByOfSetSemanticsTable ]
PartitionedByAndOrderBy ::= [ "PARTITION" "BY" SimpleIdentifierOrList ]
                            [ OrderByOfSetSemanticsTable ]
OrderByOfSetSemanticsTable ::= "ORDER" "BY"
                               ( "(" OrderItem { "," OrderItem } ")"
                               | OrderItem
                               )
// NOTE: OrderByOfSetSemanticsTable is a restricted ORDER BY used for set-semantics tables;
// it allows a parenthesized list or a single OrderItem, unlike the general OrderBy rule.
NamedFunctionCall  ::= ( StringAggFunctionCall | PercentileFunctionCall | NamedCall )
                       [ nullTreatment ] [ withinDistinct ] [ withinGroup ]
                       [ FilterClause ] [ OverWindowClause ]
NamedCall          ::= [ "SPECIFIC" ] FunctionName
                       ( "(" "*" ")" | "(" ")" | FunctionParameterList )
FunctionName       ::= CompoundIdentifier | ReservedFunctionName
ReservedFunctionName ::= NonReservedJdbcFunctionName | /* reserved keywords usable as function names */
NonReservedJdbcFunctionName ::= "SUBSTRING"
NonReservedKeyWord  ::= /* non-reserved keyword set (lexer-defined) */
NonReservedKeyWord0of3 ::= NonReservedKeyWord
NonReservedKeyWord1of3 ::= NonReservedKeyWord
NonReservedKeyWord2of3 ::= NonReservedKeyWord
FilterClause       ::= "FILTER" "(" "WHERE" Expression ")"
OverWindowClause   ::= "OVER" ( SimpleIdentifier | WindowSpecification )

StringAggFunctionCall ::= ( "ARRAY_AGG" | "ARRAY_CONCAT_AGG" | "GROUP_CONCAT" | "STRING_AGG" )
                          "(" [ AllOrDistinct ] Expression { "," Expression }
                          [ NullTreatment ] [ OrderBy ] [ "SEPARATOR" StringLiteral ] ")"

PercentileFunctionCall ::= ( "PERCENTILE_CONT" | "PERCENTILE_DISC" )
                          "(" Expression
                          [ "," NumericLiteral [ NullTreatment ] ] ")"

GroupByWindowingCall ::= ( "TUMBLE" | "HOP" | "SESSION" ) FunctionParameterList

MatchRecognizeFunctionCall ::= "CLASSIFIER" "(" ")" | "MATCH_NUMBER" "(" ")"
                             | MatchRecognizeNavigationLogical
                             | MatchRecognizeNavigationPhysical
                             | MatchRecognizeCallWithModifier
MatchRecognize      ::= MatchRecognizeClause
MatchRecognizeCallWithModifier ::= ( "RUNNING" | "FINAL" ) NamedFunctionCall
MatchRecognizeNavigationLogical ::= [ "RUNNING" | "FINAL" ] ( "FIRST" | "LAST" )
                                   "(" Expression [ "," NumericLiteral ] ")"
MatchRecognizeNavigationPhysical ::= ( "PREV" | "NEXT" )
                                     "(" Expression [ "," NumericLiteral ] ")"

withinDistinct     ::= "WITHIN" "DISTINCT" "(" ExpressionList ")"
withinGroup        ::= "WITHIN" "GROUP" "(" OrderBy ")"
NullTreatment      ::= ( "IGNORE" | "RESPECT" ) "NULLS"
nullTreatment      ::= NullTreatment
JdbcFunctionCall   ::= "{fn" CompoundIdentifier "(" [ Expression { "," Expression } ] ")" "}"

DynamicParam       ::= "?" | ":" UnsignedIntLiteral
CursorExpression   ::= "CURSOR" "(" OrderedQueryOrExpr ")"
ContextVariable    ::= "CURRENT_USER" | "CURRENT_DATE" | "CURRENT_TIME"
                     | "CURRENT_TIMESTAMP" | "LOCALTIME" | "LOCALTIMESTAMP"
NewSpecification   ::= "NEW" SimpleIdentifier
SequenceExpression ::= ( "NEXT" | "CURRENT" ) "VALUE" "FOR" CompoundIdentifier

SimpleIdentifierOrList ::= SimpleIdentifier | "(" SimpleIdentifierList ")"
PivotAgg           ::= NamedFunctionCall [ [ "AS" ] SimpleIdentifier ]
PivotValue         ::= RowConstructor [ [ "AS" ] SimpleIdentifier ]
UnpivotValue       ::= SimpleIdentifierOrList [ "AS" RowConstructor ]

MeasureColumn      ::= Expression "AS" SimpleIdentifier
PatternExpression  ::= PatternTerm { "|" PatternTerm }
PatternTerm        ::= PatternFactor { PatternFactor }
PatternFactor      ::= PatternPrimary [ PatternQuantifier ]
PatternQuantifier  ::= "*" | "+" | "?"
                    | "{" UnsignedNumericLiteral [ "," [ UnsignedNumericLiteral ] ] "}"
                    | "{" "," UnsignedNumericLiteral "}"
                    | "{" "-" PatternExpression "-" "}"
                    [ "?" ]
PatternPrimary     ::= SimpleIdentifier
                    | "(" PatternExpression ")"
                    | "{" "-" PatternExpression "-" "}"
                    | "PERMUTE" "(" PatternExpression { "," PatternExpression } ")"
SubsetDefinition   ::= SimpleIdentifier "=" "(" ExpressionList ")"
PatternDefinition  ::= SimpleIdentifier "AS" Expression
SkipTo             ::= "PAST" "LAST" "ROW"
                     | "TO" "NEXT" "ROW"
                     | "TO" "FIRST" SimpleIdentifier
                     | "TO" [ "LAST" ] SimpleIdentifier

StringLiteral      ::= BinaryStringLiteral | CharStringLiteral | CStyleEscapedString
BinaryStringLiteral ::= BINARY_STRING_LITERAL { QUOTED_STRING }
CharStringLiteral  ::= ( PREFIXED_STRING_LITERAL | QUOTED_STRING | UNICODE_STRING_LITERAL )
                      { QUOTED_STRING } [ "UESCAPE" QUOTED_STRING ]
                    | BIG_QUERY_DOUBLE_QUOTED_STRING
                    | BIG_QUERY_QUOTED_STRING
CStyleEscapedString ::= C_STYLE_ESCAPED_STRING_LITERAL
SimpleStringLiteral ::= QUOTED_STRING | BIG_QUERY_QUOTED_STRING | BIG_QUERY_DOUBLE_QUOTED_STRING

UnsignedIntLiteral ::= UNSIGNED_INTEGER_LITERAL
IntLiteral         ::= [ "+" | "-" ] UNSIGNED_INTEGER_LITERAL
UnsignedNumericLiteralOrParam ::= UnsignedNumericLiteral | DynamicParam

TimeUnitOrName     ::= TimeUnit | SimpleIdentifier
TimeUnit           ::= "NANOSECOND" | "MICROSECOND" | "MILLISECOND" | "SECOND"
                     | "MINUTE" | "HOUR" | "DAY"
                     | "DAYOFWEEK" | "DAYOFYEAR" | "DOW" | "DOY"
                     | "ISODOW" | "ISOYEAR"
                     | "WEEK" [ "(" weekdayName ")" ]
                     | "MONTH" | "QUARTER" | "YEAR"
                     | "EPOCH" | "DECADE" | "CENTURY" | "MILLENNIUM"
weekdayName        ::= "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY"
                     | "THURSDAY" | "FRIDAY" | "SATURDAY"
Year               ::= "YEAR" | "YEARS"
Quarter            ::= "QUARTER" | "QUARTERS"
Month              ::= "MONTH" | "MONTHS"
Week               ::= "WEEK" | "WEEKS"
Day                ::= "DAY" | "DAYS"
Hour               ::= "HOUR" | "HOURS"
Minute             ::= "MINUTE" | "MINUTES"
Second             ::= "SECOND" | "SECONDS"
IntervalWithoutQualifier ::= "INTERVAL" /* default SECOND */

JsonRepresentation ::= "JSON" [ "ENCODING" ( "UTF8" | "UTF16" | "UTF32" ) ]
JsonInputClause    ::= "FORMAT" JsonRepresentation
JsonPathSpec       ::= StringLiteral
JsonName           ::= Expression
JsonNameAndValue   ::= [ "KEY" ] JsonName ( "VALUE" | "," | ":" ) Expression
JsonConstructorNullClause ::= "NULL" "ON" "NULL" | "ABSENT" "ON" "NULL"
JsonOutputClause   ::= JsonReturningClause [ "FORMAT" JsonRepresentation ]

TableRef1          ::= TableRef3
TableRef2          ::= TableRef3
TableRef3          ::= TableRefPrimary
                       [ PivotClause ] [ UnpivotClause ]
                       [ [ "AS" ] SimpleIdentifier [ "(" SimpleIdentifierList ")" ] ]
                       [ TablesampleClause ]
Tablesample        ::= TablesampleClause
Pivot              ::= PivotClause
Unpivot            ::= UnpivotClause
Snapshot           ::= SnapshotClause

LambdaExpression   ::= SimpleIdentifierOrListOrEmpty "->" Expression

PeriodConstructor  ::= "PERIOD" "(" Expression "," Expression ")"
ArrayLiteral       ::= "{" ( Literal { "," Literal }
                           | ArrayLiteral { "," ArrayLiteral }
                           | /* empty */
                           ) "}"

PrecisionOpt       ::= "(" UnsignedIntLiteral ")" | /* empty */
NullableOptDefaultTrue  ::= "NULL" | "NOT" "NULL" | /* empty (default true) */
NullableOptDefaultFalse ::= "NULL" | "NOT" "NULL" | /* empty (default false) */

JsonArrayAggOrderByClause ::= OrderBy

ContainsSubstrFunctionCall ::= "CONTAINS_SUBSTR" "(" Expression "," Expression
                               [ "," "JSON_SCOPE" ":=" Expression ] ")"

DateDiffFunctionCall      ::= "DATE_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
TimestampAddFunctionCall  ::= "TIMESTAMPADD" "(" TimeUnitOrName "," Expression "," Expression ")"
TimestampDiffFunctionCall ::= "TIMESTAMPDIFF" "(" TimeUnitOrName "," Expression "," Expression ")"
TimestampDiff3FunctionCall ::= "TIMESTAMP_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
DatetimeDiffFunctionCall  ::= "DATETIME_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
DateTruncFunctionCall     ::= "DATE_TRUNC" "(" Expression "," TimeUnitOrName ")"
DatetimeTruncFunctionCall ::= "DATETIME_TRUNC" "(" Expression "," TimeUnitOrName ")"
TimestampTruncFunctionCall ::= "TIMESTAMP_TRUNC" "(" Expression "," TimeUnitOrName ")"
TimeDiffFunctionCall      ::= "TIME_DIFF" "(" Expression "," Expression "," TimeUnitOrName ")"
TimeTruncFunctionCall     ::= "TIME_TRUNC" "(" Expression "," TimeUnitOrName ")"

DateTimeConstructorCall   ::= ( "DATE" | "TIME" | "DATETIME" | "TIMESTAMP" )
                              FunctionParameterList

FloorCeilOptions          ::= StandardFloorCeilOptions
StandardFloorCeilOptions  ::= "(" Expression [ "TO" TimeUnitOrName ] ")"
                             [ "OVER" ( SimpleIdentifier | WindowSpecification ) ]

JdbcOdbcDataTypeName ::= "SQL_CHAR" | "CHAR" | "SQL_VARCHAR" | "VARCHAR"
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
JdbcOdbcDataType ::= JdbcOdbcDataTypeName

CollectionsTypeName ::= DataType ( "MULTISET" | "ARRAY" )
CollateClause       ::= "COLLATE" SimpleIdentifier
UnusedExtension     ::= /* empty (extension point) */

MeasureColumnCommaList ::= MeasureColumn { "," MeasureColumn }
SubsetDefinitionCommaList ::= SubsetDefinition { "," SubsetDefinition }
PatternDefinitionCommaList ::= PatternDefinition { "," PatternDefinition }

Natural            ::= "NATURAL" | /* empty */
Scope              ::= "SYSTEM" | "SESSION"
comp               ::= "<" | "<=" | ">" | ">=" | "=" | "<>" | "!="
periodOperator     ::= /* TODO: period operator (overlaps) */

```
