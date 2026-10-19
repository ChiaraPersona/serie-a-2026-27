"use strict";

const fs = require("fs");

const decode = value => {
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decode(child)]));
    }
    return value;
  }
  if (value.length !== 2 || !Number.isInteger(value[0])) return value.map(decode);
  const [type, payload] = value;
  if (type === 0) {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return Object.fromEntries(Object.entries(payload).map(([key, child]) => [key, decode(child)]));
    }
    return payload;
  }
  if (type === 1) return payload.map(decode);
  return payload;
};

const parseStatmuseGame = filePath => {
  const html = fs.readFileSync(filePath, "utf8");
  const match = html.match(/<astro-island[^>]+game-state[^>]+props="([^"]+)"/);
  if (!match) throw new Error("GameState props non trovate");
  const encoded = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return decode(JSON.parse(encoded));
};

module.exports = { parseStatmuseGame };

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(parseStatmuseGame(process.argv[2]), null, 2)}\n`);
}
