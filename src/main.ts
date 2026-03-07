const input = document.getElementById('sqlInput');
const output = document.getElementById('formatOutput');
const status = document.getElementById('status');
const formatMessage = document.getElementById('formatMessage');
const astModeSwitch = document.getElementById('astModeSwitch');
const copyBtn = document.getElementById('copyBtn');
let rerenderTimer = null;

const defaultSql = 'SELECT a FROM t WHERE b = 1';
input.value = defaultSql;

function render(text) {
  output.textContent = text;
}

function setFormatMessage(kind, text) {
  if (!formatMessage) return;
  if (!text) {
    if (typeof formatMessage.clear === 'function') {
      formatMessage.clear();
    } else {
      formatMessage.removeAttribute('active');
      formatMessage.setAttribute('text', '');
    }
    return;
  }
  formatMessage.setAttribute('variant', kind || 'info');
  formatMessage.setAttribute('text', text);
  if (typeof formatMessage.show === 'function') {
    formatMessage.show(text);
  } else {
    formatMessage.setAttribute('active', '');
  }
}

function isAstMode() {
  return !!astModeSwitch?.checked;
}

function handleAst() {
  const sql = input.value.trim();
  if (!sql) {
    output.textContent = '';
    status.textContent = 'empty';
    setFormatMessage('idle', '');
    return;
  }
  try {
    const lexer = new window.CalciteLexer(sql);
    const tokens = lexer.tokenize();
    const parser = new window.CalciteParser(tokens);
    const ast = parser.SqlStmtList();
    status.textContent = `ast (calcite pos: ${parser.pos})`;
    setFormatMessage('idle', '');
    render(JSON.stringify(ast, null, 2));
  } catch (err) {
    if (window.WellknownDdlLexer && window.WellknownDdlParser) {
      try {
        const ddlLexer = new window.WellknownDdlLexer(sql);
        const ddlTokens = ddlLexer.tokenize();
        const ddlParser = new window.WellknownDdlParser(ddlTokens);
        const ddlAst = ddlParser.SqlStmtList();
        status.textContent = `ast (ddl pos: ${ddlParser.pos})`;
        setFormatMessage('idle', '');
        render(JSON.stringify(ddlAst, null, 2));
        return;
      } catch (ddlErr) {
        status.textContent = 'error';
        setFormatMessage('error', 'AST parse failed in both Calcite and DDL parser.');
        render(JSON.stringify({
          error: String(err.message || err),
          ddlError: String(ddlErr.message || ddlErr),
        }, null, 2));
        return;
      }
    }
    status.textContent = 'error';
    setFormatMessage('error', 'AST parse failed.');
    render(JSON.stringify({ error: String(err.message || err) }, null, 2));
  }
}

function handleFormat() {
  const sql = input.value.trim();
  if (!sql) {
    output.textContent = '';
    status.textContent = 'empty';
    setFormatMessage('idle', '');
    return;
  }
  try {
    if (typeof window.formatSqlWithMeta !== 'function') {
      status.textContent = 'error';
      setFormatMessage('error', 'formatter not loaded');
      render('formatter not loaded');
      return;
    }
    const result = window.formatSqlWithMeta(sql);
    status.textContent = result.status === 'formatted' ? 'format' : result.status;
    if (result.status === 'parse-error') {
      setFormatMessage('error', result.message);
    } else if (result.status === 'passthrough') {
      setFormatMessage('warning', result.message);
    } else {
      setFormatMessage('idle', '');
    }
    render(result.sql);
  } catch (err) {
    status.textContent = 'error';
    setFormatMessage('error', String(err.message || err));
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

function flushScheduledRun() {
  if (!rerenderTimer) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = null;
  handleRun();
}

input.addEventListener('input', scheduleRun);
astModeSwitch?.addEventListener('change', handleRun);
copyBtn?.addEventListener('click', flushScheduledRun, true);

handleRun();
