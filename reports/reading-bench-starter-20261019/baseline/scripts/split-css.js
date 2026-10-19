const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssDir = path.join(root, "css");
const entryPath = path.join(cssDir, "styles.css");
const modules = ["base", "layout", "components", "home", "matches", "team", "players", "fantasy", "responsive"];

function topLevelNodes(source) {
  const nodes = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  let comment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (comment) {
      if (char === "*" && next === "/") { comment = false; index += 1; }
      continue;
    }
    if (!quote && char === "/" && next === "*") { comment = true; index += 1; continue; }
    if (quote) {
      if (char === "\\") { index += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        nodes.push(source.slice(start, index + 1).trim());
        start = index + 1;
      }
    }
  }
  const tail = source.slice(start).trim();
  if (tail) nodes.push(tail);
  return nodes.filter(Boolean);
}

function category(node) {
  const value = node.toLowerCase();
  if (value.startsWith("@media")) return "responsive";
  if (/^(:root|\*\{|html\{|body\{|body::|a\{|h[1-6][,{]|button,a,select,input|:focus-visible)/.test(value)) return "base";
  if (/(fantasy|goalkeeper|auction|lineup-calendar)/.test(value)) return "fantasy";
  if (/(player-|player\b|leaderboard|leader-|serie-b-marker|market-value|squad-table|squad-leader)/.test(value)) return "players";
  if (/(team-|team\b|squad-|objective-|probable-lineup)/.test(value)) return "team";
  if (/(match|fixture|calendar|day-nav|cup-|reading|prediction|h2h|tactical|referee)/.test(value)) return "matches";
  if (/(home-|standings|hero-season|editorial-empty)/.test(value)) return "home";
  if (/(site-header|site-nav|page-link|brand|menu-button|site-footer|footer-|\bmain\b|\.hero\b|\.section\b|\.grid\b)/.test(value)) return "layout";
  return "components";
}

const source = fs.readFileSync(entryPath, "utf8");
if (source.includes('@import url("./base.css")')) {
  throw new Error("styles.css is already the modular entry point");
}

const buckets = Object.fromEntries(modules.map(name => [name, []]));
for (const node of topLevelNodes(source)) buckets[category(node)].push(node);

const variableBlock = `:root{
  --background-page:var(--bg);
  --background-surface:var(--surface);
  --background-surface-strong:var(--surface2);
  --color-text:var(--text);
  --color-text-muted:var(--muted);
  --color-border:var(--line);
  --color-accent:var(--accent);
  --space-1:4px;
  --space-2:8px;
  --space-3:12px;
  --space-4:16px;
  --space-5:24px;
  --space-6:32px;
  --space-7:48px;
  --max-width:var(--max);
  --transition-fast:.18s ease;
  --transition-base:.28s cubic-bezier(.22,.8,.22,1);
}`;
buckets.base.push(variableBlock);
buckets.home.push(`body[data-page="home"] .hero{
  border:1px solid rgba(255,255,255,.42);
  box-shadow:0 1px 0 rgba(255,255,255,.78),0 12px 22px rgba(31,39,52,.16),0 34px 64px rgba(31,39,52,.18),inset 0 0 0 1px rgba(2,8,20,.5),inset 0 16px 26px rgba(0,4,14,.42),inset 0 -12px 22px rgba(0,4,14,.3);
}`);
buckets.responsive.push(`@media(max-width:760px){
  body:not([data-page="home"]) .hero{padding:40px 4px 30px}
}`);

for (const name of modules) {
  const heading = `/* ${name}.css - modulo del sistema grafico condiviso. */\n`;
  fs.writeFileSync(path.join(cssDir, `${name}.css`), `${heading}${buckets[name].join("\n\n")}\n`, "utf8");
}

const manifest = modules.map(name => `@import url("./${name}.css");`).join("\n");
fs.writeFileSync(entryPath, `/* Entry point CSS. L'ordine degli import definisce la cascata globale. */\n${manifest}\n`, "utf8");
console.log(modules.map(name => `${name}.css: ${buckets[name].length} blocchi`).join("\n"));
