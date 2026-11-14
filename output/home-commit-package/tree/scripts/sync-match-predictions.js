"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const matchId = valueAfter("--match");
const updateQuotes = process.argv.includes("--update-quotes");
const withdrawals = process.argv.flatMap((argument, index, args) => argument === "--withdraw" && args[index + 1] ? [args[index + 1]] : []);
if (!matchId) throw new Error("Specificare --match <matchId>.");

const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matches = read("data/normalized/matches.json");
const match = matches.find(row => row.id === matchId);
assert(match, `${matchId}: partita non trovata`);
assert.equal(match.competition, "serie-a", `${matchId}: competizione non supportata`);
assert.equal(match.matchday, 6, "Il flusso incrementale corrente è abilitato per la giornata 6");

const mutableFiles = [
  "data/normalized/predictions.json",
  "data/sources/mycombo-serie-a-2026-27-md-06.json",
  "data/sources/schedina-serie-a-2026-27-md-06.json",
  "data/sources/betting-selection-assessments-md06.json",
  "data/normalized/schedina-md06.json",
  "output/reports/serie-a-md05-betting-decision-review-2026-10-09.json",
  "output/reports/serie-a-md05-betting-decision-review-2026-10-09.md",
  "output/reports/serie-a-md06-betting-selection-2026-10-09.json",
  "output/reports/serie-a-md06-betting-selection-2026-10-09.md",
];
const snapshots = new Map(mutableFiles.map(relative => {
  const target = path.join(root, relative);
  return [relative, fs.existsSync(target) ? fs.readFileSync(target) : null];
}));
const historicalFiles = ["schedina.json", "schedina-md02.json", "schedina-md03.json", "schedina-md04.json", "schedina-md05.json"].map(name => `data/normalized/${name}`);
const digest = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const historicalBefore = Object.fromEntries(historicalFiles.map(relative => [relative, digest(relative)]));
const nodeCompatibilityArgs = process.features?.require_module === false ? ["--experimental-require-module"] : [];
const wait = milliseconds => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
const run = (script, args = [], { retryTransient = false } = {}) => {
  const attempts = retryTransient ? 6 : 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    console.log(`\n> node ${script} ${args.join(" ")}${attempt > 1 ? ` · tentativo ${attempt}/${attempts}` : ""}`.trimEnd());
    try {
      execFileSync(process.execPath, [...nodeCompatibilityArgs, script, ...args], { cwd: root, stdio: "inherit" });
      return;
    } catch (error) {
      lastError = error;
      if (!retryTransient || attempt === attempts) throw error;
      wait(750 * attempt);
    }
  }
  throw lastError;
};
const restore = () => {
  const retry = action => {
    let lastError;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try { action(); return; } catch (error) {
        lastError = error;
        if (!["EBUSY", "EPERM", "EACCES", "UNKNOWN"].includes(error.code)) throw error;
        wait(500 * (attempt + 1));
      }
    }
    throw lastError;
  };
  for (const [relative, contents] of snapshots) {
    const target = path.join(root, relative);
    if (contents === null) {
      if (fs.existsSync(target)) retry(() => fs.unlinkSync(target));
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    retry(() => fs.writeFileSync(target, contents));
  }
};

try {
  run("scripts/build-predictions.js", [], { retryTransient: true });
  run("scripts/generate-mycombo-md01.js", ["--matchday", "6", "--match", matchId], { retryTransient: true });
  wait(750);
  run("scripts/build-predictions.js", [], { retryTransient: true });
  const integrateArgs = ["--integrate", "--match", matchId];
  if (updateQuotes) integrateArgs.push("--update-quotes");
  for (const selectionId of withdrawals) integrateArgs.push("--withdraw", selectionId);
  run("scripts/build-md06-betting-decision-package.mjs", integrateArgs, { retryTransient: true });
  run("scripts/build-md06-betting-decision-package.mjs", [], { retryTransient: true });
  run("scripts/test-forecast-sync.js");
  run("scripts/test-schedina-md06.js");
  run("scripts/test-md06-suggested-forecasts.js");
  run("scripts/test-personal-betslip.mjs");
  const historicalAfter = Object.fromEntries(historicalFiles.map(relative => [relative, digest(relative)]));
  assert.deepEqual(historicalAfter, historicalBefore, "Una schedina conclusa è stata alterata");
  console.log(JSON.stringify({ status: "OK", transaction: "committed", matchId, updateQuotes, withdrawals, sharedForecastSource: "data/normalized/schedina-md06.json#marketCatalog" }, null, 2));
} catch (error) {
  try {
    restore();
    console.error(`Sincronizzazione annullata e rollback completato: ${error.message}`);
  } catch (rollbackError) {
    console.error(`Sincronizzazione fallita (${error.message}) e rollback incompleto (${rollbackError.message}).`);
  }
  process.exitCode = 1;
}
