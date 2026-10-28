'use strict';
const { readJsonFile: storageReadJson } = require('../../sisal/dataset-store.cjs');
// Internal research preview only. No production builders or network requests.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const model = require('./tactical-prototype-model.cjs');
const {kickoff, instant, priorMatches} = require('./data');
const {aggregateDisciplinaryFeatures} = require('../../disciplinary-features');
const root = path.resolve(__dirname, '../../..');
const index = process.argv.indexOf('--matchday');
const matchday = index < 0 ? 8 : Number(process.argv[index + 1]);
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) throw Error('Giornata non valida');
const code = String(matchday).padStart(2, '0');
const generatedAt = new Date().toISOString();
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const protectedFiles = execFileSync('git', ['ls-files', '-z'], {cwd:root,maxBuffer:16*1024*1024}).toString().split('\0')
  .filter(f => f && (f.startsWith('js/') || f.startsWith('css/') || (f.endsWith('.html') && !f.startsWith('output/')) ||
    f.startsWith('scripts/predictions/') || ['scripts/build-predictions.js','scripts/build-betting-matchday.js',
      'data/normalized/predictions.json','data/normalized/schedina.json',`data/normalized/schedina-md${code}.json`,
      'data/normalized/odds/sisal/serie-a.json','data/normalized/official-starter-registry.json'].includes(f)))
  .filter(f => fs.existsSync(path.join(root, f)));
