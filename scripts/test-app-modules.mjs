import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pageFiles = ["home", "matches", "teams", "readings", "referees", "fantasy", "cup"];

for (const name of pageFiles) {
  const module = await import(pathToFileURL(path.join(root, "js", "pages", `${name}.js`)));
  const page = module.createPage({});
  assert.equal(typeof page?.render, "function", `${name}: factory senza render()`);
}

const componentModule = await import(pathToFileURL(path.join(root, "js", "components", "match-card.js")));
const components = componentModule.createMatchComponents({ dateOnly: value => value, esc: value => String(value), labels: {} });
for (const name of ["scheduleLabel", "teamLogo", "matchCard", "homeMatchListItem"]) {
  assert.equal(typeof components?.[name], "function", `match-card: ${name} non esportata`);
}

const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(shell, /<script type="module" src="js\/app\.js\?v=[^"]+"><\/script>/, "entry point ES module non generato");
console.log(`OK moduli applicazione: ${pageFiles.length} pagine e 4 componenti condivisi`);
