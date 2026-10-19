"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-attack-channels-2025-26.json");
const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-attack-channels-2025-26.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));

const round = value => Number(value.toFixed(1));
const expected = new Set(calendar.teams);
if (source.schemaVersion !== 1 || source.season !== "2025-26") throw new Error("Dataset fasce d'attacco non valido");
if (source.profiles.length !== 36 || new Set(source.profiles.map(profile => profile.team)).size !== 36) throw new Error("Le fasce d'attacco devono contenere 36 squadre univoche");
for (const profile of source.profiles) if (!expected.has(profile.team)) throw new Error(`Squadra Champions inattesa: ${profile.team}`);
for (const team of expected) if (!source.profiles.some(profile => profile.team === team)) throw new Error(`Fasce d'attacco mancanti: ${team}`);

const profiles = source.profiles.map(profile => {
  if (!profile.counts) return { ...profile, attackChannels: null, dataQuality: "unavailable" };
  if (profile.counts.length !== 3 || profile.counts.some(value => !Number.isInteger(value) || value <= 0)) throw new Error(`${profile.team}: conteggi non validi`);
  if (!/^https:\/\/it\.whoscored\.com\//.test(profile.sourceUrl || "")) throw new Error(`${profile.team}: fonte WhoScored non valida`);
  const total = profile.counts.reduce((sum, value) => sum + value, 0);
  const values = profile.counts.map(value => round(value / total * 100));
  const keys = ["left", "central", "right"];
  const channels = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  channels.dominant = keys.sort((left, right) => channels[right] - channels[left])[0];
  return { ...profile, totalTouches: total, attackChannels: channels, dataQuality: profile.fallback ? "uefa-fallback" : "domestic" };
});

const output = {
  schemaVersion: source.schemaVersion,
  season: source.season,
  targetSeason: "2026-27",
  retrievedAt: source.retrievedAt,
  provider: source.provider,
  coverage: {
    teams: profiles.length,
    available: profiles.filter(profile => profile.attackChannels).length,
    unavailable: profiles.filter(profile => !profile.attackChannels).length,
    domestic: profiles.filter(profile => profile.dataQuality === "domestic").length,
    uefaFallback: profiles.filter(profile => profile.dataQuality === "uefa-fallback").length
  },
  profiles
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Fasce d'attacco Champions: ${output.coverage.available}/36 disponibili · ${output.coverage.unavailable} N/D · ${output.coverage.uefaFallback} fallback UEFA`);
