const input = document.getElementById('sqlInput');
const output = document.getElementById('formatOutput');
const status = document.getElementById('status');
const parseBtn = document.getElementById('parseBtn');
const formatBtn = document.getElementById('formatBtn');
const copyBtn = document.getElementById('copyBtn');

const defaultSql = 'SELECT a FROM t WHERE b = 1';
input.value = defaultSql;

function render(text) {
  output.textContent = text;
}

async function copyOutput() {
  const text = output.textContent || '';
  if (!text.trim()) {
    status.textContent = 'empty';
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const range = document.createRange();
      range.selectNodeContents(output);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
    }
    status.textContent = 'copied';
  } catch (_err) {
    status.textContent = 'copy failed';
  }
}

function handleParse() {
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
    status.textContent = `ok (calcite pos: ${parser.pos})`;
    render(JSON.stringify(ast, null, 2));
  } catch (err) {
    if (window.WellknownDdlLexer && window.WellknownDdlParser) {
      try {
        const ddlLexer = new window.WellknownDdlLexer(sql);
        const ddlTokens = ddlLexer.tokenize();
        const ddlParser = new window.WellknownDdlParser(ddlTokens);
        const ddlAst = ddlParser.SqlStmtList();
        status.textContent = `ok (ddl pos: ${ddlParser.pos})`;
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
    status.textContent = 'ok';
    render(formatted);
  } catch (err) {
    status.textContent = 'error';
    render(String(err.message || err));
  }
}

parseBtn.addEventListener('click', handleParse);
formatBtn.addEventListener('click', handleFormat);
copyBtn.addEventListener('click', copyOutput);
input.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleParse();
});

handleParse();
