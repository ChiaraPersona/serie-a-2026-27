'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const {zonedLocalToUtc} = require('../../scripts/champions/complete-forecast-snapshots.js');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const optional = file => fs.existsSync(path.join(root, file)) ? read(file) : null;

function catalog(now = new Date()) {
  const domestic = read('data/teams/index.json').teams;
  const europe = read('data/normalized/champions-registered-squads-2026-27.json').teams;
  const champions = read('data/normalized/champions-league-2026-27.json');
  const fixtures = [];
  const append = (fixture, competition, teamIds) => {
    if (fixture.status !== 'scheduled' || !fixture.date || !fixture.kickoff) return;
    const kickoffAt = zonedLocalToUtc(fixture.date, fixture.kickoff, 'Europe/Rome');
    if (Date.parse(kickoffAt) <= now.getTime() || teamIds.some(id => !id)) return;
    fixtures.push({id: fixture.id, competition, matchday: fixture.matchday, date: fixture.date,
      kickoff: fixture.kickoff, kickoffAt, teamIds,
      label: teamIds.map(id => competition === 'serie-a' ? domestic.find(t => t.id === id)?.name : europe.find(t => t.id === id)?.team).join(' – '),
      canRecalculate: competition === 'champions' && [4, 5].includes(fixture.matchday)});
  };
  for (const f of read('data/normalized/matches.json')) if (f.competition === 'serie-a') append(f, 'serie-a', [f.homeTeam, f.awayTeam]);
  // Branding carries explicit canonical slugs; no approximate name matching.
  for (const f of champions.fixtures) append(f, 'champions', [f.homeTeam, f.awayTeam].map(name => {
    const brand = champions.teamBranding.find(t => t.team === name);
    return europe.find(t => String(t.uefaClubId) === String(brand?.uefaTeamId))?.id;
  }));
  return fixtures.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

function fixtureData(id, now) {
  const fixture = catalog(now).find(f => f.id === id);
  if (!fixture) throw Error('Partita non disponibile: iniziata, conclusa o identità non verificata.');
  let source, probable;
  if (fixture.competition === 'champions') {
    const md = String(fixture.matchday).padStart(2, '0');
    source = optional(`data/sources/champions-official-formations-md${md}-2026-27.json`);
    probable = optional(`data/sources/champions-probable-formations-md${md}-2026-27.json`);
  } else {
    source = read('data/sources/official-lineups-2026-27.json');
    const files = fs.readdirSync(path.join(root, 'data/sources')).filter(file => /^probable-lineups-md\d+-2026-27\.json$/.test(file))
      .filter(file => Number(file.match(/md(\d+)/)[1]) <= fixture.matchday)
      .sort((a, b) => Number(b.match(/md(\d+)/)[1]) - Number(a.match(/md(\d+)/)[1]));
    if (files[0]) probable = read(`data/sources/${files[0]}`);
  }
  const references = fixture.competition === 'champions' ? optional('data/generated/champions-lineup-references.json') : null;
  const registered = fixture.competition === 'champions' ? read('data/normalized/champions-registered-squads-2026-27.json').teams : null;
  const teams = fixture.teamIds.map((id, index) => {
    const team = registered ? registered.find(t => t.id === id) : read(`data/teams/${id}.json`);
    const official = registered ? source?.teams?.find(t => t.fixtureId === fixture.id && t.teamId === id && t.status === 'official') : source.fixtures.find(f => f.matchId === fixture.id)?.teams.find(t => t.teamId === id);
    let initial = official || probable?.teams?.find(t => t.fixtureId === fixture.id && t.teamId === id);
    let prefill = initial ? {kind: official ? 'official' : 'probable', matchday: fixture.matchday} : null;
    const knownEleven = entries => entries?.length === 11 && new Set(entries.map(p => p.registeredPlayerId || p.playerId || p.id)).size === 11
      && entries.every(p => (team.players || team.squad).some(known => known.id === (p.registeredPlayerId || p.playerId || p.id)));
    if (!initial && !registered) {
      const candidate = probable?.teams?.find(t => t.teamId === id);
      if (candidate && knownEleven(candidate.players.filter(p => p.lineupStatus === 'starter'))) {
        initial = {...candidate, players: candidate.players.filter(p => p.lineupStatus === 'starter'), bench: []};
        prefill = {kind: candidate.matchId === fixture.id || probable.matchday === fixture.matchday ? 'probable' : 'reference', matchday: probable.matchday};
      } else {
        const previous = source.fixtures.filter(f => f.date < fixture.date && f.teams.some(t => t.teamId === id && knownEleven(t.players))).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (previous) {initial = {...previous.teams.find(t => t.teamId === id), bench: []}; prefill = {kind: 'reference', date: previous.date, matchday: previous.matchday};}
      }
    }
    if (!initial && registered) {
      const previous = references?.records?.filter(r => r.teamId === id && r.date < fixture.date && knownEleven(r.players))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (previous) {initial = {...previous, players: previous.players.map(p => ({...p, playerId: p.id})), bench: []}; prefill = {kind: 'reference', date: previous.date};}
    }
    const players = (team.players || team.squad).map(p => ({id: p.id, name: p.name, role: p.position || p.role || 'N/D',
      providerPlayerId: p.providerIds?.espn ? String(p.providerIds.espn) : null,
      uefaPlayerId: p.uefaPlayerId ? String(p.uefaPlayerId) : null}));
    const ids = rows => (rows || []).map(p => p.registeredPlayerId || p.playerId).filter(Boolean);
    const unresolved = [...(initial?.starters || initial?.players || []), ...(initial?.bench || [])]
      .filter(p => !players.some(known => known.id === (p.registeredPlayerId || p.playerId)))
      .map(p => p.canonicalName || p.currentName || p.sourceName || 'Identità N/D');
    return {id, name: team.team || team.name, venue: index ? 'away' : 'home', players,
      starters: ids(initial?.starters || initial?.players), bench: ids(initial?.bench),
      unresolved, prefill, formation: initial?.formation || '4-3-3', status: official ? 'official' : 'probable'};
  });
  if (teams.some(t => t.unresolved.length)) fixture.canRecalculate = false;
  return {fixture, teams, revision: digest({fixture, teams, source, probable})};
}

function validate(input, now) {
  if (!input || typeof input.fixtureId !== 'string') throw Error('Scegli una partita.');
  const current = fixtureData(input.fixtureId, now);
  if (input.revision !== current.revision) throw Error('I dati sono cambiati. Ricarica la partita prima di salvare.');
  if (!['official', 'probable'].includes(input.status)) throw Error('Stato formazione non valido.');
  if (!Array.isArray(input.teams) || input.teams.length !== 2) throw Error('Servono entrambe le squadre.');
  if (new Set(input.teams.map(t => t.teamId)).size !== 2) throw Error('Squadre duplicate.');
  const teams = current.teams.map(team => {
    const entry = input.teams.find(t => t.teamId === team.id);
    if (!entry || !Array.isArray(entry.starters) || !Array.isArray(entry.bench)) throw Error('Compila titolari e panchina di entrambe le squadre.');
    if (entry.starters.length !== 11) throw Error(`${team.name}: seleziona esattamente 11 titolari.`);
    const all = [...entry.starters, ...entry.bench];
    if (all.some(id => typeof id !== 'string') || new Set(all).size !== all.length) throw Error(`${team.name}: giocatori duplicati o presenti anche in panchina.`);
    const players = all.map(id => team.players.find(p => p.id === id));
    if (players.some(p => !p)) throw Error(`${team.name}: giocatore non presente nella rosa canonica.`);
    if (typeof entry.formation !== 'string' || !/^\d(?:-\d){2,4}$/.test(entry.formation) || entry.formation.split('-').reduce((sum, n) => sum + Number(n), 0) !== 10) throw Error(`${team.name}: modulo non valido (esempio 4-3-3).`);
    if (typeof entry.benchConfirmed !== 'boolean') throw Error('Indica se la panchina è confermata.');
    if (input.status === 'probable' && team.status === 'official') throw Error(`${team.name}: una formazione ufficiale non può essere declassata a probabile.`);
    const removed = team.starters.filter(id => !entry.starters.includes(id));
    const added = entry.starters.filter(id => !team.starters.includes(id));
    return {teamId: team.id, team: team.name, venue: team.venue, formation: entry.formation,
      starters: entry.starters, bench: entry.bench, benchConfirmed: entry.benchConfirmed,
      changes: {removed, added}};
  });
  return {schemaVersion: 1, fixtureId: current.fixture.id, competition: current.fixture.competition,
    matchday: current.fixture.matchday, revision: current.revision, status: input.status, teams,
    note: typeof input.note === 'string' ? input.note.slice(0, 2000) : '',
    canRecalculate: current.fixture.canRecalculate, appliedToCanonical: false, published: false};
}

module.exports = {root, catalog, fixtureData, validate, digest};
