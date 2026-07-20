#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "../..");
const directories = [
  "data/raw/team-pages/milan/espn",
  "data/raw/team-pages/milan/official-profiles"
];

let count = 0;
let sourceBytes = 0;
let compressedBytes = 0;

function compressDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      compressDirectory(target);
      continue;
    }
    if (!target.endsWith(".json") && !target.endsWith(".html")) continue;
    const compressedTarget = `${target}.gz`;
    if (fs.existsSync(compressedTarget)) continue;
    const input = fs.readFileSync(target);
    const output = zlib.gzipSync(input, { level: 9 });
    fs.writeFileSync(compressedTarget, output);
    count += 1;
    sourceBytes += input.length;
    compressedBytes += output.length;
  }
}

for (const relative of directories) compressDirectory(path.join(root, relative));
console.log(`Compressi ${count} file: ${(sourceBytes / 1048576).toFixed(2)} MB → ${(compressedBytes / 1048576).toFixed(2)} MB.`);
