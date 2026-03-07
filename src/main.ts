const input = document.getElementById('sqlInput');
const output = document.getElementById('formatOutput');
const status = document.getElementById('status');
const astModeSwitch = document.getElementById('astModeSwitch');
let rerenderTimer = null;

const defaultSql = 'SELECT a FROM t WHERE b = 1';
input.value = defaultSql;

function render(text) {
  output.textContent = text;
}

function isAstMode() {
  return !!astModeSwitch?.checked;
}

function handleAst() {
  const sql = input.value.trim();
  if (!sql) {
    output.textContent = '';
    status.textContent = 'empty';
    return;
  }
  try {
    const lexer = new window.CalciteLexer(sql);
    const tokens = lexer.tokenize();
    const parser = new window.CalciteParser(tokens);
    const ast = parser.SqlStmtList();
    status.textContent = `ast (calcite pos: ${parser.pos})`;
    render(JSON.stringify(ast, null, 2));
  } catch (err) {
    if (window.WellknownDdlLexer && window.WellknownDdlParser) {
      try {
        const ddlLexer = new window.WellknownDdlLexer(sql);
        const ddlTokens = ddlLexer.tokenize();
        const ddlParser = new window.WellknownDdlParser(ddlTokens);
        const ddlAst = ddlParser.SqlStmtList();
        status.textContent = `ast (ddl pos: ${ddlParser.pos})`;
        render(JSON.stringify(ddlAst, null, 2));
        return;
      } catch (ddlErr) {
        status.textContent = 'error';
        render(JSON.stringify({
          error: String(err.message || err),
          ddlError: String(ddlErr.message || ddlErr),
        }, null, 2));
        return;
      }
    }
    status.textContent = 'error';
    render(JSON.stringify({ error: String(err.message || err) }, null, 2));
  }
}

function handleFormat() {
  const sql = input.value.trim();
  if (!sql) {
    output.textContent = '';
    status.textContent = 'empty';
    return;
  }
  try {
    if (typeof window.formatSql !== 'function') {
      status.textContent = 'error';
      render('formatter not loaded');
      return;
    }
    const formatted = window.formatSql(sql);
    status.textContent = 'format';
    render(formatted);
  } catch (err) {
    status.textContent = 'error';
    render(String(err.message || err));
  }
}

function handleRun() {
  if (isAstMode()) {
    handleAst();
    return;
  }
  handleFormat();
}

function scheduleRun() {
  if (rerenderTimer) {
    clearTimeout(rerenderTimer);
  }
  rerenderTimer = setTimeout(() => {
    rerenderTimer = null;
    handleRun();
  }, 120);
}

input.addEventListener('input', scheduleRun);
astModeSwitch?.addEventListener('change', handleRun);

handleRun();