const before = Object.fromEntries(protectedFiles.map(f => [f,digest(f)]));
const inputs = {};
function read(file) { inputs[file] = {sha256:digest(file)}; return storageReadJson(path.join(root,file)); }
const matches = read('data/normalized/matches.json');
const predictions = read('data/normalized/predictions.json').predictions;
const probablePath = `data/sources/probable-lineups-md${matchday}-2026-27.json`;
const probable = read(probablePath), officialPath = 'data/sources/official-lineups-2026-27.json', official = read(officialPath);
const directory = read('data/teams/index.json').teams;
const registry = read('data/sources/player-identity-aliases-2026-27.json').players;
const styles = read('data/normalized/team-style-profiles.json').profiles;
const targetMatches = matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.matchday === matchday);
if (!targetMatches.length) throw Error('Nessuna fixture della giornata');
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
function channel(profile) {
  const ids = new Set([...(profile?.playingStyle||[]),...(profile?.strengths||[])].map(x=>x.id));
  const preferredSides = ['left','central','right'].filter((side,i)=>ids.has(['attaccano-dalla-sinistra','attaccano-al-centro','attaccano-dalla-destra'][i]));
  const broadWide = ids.has('giocano-in-ampiezza') || ids.has('attaccare-sulle-fasce');
  return { status:preferredSides.length||broadWide?'QUALITATIVE':'UNKNOWN', preferredSides, wide:broadWide,
    observedShares:null, observedActionVolume:null, season:profile?.characteristicsSeason||profile?.season||null,
    retrievedAt:profile?.retrievedAt||null,
    note:'Preferenza ricavata da etichette tattiche. Percentuali osservate e volume delle azioni N/D.' };
}
function teamFor(match, teamId, prediction, history) {
  const meta = directory.find(t=>t.id===teamId), offFixture = official.fixtures.find(f=>f.matchId===match.id);
  const off = offFixture?.teams.find(t=>t.teamId===teamId);
  const pro = probable.teams.find(t=>t.teamId===teamId&&t.matchId===match.id);
  const lineup = off || pro;
  if (!lineup) throw Error(`Formazione mancante: ${match.id}:${teamId}`);
  const entries = off ? lineup.players : lineup.players.filter(p=>p.lineupStatus==='starter');
  if (entries.length !== 11) throw Error(`Undici non valido: ${match.id}:${teamId}`);
  const squadPath = `data/generated/team-pages/${teamId}-squad.json`, squad = read(squadPath);
  const current = aggregateDisciplinaryFeatures(history, teamId, {asOfMatchdayExclusive:matchday,targetMatchId:match.id});
  const starters = new Set(entries.map(e=>e.playerId).filter(Boolean));
  if (starters.size !== entries.filter(e=>e.playerId).length) throw Error(`ID duplicati: ${match.id}:${teamId}`);
  const players = entries.map((entry,i) => {
    const id = entry.playerId || null, identity = id ? registry.find(p=>p.teamId===teamId&&p.playerId===id) : null;
    const roster = id ? squad.players.find(p=>p.id===id) : null;
    const sample = id ? current.find(p=>p.playerId===id) : null;
    const legacy = id ? prediction?.likelyBooked?.find(c=>c.teamId===teamId&&c.playerId===id) : null;
    const exposure = id ? prediction?.shooters?.allPlayers?.find(p=>p.playerId===id&&p.teamId===teamId) : null;
    const totals = roster?.previousSeason?.totals, per90 = totals?.per90;
    const detailedRole = entry.detailedRole || roster?.detailedRole || null;
    const player = { id, key:`${teamId}:${id||'unresolved-'+i}`, teamId, active:true,
      name:identity?.canonicalName||entry.currentName||roster?.name||entry.sourceName||'Identità N/D',
      role:entry.role||roster?.role||null, detailedRole,
      positionSource:entry.detailedRole?'FIXTURE_EXPLICIT':detailedRole?'ROSTER_HISTORICAL':'UNKNOWN',
      positionEvidence:entry.detailedRole?{fixtureId:match.id}:roster?.detailedRoleEvidence||null,
      positionAlternatives:(roster?.detailedRoleEvidence?.roles||[]).map(r=>r.role),
      lineupStatus:off?'official':'probable', expectedMinutes:number(exposure?.expectedMinutes),
      expectedMinutesStatus:exposure?'SERIALIZED_PROJECTION_NOT_VALIDATED_FOR_DUELS':'UNKNOWN',
      legacyCandidate:!!legacy, legacyRiskScore:legacy?.riskScore??null, legacyDirectOpponent:legacy?.directOpponent??null,
      current:{appearances:number(sample?.appearances),minutes:number(sample?.minutes),
        foulsCommittedPer90:number(sample?.foulsCommittedPer90),
        foulsWonPer90:sample?.minutes>0&&number(sample.foulsSuffered)!==null?sample.foulsSuffered*90/sample.minutes:null,
        yellowPer90:number(sample?.yellowPer90),coverage:sample?.disciplinaryCoverage?.status||'UNKNOWN',
        matchIds:(sample?.sources||[]).map(s=>s.matchId),
        foulsWonCoveredAppearances:sample?.foulsSufferedCoverage??0,
        causeOfCard:null,linkedDuelEvents:null},
      historical:{season:roster?.previousSeason?.season||squad.previousSeason?.season||'2025-26',
        competition:roster?.previousSeason?.competition||null,minutes:number(totals?.minutes),
        foulsCommittedPer90:number(per90?.foulsCommitted),foulsWonPer90:number(per90?.foulsWon),yellowPer90:number(per90?.yellowCards)},
      identityStatus:id?(roster||identity?'CANONICAL_JOIN':'CANONICAL_LINEUP_ONLY'):'UNRESOLVED',
      evidenceRefs:[{file:off?officialPath:probablePath,fixtureId:match.id,teamId,playerId:id},
        ...roster?[{file:squadPath,playerId:id}]:[]],
      calibratedProbability:null };
    return player;
  });
  return {id:teamId,name:meta?.name||teamId,formation:lineup.formation||null,players,
    lineupStatus:off?'official':'probable',lineupCapturedAt:off?instant(offFixture.retrievedAt):instant(probable.importedAt),
    positionWarning:'La XI conferma o propone i partecipanti; le posizioni storiche non certificano i compiti nella gara.',
    channel:channel(styles.find(s=>s.teamId===teamId))};
}
const fixtures = targetMatches.map(match => {
  const cut = kickoff(match);
  // MD boundary is stricter than chronology; current MD results never feed this preview.
  const history = priorMatches(matches,match).filter(m=>m.matchday<matchday);
  const prediction = predictions.find(p=>p.matchId===match.id);
  const teams = [match.homeTeam,match.awayTeam].map(id=>teamFor(match,id,prediction,history));
  const started = !cut || Date.parse(cut)<=Date.parse(generatedAt) || match.status!=='scheduled';
  return {id:match.id,date:match.date,kickoffAt:cut,status:match.status,teams,
    label:teams.map(t=>t.name).join(' – '), mode:started?'HISTORICAL_INSPECTION_NOT_PREMATCH':'CURRENT_PREMATCH_RESEARCH_PREVIEW',
    snapshotStatus:'NOT_FROZEN_NOT_TRAINING_DATA', availableAt:generatedAt,
    sourceTiming:teams.every(t=>t.lineupCapturedAt&&cut&&t.lineupCapturedAt<cut)?'LINEUP_CAPTURE_BEFORE_KICKOFF':'LINEUP_TIMING_UNVERIFIED',
    cutoff:{matchdayExclusive:matchday,targetMatchExcluded:match.id,historyMatchIds:history.map(m=>m.id)},
    limits:['Stima tattica da ruoli compatibili; compiti e marcature non confermati',
      'Nessun peso di duello, probabilità o contributo al punteggio pubblicato',
      'Timing di tutti i campi storici non certificato: non utilizzare come backtest']};
});
const counts={fixtures:fixtures.length,prospectivePreviews:fixtures.filter(f=>f.mode==='CURRENT_PREMATCH_RESEARCH_PREVIEW').length,
  historicalInspections:fixtures.filter(f=>f.mode==='HISTORICAL_INSPECTION_NOT_PREMATCH').length,players:0,legacyCandidates:0,
  playersWithCompatibleOpponents:0,legacyCandidatesWithCompatibleOpponents:0,unknownPositions:0,goalkeepers:0,interactions:0,roles:{}};
