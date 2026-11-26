'use strict';
// Run the existing engines in a read-through copy. Never promote generated files.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {root, fixtureData} = require('./model.cjs');
const {summarize} = require('./report.cjs');
const id = process.argv[2];
if (!/^[a-f0-9-]{36}$/.test(id || '')) throw Error('Invalid draft ID');
const draft = JSON.parse(fs.readFileSync(path.join(root, 'output/lineup-admin/drafts', `${id}.json`), 'utf8'));
const current = fixtureData(draft.fixtureId);
if (current.revision !== draft.revision) throw Error('Dati cambiati dopo il salvataggio: ricaricare la partita.');
if (!current.fixture.canRecalculate) throw Error('Unsupported fixture pipeline');
const target = path.join(root, 'output/lineup-admin/runs', id);
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.mkdirSync(target, {recursive: false});
const copyCode = (source, destination) => fs.cpSync(source, destination, {recursive: true,
  filter: p => !p.includes('__pycache__') && !p.endsWith('.pyc')});
for (const dir of ['scripts', 'js', 'css']) copyCode(path.join(root, dir), path.join(target, dir));
fs.copyFileSync(path.join(root, 'package.json'), path.join(target, 'package.json'));
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) fs.copyFileSync(path.join(root, file), path.join(target, file));
fs.mkdirSync(path.join(target, 'data'), {recursive: true});
// The existing shared official policy also writes this historical audit.
fs.mkdirSync(path.join(target, 'output/champions-md02-settlement'), {recursive: true});
const md = String(draft.matchday).padStart(2, '0');
const relative = `data/sources/champions-${draft.status === 'official' ? 'official' : 'probable'}-formations-md${md}-2026-27.json`;
const source = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const registered = JSON.parse(fs.readFileSync(path.join(root, 'data/normalized/champions-registered-squads-2026-27.json'), 'utf8'));
const rows = draft.teams.map(team => {
  const roster = registered.teams.find(t => t.id === team.teamId);
  const old = source.teams.find(t => t.fixtureId === draft.fixtureId && t.teamId === team.teamId);
  const player = playerId => {
    const p = roster.players.find(p => p.id === playerId);
    if (!p) throw Error('Canonical player missing: ' + playerId);
    const existing = [...(old?.starters || []), ...(old?.bench || [])].find(p => (p.registeredPlayerId || p.playerId) === playerId);
    const rosterProvider = p.providerIds?.espn;
    if (rosterProvider && existing?.providerPlayerId && String(rosterProvider) !== String(existing.providerPlayerId)) throw Error(`Identità provider discordante per ${p.name}.`);
    const provider = rosterProvider || existing?.providerPlayerId || null;
    return {...existing, sourceName: p.name, canonicalName: p.name, playerId, registeredPlayerId: playerId,
      providerPlayerId: provider ? String(provider) : null, stablePlayerId: `${team.teamId}:${playerId}`,
      uefaPlayerId: p.uefaPlayerId ? String(p.uefaPlayerId) : null, uefaRole: p.position,
      identityStatus: 'exact-canonical-roster-id', reason: null};
  };
  if (!team.benchConfirmed) throw Error(`${team.team}: conferma la panchina prima del ricalcolo.`);
  return {...old, fixtureId: draft.fixtureId, teamId: team.teamId, team: team.team, venue: team.venue,
    rawLine: `${team.team}: ${team.starters.map(id => roster.players.find(p => p.id === id).name).join('; ')}`,
    status: draft.status, formation: team.formation, starters: team.starters.map(player), bench: team.bench.map(player),
    benchStatus: 'confirmed', source: {provider: 'local-admin', draftId: id, consultedAt: draft.createdAt, note: draft.note}};
});
source.teams = source.teams.filter(t => t.fixtureId !== draft.fixtureId).concat(rows);
source.status = draft.status;
source.source = {...source.source, provider: 'local-admin-staging', consultedAt: draft.createdAt, draftId: id};
const sourceTarget = path.join(target, relative);
fs.mkdirSync(path.dirname(sourceTarget), {recursive: true});
fs.writeFileSync(sourceTarget, JSON.stringify(source, null, 2));
const env = {...process.env, NODE_OPTIONS: `--require="${path.join(target, 'scripts/staging-inputs.cjs').replaceAll('\\', '/')}"`,
  PDF_STAGING_SOURCE: root, PDF_STAGING_ROOT: target, SPATIAL_CAPTURE_DISABLED: '1'};
const commands = [
  ['scripts/build-champions-md04.cjs', '--matchday', String(draft.matchday), '--fixtures', draft.fixtureId, ...(draft.status === 'official' ? ['--official'] : [])],
  ...(draft.status === 'official' ? [['scripts/apply-official-starter-policy.js']] : []),
  ['scripts/build-site.js', '--presentation-only', '--champions-pages-only', '--matchday', String(draft.matchday)]
];
const report = {fixtureId: draft.fixtureId, draftId: id, status: 'running', commands, completedCommands: 0,
  before: summarize(root, draft.fixtureId), promoted: false, published: false};
try {
  for (const args of commands) {execFileSync(process.execPath, args, {cwd: target, env, stdio: 'inherit', timeout: 600000, windowsHide: true}); report.completedCommands++;}
  report.status = 'completed';
  report.after = summarize(target, draft.fixtureId);
  const individualFile = `data/normalized/champions-md${md}-probable-individuals-2026-27.json`;
  const individuals = JSON.parse(fs.readFileSync(path.join(target, individualFile), 'utf8'));
  const fixture = individuals.fixtures.find(f => f.fixtureId === draft.fixtureId);
  report.teams = fixture?.teams.map(t => ({teamId: t.teamId, players: t.players.length,
    starters: t.players.filter(p => p.projectedRole === 'starter').length}));
  report.lineupChanges = draft.teams.map(t => ({team: t.team, ...t.changes}));
} catch (error) {report.status = 'failed'; report.error = error.message; process.exitCode = 1;}
fs.writeFileSync(path.join(target, 'lineup-admin-report.json'), JSON.stringify(report, null, 2));
