const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const outputFile = path.join(root, "data/sources/team-pages/wikimedia-player-photos.json");
const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const dryRun = args.includes("--dry-run");
const downloadOnly = args.includes("--download-only");
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const onlyTeam = option("--team");
const limit = Number(option("--limit")) || Infinity;
const retrievedAt = new Date().toISOString().slice(0, 10);
const apiHeaders = {
  "User-Agent": "SerieA2026-27/1.0 (static-site photo importer; Wikimedia Commons attribution preserved)"
};

const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalized = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .toLocaleLowerCase("en");
const stripHtml = value => String(value?.value || value || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, " ")
  .trim();
const footballDescription = value => /football|soccer|calciator|futbol|fussball/i.test(value || "");

async function requestJson(url, attempt = 0) {
  let response;
  try {
    response = await fetch(url, { headers: apiHeaders, signal: AbortSignal.timeout(15000) });
  } catch (error) {
    if (attempt < 4) {
      await sleep(800 * (2 ** attempt));
      return requestJson(url, attempt + 1);
    }
    throw error;
  }
  if (response.status === 429 && attempt < 7) {
    const retryAfter = Number(response.headers.get("retry-after")) * 1000;
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5000 * (attempt + 1));
    return requestJson(url, attempt + 1);
  }
  if (response.status >= 500 && attempt < 4) {
    await sleep(800 * (2 ** attempt));
    return requestJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function wikidataUrl(params) {
  const query = new URLSearchParams({ origin: "*", format: "json", ...params });
  return `https://www.wikidata.org/w/api.php?${query}`;
}

function commonsUrl(params) {
  const query = new URLSearchParams({ origin: "*", format: "json", ...params });
  return `https://commons.wikimedia.org/w/api.php?${query}`;
}

async function loadWikidataByEspnId(players) {
  const matches = new Map();
  for (let index = 0; index < players.length; index += 150) {
    const batch = players.slice(index, index + 150);
    const values = batch.map(player => `"${String(player.espnId).replace(/["\\]/g, "")}"`).join(" ");
    const query = `SELECT ?item ?espn ?image ?birth WHERE {
      VALUES ?espn { ${values} }
      ?item wdt:P3681 ?espn;
            wdt:P18 ?image.
      OPTIONAL { ?item wdt:P569 ?birth. }
    }`;
    const url = `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: "json" })}`;
    const payload = await requestJson(url);
    for (const row of payload.results?.bindings || []) {
      const espnId = row.espn?.value;
      const imageUrl = row.image?.value;
      if (!espnId || !imageUrl) continue;
      const fileName = decodeURIComponent(imageUrl.split("/Special:FilePath/")[1] || "").replaceAll("_", " ");
      if (!fileName) continue;
      const candidate = {
        wikidataId: row.item?.value?.split("/").at(-1) || null,
        fileName,
        birthDate: row.birth?.value?.slice(0, 10) || null
      };
      if (!matches.has(espnId)) matches.set(espnId, []);
      matches.get(espnId).push(candidate);
    }
  }
  return matches;
}

async function loadWikidataByName(players) {
  const matches = new Map();
  for (let index = 0; index < players.length; index += 20) {
    const batch = players.slice(index, index + 20);
    const values = [...new Set(batch.map(player => player.name))]
      .flatMap(name => {
        const escaped = String(name).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        return [`("${escaped}" "${escaped}"@en)`, `("${escaped}" "${escaped}"@it)`];
      })
      .join(" ");
    const query = `SELECT ?target ?item ?image ?birth WHERE {
      VALUES (?target ?label) { ${values} }
      ?item rdfs:label ?label;
            wdt:P18 ?image;
            wdt:P106 ?occupation.
      VALUES ?occupation { wd:Q937857 wd:Q18536342 wd:Q902628 }
      OPTIONAL { ?item wdt:P569 ?birth. }
    }`;
    const url = `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: "json" })}`;
    const payload = await requestJson(url);
    for (const row of payload.results?.bindings || []) {
      const target = normalized(row.target?.value);
      const imageUrl = row.image?.value;
      if (!target || !imageUrl) continue;
      const fileName = decodeURIComponent(imageUrl.split("/Special:FilePath/")[1] || "").replaceAll("_", " ");
      if (!fileName) continue;
      const candidate = {
        wikidataId: row.item?.value?.split("/").at(-1) || null,
        fileName,
        birthDate: row.birth?.value?.slice(0, 10) || null
      };
      if (!matches.has(target)) matches.set(target, []);
      if (!matches.get(target).some(item => item.wikidataId === candidate.wikidataId && item.fileName === candidate.fileName)) {
        matches.get(target).push(candidate);
      }
    }
  }
  return matches;
}

function resolveEspnMatch(player, candidates) {
  if (!candidates.length) return { status: "unresolved", reason: "no-wikidata-image-for-espn-id" };
  const birthMatches = candidates.filter(candidate => player.dateOfBirth && candidate.birthDate === player.dateOfBirth);
  if (birthMatches.length === 1) return { status: "matched", ...birthMatches[0], matchMethod: "wikidata-espn-id-and-birth-date" };
  if (candidates.length === 1) return { status: "matched", ...candidates[0], matchMethod: "wikidata-espn-id" };
  return { status: "unresolved", reason: "ambiguous-wikidata-espn-id", candidates: candidates.map(item => item.wikidataId) };
}

function resolveNameMatch(player, candidates) {
  const plausible = candidates.filter(candidate =>
    !player.dateOfBirth || !candidate.birthDate || player.dateOfBirth === candidate.birthDate
  );
  if (!plausible.length) return { status: "unresolved", reason: "no-exact-footballer-name-image" };
  const birthMatches = plausible.filter(candidate => player.dateOfBirth && candidate.birthDate === player.dateOfBirth);
  if (birthMatches.length === 1) return { status: "matched", ...birthMatches[0], matchMethod: "exact-footballer-name-and-birth-date" };
  if (plausible.length === 1) return { status: "matched", ...plausible[0], matchMethod: "unique-exact-footballer-name" };
  return { status: "unresolved", reason: "ambiguous-exact-footballer-name", candidates: plausible.map(item => item.wikidataId) };
}

function claimValue(entity, property) {
  return entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

function claimDate(entity) {
  const time = claimValue(entity, "P569")?.time;
  return typeof time === "string" ? time.replace(/^\+/, "").slice(0, 10) : null;
}

async function searchPlayer(player) {
  const search = await requestJson(wikidataUrl({
    action: "wbsearchentities",
    search: player.name,
    language: "en",
    uselang: "en",
    type: "item",
    limit: "10"
  }));
  const playerName = normalized(player.name);
  const exact = (search.search || []).filter(item =>
    normalized(item.label) === playerName || normalized(item.match?.text) === playerName
  );
  return exact.length
    ? { status: "candidates", candidates: exact }
    : { status: "unresolved", reason: "no-exact-name-candidate" };
}

async function loadWikidataEntities(ids) {
  const entities = new Map();
  for (let index = 0; index < ids.length; index += 50) {
    const payload = await requestJson(wikidataUrl({
      action: "wbgetentities",
      ids: ids.slice(index, index + 50).join("|"),
      props: "claims|labels|descriptions",
      languages: "en|it"
    }));
    for (const [id, entity] of Object.entries(payload.entities || {})) entities.set(id, entity);
  }
  return entities;
}

function resolveCandidates(player, exact, entities) {
  const playerName = normalized(player.name);
  const candidates = exact.map(item => {
    const entity = entities.get(item.id);
    const description = entity?.descriptions?.en?.value || entity?.descriptions?.it?.value || item.description || "";
    const birthDate = claimDate(entity);
    const fileName = claimValue(entity, "P18");
    const birthMismatch = Boolean(player.dateOfBirth && birthDate && player.dateOfBirth !== birthDate);
    const score = (player.dateOfBirth && birthDate === player.dateOfBirth ? 100 : 0)
      + (normalized(entity?.labels?.en?.value || entity?.labels?.it?.value || item.label) === playerName ? 20 : 0)
      + (footballDescription(description) ? 10 : 0)
      + (fileName ? 10 : 0);
    return { wikidataId: item.id, description, birthDate, fileName, birthMismatch, score };
  }).filter(candidate => candidate.fileName && footballDescription(candidate.description) && !candidate.birthMismatch)
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) return { status: "unresolved", reason: "no-footballer-image-candidate" };
  const birthMatches = candidates.filter(candidate => player.dateOfBirth && candidate.birthDate === player.dateOfBirth);
  if (birthMatches.length === 1) return { status: "matched", ...birthMatches[0], matchMethod: "exact-name-and-birth-date" };
  if (birthMatches.length > 1) return { status: "unresolved", reason: "ambiguous-birth-date-match", candidates: birthMatches.map(item => item.wikidataId) };
  if (candidates.length === 1) return { status: "matched", ...candidates[0], matchMethod: "unique-exact-footballer-name" };
  return { status: "unresolved", reason: "ambiguous-exact-name", candidates: candidates.map(item => item.wikidataId) };
}

async function mapConcurrent(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { ...items[index], status: "error", reason: error.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function loadCommonsMetadata(fileNames) {
  const metadata = new Map();
  for (let index = 0; index < fileNames.length; index += 20) {
    const batch = fileNames.slice(index, index + 20);
    if (index) await sleep(1200);
    const payload = await requestJson(commonsUrl({
      action: "query",
      titles: batch.map(fileName => `File:${fileName}`).join("|"),
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "360"
    }));
    for (const page of Object.values(payload.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      metadata.set(page.title.replace(/^File:/, ""), {
        pageTitle: page.title,
        originalUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        descriptionUrl: info.descriptionurl,
        mime: info.thumbmime || info.mime,
        license: stripHtml(info.extmetadata?.LicenseShortName) || null,
        licenseUrl: stripHtml(info.extmetadata?.LicenseUrl) || null,
        artist: stripHtml(info.extmetadata?.Artist) || "Autore indicato su Wikimedia Commons",
        credit: stripHtml(info.extmetadata?.Credit) || null
      });
    }
  }
  return metadata;
}

function extensionFor(metadata) {
  if (metadata.mime === "image/png") return ".png";
  if (metadata.mime === "image/webp") return ".webp";
  if (metadata.mime === "image/gif") return ".gif";
  return ".jpg";
}

async function download(entry, metadata, attempt = 0) {
  const relativePath = path.posix.join("assets/images/players/wikimedia", entry.teamId, `${entry.playerId}${extensionFor(metadata)}`);
  const target = path.join(root, ...relativePath.split("/"));
  if (!refresh && fs.existsSync(target)) return relativePath;
  await sleep(250);
  let response;
  try {
    response = await fetch(metadata.thumbnailUrl, { headers: apiHeaders, signal: AbortSignal.timeout(20000) });
  } catch (error) {
    throw error;
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${metadata.thumbnailUrl}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length) throw new Error(`Immagine vuota: ${metadata.thumbnailUrl}`);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  }
  return relativePath;
}

async function main() {
  const teamFiles = fs.readdirSync(path.join(root, "data/generated/team-pages"))
    .filter(name => name.endsWith("-squad.json"))
    .sort();
  const allPlayers = teamFiles.flatMap(name => {
    const teamId = name.replace(/-squad\.json$/, "");
    if (onlyTeam && teamId !== onlyTeam) return [];
    return read(path.join(root, "data/generated/team-pages", name)).players.map(player => ({
      teamId,
      playerId: player.id,
      name: player.name,
      dateOfBirth: player.dateOfBirth || null,
      espnId: player.providerIds?.espn ? String(player.providerIds.espn) : null
    }));
  });
  const previous = fs.existsSync(outputFile) ? read(outputFile) : { entries: [] };
  if (downloadOnly) {
    if (!previous.entries?.length) throw new Error("Esegui prima l'importazione Wikimedia per creare la mappa delle foto.");
    const pendingDownloads = previous.entries.filter(entry =>
      !entry.localPath || !fs.existsSync(path.join(root, ...entry.localPath.split("/")))
    );
    console.log(`Wikimedia download-only: ${pendingDownloads.length} foto da localizzare.`);
    let completed = 0;
    let lastReported = 0;
    for (const entry of pendingDownloads) {
      const lowerName = entry.fileName.toLocaleLowerCase("en");
      const mime = lowerName.endsWith(".png") ? "image/png" : lowerName.endsWith(".gif") ? "image/gif" : "image/jpeg";
      try {
        entry.localPath = await download(entry, { thumbnailUrl: entry.thumbnailUrl, mime });
        entry.delivery = "local";
        delete entry.downloadError;
        completed++;
      } catch (error) {
        entry.delivery = "remote-fallback";
        entry.downloadError = error.message;
      }
      await sleep(1500);
      if (completed >= lastReported + 20) {
        lastReported = completed;
        previous.summary.localPhotos = previous.entries.filter(item => item.localPath).length;
        previous.summary.remoteFallbacks = previous.entries.length - previous.summary.localPhotos;
        write(outputFile, previous);
        console.log(`Localizzate ${previous.summary.localPhotos}/${previous.entries.length} foto.`);
      }
    }
    previous.summary.localPhotos = previous.entries.filter(entry => entry.localPath).length;
    previous.summary.remoteFallbacks = previous.entries.length - previous.summary.localPhotos;
    previous.retrievedAt = retrievedAt;
    if (!dryRun) write(outputFile, previous);
    console.log(`Wikimedia download-only: ${previous.summary.localPhotos}/${previous.entries.length} foto locali.`);
    return;
  }
  const previousByKey = new Map((previous.entries || []).map(entry => [`${entry.teamId}:${entry.playerId}`, entry]));
  const reusable = refresh ? [] : allPlayers.filter(player => {
    const entry = previousByKey.get(`${player.teamId}:${player.playerId}`);
    return entry?.status === "matched" && entry.localPath && fs.existsSync(path.join(root, ...entry.localPath.split("/")));
  });
  const reusableKeys = new Set(reusable.map(player => `${player.teamId}:${player.playerId}`));
  const pending = allPlayers.filter(player => !reusableKeys.has(`${player.teamId}:${player.playerId}`)).slice(0, limit);

  console.log(`Wikimedia: ${allPlayers.length} calciatori, ${reusable.length} foto riutilizzate, ${pending.length} da cercare.`);
  const withEspnId = pending.filter(player => player.espnId);
  const byEspnId = await loadWikidataByEspnId(withEspnId);
  const byName = await loadWikidataByName(pending);
  const resolutions = pending.map(player => {
    const idResolution = player.espnId
      ? resolveEspnMatch(player, byEspnId.get(player.espnId) || [])
      : { status: "unresolved" };
    const resolution = idResolution.status === "matched"
      ? idResolution
      : resolveNameMatch(player, byName.get(normalized(player.name)) || []);
    return { ...player, ...resolution };
  });
  console.log(`Wikidata: ${resolutions.filter(item => item.status === "matched").length}/${pending.length} immagini associate.`);

  const matched = resolutions.filter(item => item.status === "matched");
  const commonsMetadata = await loadCommonsMetadata([...new Set(matched.map(item => item.fileName))]);
  const downloaded = await mapConcurrent(matched, async item => {
    const metadata = commonsMetadata.get(item.fileName);
    if (!metadata) return { ...item, status: "error", reason: "commons-imageinfo-missing" };
    const baseEntry = {
      teamId: item.teamId,
      playerId: item.playerId,
      name: item.name,
      status: "matched",
      matchMethod: item.matchMethod,
      wikidataId: item.wikidataId,
      fileName: item.fileName,
      pageTitle: metadata.pageTitle,
      descriptionUrl: metadata.descriptionUrl,
      originalUrl: metadata.originalUrl,
      thumbnailUrl: metadata.thumbnailUrl,
      license: metadata.license,
      licenseUrl: metadata.licenseUrl,
      artist: metadata.artist,
      credit: metadata.credit,
      retrievedAt
    };
    try {
      const localPath = await download(item, metadata);
      return { ...baseEntry, localPath, delivery: "local" };
    } catch (error) {
      return { ...baseEntry, localPath: null, delivery: "remote-fallback", downloadError: error.message };
    }
  }, 4);

  const reusedEntries = reusable.map(player => previousByKey.get(`${player.teamId}:${player.playerId}`));
  const processedKeys = new Set(pending.map(player => `${player.teamId}:${player.playerId}`));
  const untouchedEntries = (previous.entries || []).filter(entry =>
    allPlayers.some(player => player.teamId === entry.teamId && player.playerId === entry.playerId)
    && !processedKeys.has(`${entry.teamId}:${entry.playerId}`)
    && !reusableKeys.has(`${entry.teamId}:${entry.playerId}`)
  );
  const entries = [...reusedEntries, ...untouchedEntries, ...downloaded.filter(item => item.status === "matched")]
    .sort((left, right) => left.teamId.localeCompare(right.teamId) || left.name.localeCompare(right.name, "it"));
  const unresolved = [
    ...resolutions.filter(item => item.status !== "matched"),
    ...downloaded.filter(item => item.status !== "matched")
  ]
    .map(({ teamId, playerId, name, status, reason, candidates }) => ({ teamId, playerId, name, status, reason, candidates: candidates || [] }));
  const output = {
    schemaVersion: 1,
    provider: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/w/api.php",
    retrievedAt,
    methodology: "Ricerca Wikidata per nome esatto; priorità alla data di nascita; immagini e licenze recuperate tramite imageinfo di Wikimedia Commons. I casi ambigui restano esclusi.",
    summary: {
      playersInScope: allPlayers.length,
      matchedPhotos: entries.length,
      localPhotos: entries.filter(entry => entry.localPath).length,
      remoteFallbacks: entries.filter(entry => !entry.localPath).length,
      unresolvedInLastRun: unresolved.length,
      dryRun
    },
    entries,
    unresolved
  };
  if (!dryRun) write(outputFile, output);
  console.log(`Wikimedia: ${entries.length}/${allPlayers.length} foto disponibili, ${entries.filter(entry => entry.localPath).length} locali; ${unresolved.length} casi non associati.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
