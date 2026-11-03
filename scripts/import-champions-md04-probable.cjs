const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const { canonicalTeam } = require('./champions/current-season-offline');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f\uFEFF]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const roster = read('data/normalized/champions-registered-squads-2026-27.json');
const previous = read('data/sources/champions-probable-formations-md03-2026-27.json');
const stats = read('data/normalized/champions-player-stats-2026-27.json');
// Explicit aliases reviewed against existing canonical team rosters; no fuzzy matching.
const reviewed = { 'Atlético de Madrid': { Barrios: 'pablo-barrios', Llorente: 'marcos-llorente' }, 'Bodø/Glimt': { Ejven: 'hakon-evjen' }, 'Manchester United': { Mbuemo: 'bryan-mbeumo' } };
Object.assign(reviewed, { Liverpool: { Szobozslai: 'dominik-szoboszlai' }, 'Real Madrid': { 'Rüdıger': 'antonio-rudiger', Vinicius: 'vinicius-junior' }, 'Borussia Dortmund': { Gadou: 'kouakou-gadou' }, Viking: { 'Østbø': 'arild-stb', 'Bjørdal': 'henrik-rorvik-bjordal', Baertelsen: 'anders-baertelsen' }, Arsenal: { 'Ødegaard': 'martin-degaard' } });
const dateIndex = process.argv.indexOf('--date');
const date = dateIndex < 0 ? '2026-11-03' : process.argv[dateIndex + 1];
const fixtures = read('data/normalized/champions-league-2026-27.json').fixtures.filter(f => f.matchday === 4 && f.date === date);
const inputFile = process.argv.includes('--input') ? process.argv[process.argv.indexOf('--input') + 1] : 'data/sources/lineups/champions-md04-tuesday-user-2026-11-02.txt';
const input = fs.readFileSync(path.resolve(root, inputFile), 'utf8').replace(/\uFEFF/g, '');
const lines = input.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const teams = [], issues = [];
for (const f of fixtures) for (const venue of ['home', 'away']) {
  const rosterTeam = roster.teams.find(t => t.team === f[venue + 'Team']); assert(rosterTeam);
  const team = { ...rosterTeam, id: canonicalTeam(rosterTeam.id) };
  const start = lines.findIndex(l => l.startsWith(team.team + ':')); assert(start >= 0, team.team);
  const nextTeam = lines.findIndex((l,i) => i > start && roster.teams.some(t => l.startsWith(t.team + ':')));
  const block = lines.slice(start + 1, nextTeam < 0 ? lines.length : nextTeam);
  const old = previous.teams.find(t => t.team === team.team);
  function resolve(raw) {
    const m = raw.trim().match(/^(.*?)\s*(?:\(([^)]+)\))?$/); const label = m[1].trim(), key = norm(label);
    const aliases = old ? ['starters', 'bench', 'unavailable', 'suspended', 'doubtful'].flatMap(k => old[k] || []).filter(p => norm(p.sourceName || '') === key) : [];
    const explicitId = reviewed[team.team]?.[label];
    let candidates = explicitId ? team.players.filter(p => p.id === explicitId) : team.players.filter(p => norm(p.name) === key || aliases.some(a => a.playerId === p.id || a.registeredPlayerId === p.id));
    if (!candidates.length) candidates = team.players.filter(p => norm(p.name).endsWith(' ' + key));
    let registered = true;
    if (!candidates.length && ((team.team === 'Aston Villa' && label === 'Ruggeri') || (team.team === 'Roma' && label === 'Svilar'))) {
      const id = team.team === 'Roma' ? 'mile-svilar' : 'matteo-ruggeri';
      candidates = stats.teams.find(t => t.team === team.team).players.filter(p => p.id === id);
      registered = false;
    }
    if (candidates.length !== 1) { issues.push({ team: team.team, label, candidates: candidates.map(p => p.name) }); return { sourceName: label, playerId: null, reason: m[2] || null }; }
    const p = candidates[0];
    return { sourceName: label, canonicalName: p.name, playerId: p.id, registeredPlayerId: registered ? p.id : null, providerPlayerId: p.providerIds?.espn || p.providerPlayerId || null, stablePlayerId: team.id + ':' + p.id, uefaPlayerId: p.uefaPlayerId || null, uefaRole: p.position, reason: m[2] || null, identityStatus: registered ? 'reviewed-existing-team-roster' : 'existing-team-player-archive-not-in-current-registration' };
  }
  const starters = lines[start].slice(team.team.length + 1).split(/[;,]/).map(resolve);
  const category = prefix => { const line = block.find(l => l.startsWith(prefix + ':')); return !line || /:\s*nessuno$/.test(line) ? [] : line.slice(prefix.length + 1).split(',').filter(s => s.trim()).map(resolve); };
  const unavailableAll = category('Indisponibili');
  const unavailable = unavailableAll.filter(p => p.reason !== 'squalificato'), suspended = unavailableAll.filter(p => p.reason === 'squalificato');
  const doubtful = category('In dubbio'), caution = category('In diffida');
  const mentioned = new Set([...starters, ...unavailableAll, ...doubtful, ...caution].map(p => p.playerId).filter(Boolean));
  const bench = team.players.filter(p => !mentioned.has(p.id)).map(p => ({ sourceName: p.name, canonicalName: p.name, playerId: p.id, registeredPlayerId: p.id, providerPlayerId: p.providerIds?.espn || null, stablePlayerId: team.id + ':' + p.id, uefaPlayerId: p.uefaPlayerId || null, uefaRole: p.position, reason: null, identityStatus: 'existing-team-roster' }));
  teams.push({ fixtureId: f.id, venue, teamId: team.id, team: team.team, status: 'probable', rawLine: lines[start], sourceOrder: teams.length + 1, starters, unavailable, suspended, doubtful, caution, bench, benchStatus: 'predicted-user-rule-unmentioned-roster-members', formation: null });
}
console.log(JSON.stringify({ teams: teams.length, starters: teams.reduce((s,t) => s+t.starters.length,0), issues }, null, 2));
if (issues.length) process.exitCode = 1;
else if (process.argv.includes('--write')) {
  assert.equal(teams.length, 18); for (const t of teams) { assert.equal(t.starters.length, 11); assert.equal(new Set(t.starters.map(p => p.playerId)).size, 11); }
  const rawFile = inputFile;
  fs.mkdirSync(path.dirname(path.join(root, rawFile)), { recursive: true }); fs.writeFileSync(path.join(root, rawFile), input);
  const target = 'data/sources/champions-probable-formations-md04-2026-27.json';
  const existing = read(target), ids = new Set(fixtures.map(f => f.id));
  const merged = [...existing.teams.filter(t => !ids.has(t.fixtureId)), ...teams];
  fs.writeFileSync(path.join(root, target), JSON.stringify({ ...existing, source: { ...existing.source, consultedAt: new Date().toISOString(), rawFiles: [...new Set([...(existing.source.rawFiles || [existing.source.rawFile]), rawFile])], scope: 'Fixture-scoped user-provided probable XIs', benchPolicy: 'Unmentioned registered roster members are predicted bench; unavailable, suspended and doubtful remain separate.' }, teams: merged }, null, 2) + '\n');
}
