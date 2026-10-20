'use strict';
const fs=require('fs'),zlib=require('zlib'),assert=require('assert/strict');
const {collectEspnRows,aggregateEntries,totals}=require('./build-champions-player-stats');
const {teamData}=require('./recover-champions-fotmob-matches.cjs');
const gz=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const roster=gz('data/raw/champions-season-shots/2026-10-20/rosters/porto.json.gz');
const espn=roster.payload.athletes.find(p=>p.id==='364815');
assert.equal(espn.fullName,'Samu Aghehowa');assert(espn.dateOfBirth.startsWith('2004-05-05'));
const fotmobRaw=gz('data/raw/champions-season-shots/2026-10-20/fotmob/teams/porto.json.gz');
const fotmob=teamData(fotmobRaw).squad.squad.flatMap(g=>g.members||[]).find(p=>p.id===1414859);
assert.equal(fotmob.name,'Samuel Aghehowa');assert.equal(fotmob.shirtNumber,9);assert.equal(fotmob.ccode,'ESP');
const history=collectEspnRows({season:'2025-26'}),rows=history.matchesByAthlete.get('364815')||[];
const entries=aggregateEntries('364815','forward',rows),previousSeason={season:'2025/26',entries,totals:totals(entries),totalsByCompetition:entries};
assert(previousSeason.totals.minutes>0);
const correction={teamId:'porto',playerId:'samu',registeredPlayerId:'samu',shirtNumber:9,canonicalName:'Samu Aghehowa',role:'forward',position:'forward',providerPlayerId:'364815',fotmobPlayerId:'1414859',uefaPlayerId:'250186228',rejectedProviderPlayerId:'206714',previousSeason,
 evidence:{method:'EXACT_PROFILE_DOB_TEAM_SHIRT_AND_PROVIDER_IDS',birthDate:'2004-05-05',direttaUrl:'https://www.diretta.it/giocatore/omorodion-samu/6uOlanff',direttaProfile:{team:'FC Porto',nationality:'Spagna',birthDate:'05.05.2004',role:'Attaccante'},espnRoster:{path:'data/raw/champions-season-shots/2026-10-20/rosters/porto.json.gz',url:roster.url},fotmobRoster:{path:'data/raw/champions-season-shots/2026-10-20/fotmob/teams/porto.json.gz',url:fotmobRaw.url},historyAppearances:rows.length}};
fs.writeFileSync('data/sources/champions-md03-identity-corrections-2026-10-20.json',JSON.stringify({scope:'SEVEN_OFFICIAL_FIXTURES_ONLY',corrections:[correction]},null,2)+'\n');
console.log(JSON.stringify({playerId:correction.playerId,correctedProviderId:correction.providerPlayerId,previousSeasonMinutes:previousSeason.totals.minutes}));
