import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TEMPLATE_FILE = path.join(ROOT, 'sql-formatter-src.html');
const OFFLINE_OUTPUT_FILE = path.join(ROOT, 'sql-formatter.html');
const ONLINE_OUTPUT_FILE = path.join(ROOT, 'sql-formatter-online.html');

const OFFLINE_VENDOR_FILES = {
  calcite: path.join(ROOT, 'spec/apache-calcite-Parser.js'),
  ddl: path.join(ROOT, 'spec/wellknown-sql-ddl.js'),
  formatterSourceTs: path.join(ROOT, 'src/sql-formatter.ts'),
  formatterRuntimeJs: path.join(ROOT, 'src/sql-formatter.js'),
  lhtComponentsCss: path.join(ROOT, 'lht-cmn/css/components.css'),
  lhtComponentsJs: path.join(ROOT, 'lht-cmn/js/components.js'),
};

const ONLINE_SCRIPT_PATHS = {
  calcite: './spec/apache-calcite-Parser.js',
  ddl: './spec/wellknown-sql-ddl.js',
  formatter: './src/sql-formatter.js',
  lhtComponents: './lht-cmn/js/components.js',
};

const ONLINE_STYLE_PATHS = {
  lhtComponents: './lht-cmn/css/components.css',
};

const APP_SOURCE_FILES = [
  path.join(ROOT, 'src/main.ts'),
];

function wrapInlineScript(content) {
  return `<script>\n${content}\n</script>`;
}

function wrapInlineStyle(content) {
  return `<style>\n${content}\n</style>`;
}

function wrapExternalScript(scriptPath) {
  return `<script src="${scriptPath}"></script>`;
}

function wrapExternalStyle(stylePath) {
  return `<link rel="stylesheet" href="${stylePath}" />`;
}

async function readUtf8(filePath) {
  return readFile(filePath, 'utf8');
}

function transpileTsToJs(tsCode, sourceUrl) {
  return stripTypeScriptTypes(tsCode, { mode: 'transform', sourceUrl });
}

function joinAppSources(contentsByFile) {
  return contentsByFile
    .map(({ filePath, content }) => `// Source: ${path.relative(ROOT, filePath)}\n${content.trim()}\n`)
    .join('\n');
}

function replaceTokens(template, replacements) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.replaceAll(token, value);
  }
  return output;
}

async function buildHtml() {
  await mkdir(path.join(ROOT, 'src'), { recursive: true });
  const template = await readUtf8(TEMPLATE_FILE);

  const [calciteJs, ddlJs, formatterTs, lhtComponentsCss, lhtComponentsJs] = await Promise.all([
    readUtf8(OFFLINE_VENDOR_FILES.calcite),
    readUtf8(OFFLINE_VENDOR_FILES.ddl),
    readUtf8(OFFLINE_VENDOR_FILES.formatterSourceTs),
    readUtf8(OFFLINE_VENDOR_FILES.lhtComponentsCss),
    readUtf8(OFFLINE_VENDOR_FILES.lhtComponentsJs),
  ]);
  const formatterJs = transpileTsToJs(formatterTs, OFFLINE_VENDOR_FILES.formatterSourceTs);
  await writeFile(OFFLINE_VENDOR_FILES.formatterRuntimeJs, formatterJs, 'utf8');

  const appSources = await Promise.all(
    APP_SOURCE_FILES.map(async (filePath) => ({ filePath, content: await readUtf8(filePath) }))
  );
  const appScript = joinAppSources(appSources);

  const offlineHtml = replaceTokens(template, {
    '{{LHT_COMPONENTS_STYLE}}': wrapInlineStyle(lhtComponentsCss),
    '{{LHT_COMPONENTS_SCRIPT}}': wrapInlineScript(lhtComponentsJs),
    '{{CALCITE_PARSER_SCRIPT}}': wrapInlineScript(calciteJs),
    '{{DDL_PARSER_SCRIPT}}': wrapInlineScript(ddlJs),
    '{{FORMATTER_SCRIPT}}': wrapInlineScript(formatterJs),
    '{{APP_SCRIPT}}': wrapInlineScript(appScript),
  });

  const onlineHtml = replaceTokens(template, {
    '{{LHT_COMPONENTS_STYLE}}': wrapExternalStyle(ONLINE_STYLE_PATHS.lhtComponents),
    '{{LHT_COMPONENTS_SCRIPT}}': wrapExternalScript(ONLINE_SCRIPT_PATHS.lhtComponents),
    '{{CALCITE_PARSER_SCRIPT}}': wrapExternalScript(ONLINE_SCRIPT_PATHS.calcite),
    '{{DDL_PARSER_SCRIPT}}': wrapExternalScript(ONLINE_SCRIPT_PATHS.ddl),
    '{{FORMATTER_SCRIPT}}': wrapExternalScript(ONLINE_SCRIPT_PATHS.formatter),
    '{{APP_SCRIPT}}': wrapInlineScript(appScript),
  });

  await Promise.all([
    writeFile(OFFLINE_OUTPUT_FILE, offlineHtml, 'utf8'),
    writeFile(ONLINE_OUTPUT_FILE, onlineHtml, 'utf8'),
  ]);
}

buildHtml()
  .then(() => {
    console.log('Generated: sql-formatter.html');
    console.log('Generated: sql-formatter-online.html');
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