for (const f of fixtures) for(const [i,t] of f.teams.entries()) for(const p of t.players){
  const view=model.inspectPlayer(p,t,f.teams[1-i]);
  counts.players++;counts.legacyCandidates+=Number(p.legacyCandidate);
  counts.playersWithCompatibleOpponents+=Number(view.interactions.length>0);
  counts.legacyCandidatesWithCompatibleOpponents+=Number(p.legacyCandidate&&view.interactions.length>0);
  counts.unknownPositions+=Number(!view.positionState.group);
  counts.goalkeepers+=Number(view.positionState.group==='keeper');counts.interactions+=view.interactions.length;
  const role=p.role||'N/D';counts.roles[role]??={players:0,withCompatibleOpponents:0};
  counts.roles[role].players++;counts.roles[role].withCompatibleOpponents+=Number(view.interactions.length>0);
  for(const edge of view.interactions){
    if(!f.teams[1-i].players.some(o=>o.id===edge.opponentPlayerId&&o.active))throw Error('Avversario fuori XI');
    if([edge.exposureShare,edge.duelProbability,edge.cardProbability].some(v=>v!==null))throw Error('Probabilità inventata');
  }
  if(p.current.matchIds.some(id=>!f.cutoff.historyMatchIds.includes(id)||id===f.id))throw Error('Leakage della fixture');
}
const payload={schemaVersion:1,modelVersion:model.version,generatedAt,season:'2026-27',matchday,
  state:'INTERNAL_DISPOSABLE_RESEARCH_PROTOTYPE',question:'Quali confronti sono compatibili con i ruoli disponibili, includendo centrocampisti e attaccanti?',
  semantics:'Compatibility is not observed marking, predictive accuracy or probability',counts,fixtures,inputManifest:inputs};
const modelPath='scripts/research/cards/tactical-prototype-model.cjs';
const templatePath='scripts/research/cards/tactical-prototype.template.html';
payload.implementation={modelSha256:digest(modelPath),builderSha256:digest('scripts/research/cards/build-tactical-prototype.cjs'),templateSha256:digest(templatePath)};
const safeJSON=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const html=fs.readFileSync(path.join(root,templatePath),'utf8')
  .replace('/*__MODEL__*/',fs.readFileSync(path.join(root,modelPath),'utf8'))
  .replace('/*__DATA__*/',`const DATA = ${safeJSON};`)
  .replace('/*__PUBLIC_POLICY__*/',fs.readFileSync(path.join(root,'js/public-presentation.js'),'utf8'));
const dataFile=`data/analysis/card-prediction-research/tactical-prototype-md${code}.json`;
const reportFile=`output/reports/card-tactical-prototype-md${code}.html`;
const write=(file,content)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),content);};
write(dataFile,JSON.stringify(payload,null,2)+'\n');write(reportFile,html);
const changed=Object.entries(before).filter(([f,sha])=>digest(f)!==sha).map(([f])=>f);
const changedInputs=Object.entries(inputs).filter(([f,v])=>digest(f)!==v.sha256).map(([f])=>f);
const audit={state:changed.length||changedInputs.length?'EXTERNAL_CHANGE_DETECTED':'PASS',generatedAt,
  protectedFiles:Object.keys(before).length,inputFiles:Object.keys(inputs).length,changed,changedInputs,counts,
  validation:'IDs, opposing XI membership, null probabilities and target/future-match exclusion checked',
  note:'No fit, calibration, retrospective performance claim or production publication',
  files:before};
write(`output/reports/card-tactical-prototype-md${code}-audit.json`,JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({dataFile,reportFile,audit:audit.state,protectedFiles:audit.protectedFiles,counts},null,2));
if(changed.length||changedInputs.length)process.exitCode=1;
