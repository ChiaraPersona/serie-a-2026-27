"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const matchday = Number(valueAfter("--matchday"));
const validateOnly = process.argv.includes("--validate-only");
const refreshOdds = process.argv.includes("--refresh-odds");
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) throw new Error("Specificare --matchday N, con N compreso tra 1 e 38.");
if (!validateOnly && matchday < 6) throw new Error("MD1-MD5 sono archivi immutabili: usare soltanto --validate-only.");

const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}) : [];
const relative = file => path.relative(root, file).replace(/\\/g, "/");
const protectedFiles = [
  ...walk(path.join(root, "data", "normalized")),
  ...walk(path.join(root, "data", "sources")),
  ...walk(path.join(root, "data", "champions-2026-27")),
  path.join(root, "schedina.html"),
  path.join(root, "js", "pages", "betting.js"),
  path.join(root, "css", "betting.css"),
].filter(file => {
  const name = relative(file);
  return /^data\/normalized\/schedina(?:\.json|-md0[2-5]\.json)$/.test(name)
    || /^data\/sources\/(?:mycombo-serie-a-2026-27-md-0[1-5]|schedina-serie-a-2026-27-md-0[1-5]|schedina-archive-md1-2026-27)\.json$/.test(name)
    || /champions/i.test(name)
    || ["schedina.html", "js/pages/betting.js", "css/betting.css"].includes(name);
});
const digest = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const before = new Map(protectedFiles.map(file => [relative(file), digest(file)]));
const nodeCompatibilityArgs = process.features?.require_module === false ? ["--experimental-require-module"] : [];
const run = (script, args = [], retries = 0) => {
  for (let attempt = 0; ; attempt += 1) {
    console.log(`\n> node ${script} ${args.join(" ")}`.trimEnd());
    try {
      execFileSync(process.execPath, [...nodeCompatibilityArgs, script, ...args], { cwd: root, stdio: "inherit" });
      return;
    } catch (error) {
      if (attempt >= retries) throw error;
      console.warn(`${script}: scrittura temporaneamente bloccata, nuovo tentativo ${attempt + 2}/${retries + 1}.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
    }
  }
};

if (refreshOdds) {
  run("scripts/import-sisal-odds.js");
  run("scripts/normalize-sisal-odds.js");
} else {
  console.log("Quote: uso dello snapshot locale verificato; nessuna acquisizione esterna automatica.");
}
run("scripts/validate-sisal-odds.js");

if (!validateOnly) {
  if (matchday === 6) run("scripts/build-md06-betting-decision-package.mjs", ["--integrate"], 2);
  else run("scripts/build-predictions.js", [], 2);
  run("scripts/generate-mycombo-md01.js", ["--matchday", String(matchday)]);
  run("scripts/build-predictions.js", [], 2);
  if (matchday === 6) {
    run("scripts/build-md06-betting-decision-package.mjs", ["--integrate"], 2);
    run("scripts/build-md06-betting-decision-package.mjs", [], 2);
  } else {
    run("scripts/generate-schedina-md02.js", ["--matchday", String(matchday)]);
    run("scripts/build-schedina.js", ["--matchday", String(matchday)]);
  }
}

run("scripts/enforce-mycombo-risk.js", ["--matchday", String(matchday)]);
if (matchday === 6) {
  run("scripts/test-betting-selection-contract.js");
  run("scripts/test-schedina-md06.js");
} else {
  const test = `scripts/test-schedina-md${String(matchday).padStart(2, "0")}.js`;
  if (fs.existsSync(path.join(root, test))) run(test);
}

const changedProtected = protectedFiles
  .map(file => relative(file))
  .filter(file => before.get(file) !== digest(path.join(root, file)));
if (changedProtected.length) throw new Error(`Archivio/interfaccia alterato dalla pipeline: ${changedProtected.join(", ")}`);
console.log(`OK pipeline betting MD${String(matchday).padStart(2, "0")}: archivi MD1-MD5, Champions e interfaccia byte-stabili.`);
