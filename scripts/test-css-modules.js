const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const cssDir = path.join(root, "css");
const modules = ["base", "layout", "components", "home", "matches", "team", "players", "fantasy", "responsive"];
const entry = fs.readFileSync(path.join(cssDir, "styles.css"), "utf8");

assert.ok(Buffer.byteLength(entry) < 1024, "styles.css deve restare un entry point leggero");
for (const name of modules) {
  assert.ok(entry.includes(`@import url("./${name}.css");`), `Import CSS assente: ${name}.css`);
  assert.ok(fs.statSync(path.join(cssDir, `${name}.css`)).size > 100, `Modulo CSS vuoto: ${name}.css`);
}

const tokensSource = modules.map(name => fs.readFileSync(path.join(cssDir, `${name}.css`), "utf8")).join("\n");
for (const token of [
  "--background-page", "--background-surface", "--color-text", "--color-text-muted",
  "--color-border", "--radius-sm", "--radius-md", "--radius-lg", "--shadow-sm",
  "--shadow-lg", "--space-1", "--space-7", "--max-width", "--transition-fast", "--transition-base"
]) assert.ok(tokensSource.includes(`${token}:`), `Token CSS assente: ${token}`);

const responsive = fs.readFileSync(path.join(cssDir, "responsive.css"), "utf8");
assert.ok(responsive.includes("@media(max-width:760px)"), "Breakpoint mobile principale assente");
console.log(`CSS modulare valido: ${modules.length} moduli, entry point ${Buffer.byteLength(entry)} byte.`);
