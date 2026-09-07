"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "data/sources/champions-team-branding-2026-27.json");
const outputDirectory = path.join(root, "assets/images/champions");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "serie-a-2026-27-site-builder/1.0" } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 5) {
        response.resume();
        download(new URL(response.headers.location, url).toString(), destination, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`${response.statusCode} ${url}`));
        return;
      }
      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (!contentType.includes("image/png")) {
        response.resume();
        reject(new Error(`contenuto non PNG per ${url}: ${contentType || "N/D"}`));
        return;
      }
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const pngSignature = buffer.subarray(0, 8).toString("hex");
        if (buffer.length < 100 || pngSignature !== "89504e470d0a1a0a") {
          reject(new Error(`PNG non valido per ${url}`));
          return;
        }
        fs.writeFileSync(destination, buffer);
        resolve(buffer.length);
      });
    }).on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const seenTeams = new Set();
  const seenFiles = new Set();
  for (const team of manifest.teams) {
    if (!team.team || !team.uefaTeamId || !team.slug) throw new Error("Voce branding Champions incompleta");
    if (seenTeams.has(team.team)) throw new Error(`Squadra duplicata: ${team.team}`);
    if (seenFiles.has(team.slug)) throw new Error(`Slug duplicato: ${team.slug}`);
    seenTeams.add(team.team);
    seenFiles.add(team.slug);
    const url = manifest.source.urlTemplate.replace("{uefaTeamId}", team.uefaTeamId);
    const destination = path.join(outputDirectory, `${team.slug}.png`);
    const bytes = await download(url, destination);
    console.log(`${team.team}: ${bytes} byte`);
  }
  console.log(`OK loghi Champions: ${manifest.teams.length} PNG scaricati da UEFA`);
}

main().catch(error => {
  console.error(`Download loghi Champions fallito: ${error.message}`);
  process.exitCode = 1;
});
