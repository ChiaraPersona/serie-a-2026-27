'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {parseProfile}=require('./import-champions-referee-history');
const {recentRows,summary,seasons}=require('./champions/referee-profile-data.cjs');
const {zonedLocalToUtc}=require('./champions/complete-forecast-snapshots');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifestPath='data/raw/champions-referees/md03-2026-10-20/manifest.json';
const outputPath='data/normalized/champions-referee-dataset-md03-2026-27.json';
function build(){
 const manifest=read(manifestPath),calendar=read('data/normalized/champions-league-2026-27.json');
 const fixtures=manifest.map(m=>{
  const fixture=calendar.fixtures.find(f=>f.id===m.fixtureId);assert.equal(fixture.matchday,3);
  const cutoff=zonedLocalToUtc(fixture.date,fixture.kickoff,'Europe/Rome');
  assert(Date.parse(m.retrievedAt)<Date.parse(cutoff));assert.equal(m.status,'DOWNLOADED');
  const html=zlib.gunzipSync(fs.readFileSync(m.file)).toString();
  assert.equal(crypto.createHash('sha256').update(html).digest('hex'),m.sha256);
  const profile=parseProfile({id:m.refereeId,name:m.name,providers:{footymetrics:{id:m.providerId,name:m.providerName,url:m.url}}},html);
  const samples=seasons(html),recent=recentRows(html,cutoff);
  assert(samples.length>0);assert(recent.length>0);
  const unique=new Set(samples.map(s=>s.providerRecordId));assert.equal(unique.size,samples.length);
  const matchSum=samples.reduce((n,s)=>n+s.matches,0);
  const champions=samples.filter(s=>s.competitionId===2);
  return {fixtureId:fixture.id,fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,date:fixture.date,kickoff:fixture.kickoff,
   refereeId:m.refereeId,name:m.name,providerName:m.providerName,source:m,cutoff,
   career:profile.career,seasonCompetitionSamples:samples,
   champions:{current:champions.filter(s=>s.season==='2026/2027'||s.season==='2026/27'),historical:champions.filter(s=>!['2026/2027','2026/27'].includes(s.season))},
   recent:{all:recent,last10:summary(recent.slice(0,10)),last5:summary(recent.slice(0,5)),eventTimeCutoffVerified:true},
   quality:{careerMatches:profile.career.matches,seasonCompetitionMatches:matchSum,countsAgree:matchSum===profile.career.matches,
    aggregateCutoffCertified:false,aggregateCutoffReason:'Aggregates are captured before target kickoff but complete dated career match logs are not exposed; recent rows have exact timestamps.',
    redCardDefinition:'Provider red cards; direct reds and second-yellow dismissals not separable',
    crossSourceVerified:false,modelUsage:'INPUT_PREPARATION_NOT_AUTOMATIC_ACTIVATION'},
   serieAModelCompatibility:{bookingFunction:'scripts/predictions/engine.js#bookingCandidates',refereeFunction:'scripts/predictions/engine.js#refereeCardFactor',
    outputSemantics:'COMPARATIVE_HEURISTIC_NOT_PROBABILITY',calibratedProbability:null,
    refereeProfileFields:['matches','yellowCardsPerMatch','foulsPerMatch'],leagueAverageFields:['yellowCardsPerMatch','foulsPerMatch'],
    activationBlockers:['COMPARABLE_CHAMPIONS_REFERENCE_AVERAGE_REQUIRED','AGGREGATE_CUTOFF_NOT_FULLY_CERTIFIED',...(matchSum!==profile.career.matches?['PROVIDER_AGGREGATE_COUNTS_DISAGREE']:[])],
    noSerieAAverageTransferred:true,formulasChanged:false}};
 });
 assert.equal(new Set(fixtures.map(f=>f.fixtureId)).size,fixtures.length);
 const output={schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,asOf:'2026-10-20',manifestPath,
  policy:{sourcesInternal:true,scope:'MD3_NOT_STARTED_AT_CAPTURE',historicForecastsUnchanged:true,missingValues:null,seasonAndCompetitionKeptSeparate:true},
  summary:{fixtures:fixtures.length,referees:fixtures.length,withYellowAndFoulCareer:fixtures.filter(f=>Number.isFinite(f.career.yellowCards.perMatch)&&Number.isFinite(f.career.fouls.perMatch)).length,
   withLast10:fixtures.filter(f=>f.recent.last10.matches===10).length,datedRecentMatches:fixtures.reduce((n,f)=>n+f.recent.all.length,0),seasonCompetitionSamples:fixtures.reduce((n,f)=>n+f.seasonCompetitionSamples.length,0),
   withCurrentChampionsSample:fixtures.filter(f=>f.champions.current.length).length,providerCountAnomalies:fixtures.filter(f=>!f.quality.countsAgree).map(f=>({referee:f.name,careerMatches:f.quality.careerMatches,seasonCompetitionMatches:f.quality.seasonCompetitionMatches}))},fixtures};
 fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
 const reportDir='output/champions-md3-referee-recovery';fs.mkdirSync(reportDir,{recursive:true});
 const rows=fixtures.map(f=>`| ${f.fixture} | ${f.name} | ${f.career.matches} | ${f.career.yellowCards.perMatch} | ${f.career.fouls.perMatch} | ${f.recent.last10.matches}/10 |`);
 fs.writeFileSync(reportDir+'/REPORT.md',`# Recupero arbitri Champions - sola terza giornata\n\n${JSON.stringify(output.summary)}\n\n| Partita | Arbitro | Gare storico provider | Gialli/gara storico | Falli/gara storico | Ultime 10 datate |\n|---|---|---:|---:|---:|---:|\n${rows.join('\n')}\n\nLe medie storico provider combinano competizioni: sono descrittive. Le righe stagione/competizione sono conservate separatamente nel dataset. Le ultime gare sono filtrate sul timestamp esatto precedente al calcio d'inizio. Il cutoff dell'intero aggregato e il confronto indipendente non sono certificati. I rossi diretti e le seconde ammonizioni non sono separabili nel provider.\n\nModello Serie A verificato: bookingCandidates restituisce un indice comparativo (calibratedProbability=null), con refereeCardFactor che richiede un riferimento omogeneo di gialli e falli. Non viene usata la media Serie A come media Champions. Nessuna modifica a formule, pesi, pronostici o pagine. Il presente aggiornamento completa il recupero dati preliminare; non attiva probabilità disciplinari né mercati con quote incompatibili.\n`);
 console.log(output.summary);return output;
}
module.exports={build};if(require.main===module)build();
