'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='data/raw/european-recent-results/xg';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const unpack=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,p))));
// Explicit canonical/calendar identities; aliases below are exact calendar labels.
const ids={'real-madrid':8633,inter:8636,napoli:9875,arsenal:9825,fenerbahce:8695,roma:8686,como:10171,leipzig:178475,'club-brugge':8342,villarreal:10205,feyenoord:10235,'slovan-bratislava':6019,'bodo-glimt':8402,'manchester-united':10260,'shakhtar-donetsk':9728,porto:9773,lens:8588,milan:8564,Benfica:9772,Salisburgo:10013,Bournemouth:8678,Ferencaros:8222,juventus:9885,'Nec Nijmegen':8464,'Celta Vigo':9910,Rennes:9851,'Az Alkmaar':10229,atalanta:8524,Pafos:2137,Ajax:8593,'Kairat Almaty':8037};
const leagues={'champions-league':42,'europa-league':73,'conference-league':10216};
function project(raw,fixture,calendar){
 const d=raw.payload,g=d.general;assert.equal(String(g.matchId),String(calendar.id));assert(g.finished);
 assert.equal(g.matchTimeUTCDate.slice(0,10),fixture.date);
 assert.equal(Number(g.parentLeagueId||g.leagueId),leagues[fixture.competition]);
 const stats=(d.content?.stats?.Periods?.All?.stats||[]).flatMap(s=>s.stats||[]);
 const output={};
 for(const [side,i]of [['home',0],['away',1]]){
  assert.equal(String(g[side+'Team'].id),String(ids[fixture[side+'Team']]));
  assert.equal(String(calendar[side].id),String(ids[fixture[side+'Team']]));
  assert.equal(String(d.header.teams[i].id),String(ids[fixture[side+'Team']]));
  assert.equal(d.header.teams[i].score,fixture.score[side]);
  const values=stats.filter(s=>s.key==='expected_goals').map(s=>s.rawStats?.[i]?.value).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
  if(!values.length)output[side]=null;
  else{assert.equal(new Set(values).size,1,'Conflicting xG totals');output[side]=values[0];}
 }
 return output;
}
function build(){
 const history=require('./build-serie-a-team-history.cjs');
 const fixtures=history.europeanFixtures(read('data/normalized/teams.json'),read('data/normalized/champions-league-2026-27.json'),history.loadEuropeanResults());
 const entries=[],missing=[];
 for(const fixture of fixtures){
  const leagueId=leagues[fixture.competition],calendarRaw=unpack(`${base}/league-${leagueId}.json.gz`),d=calendarRaw.payload;
  const candidates=(d.fixtures?.allMatches||d.matches?.allMatches||[]).filter(m=>m.status.finished&&m.status.utcTime.slice(0,10)===fixture.date&&String(m.home.id)===String(ids[fixture.homeTeam])&&String(m.away.id)===String(ids[fixture.awayTeam]));
  if(candidates.length!==1){missing.push({fixtureId:fixture.id,reason:'CALENDAR_IDENTITY_NOT_UNIQUE'});continue;}
  const c=candidates[0],rawPath=`${base}/${c.id}.json.gz`;
  if(!fs.existsSync(path.join(root,rawPath))){missing.push({fixtureId:fixture.id,reason:'MISSING_RAW'});continue;}
  const raw=unpack(rawPath),expectedGoals=project(raw,fixture,c);
  entries.push({fixtureId:fixture.id,date:fixture.date,competition:fixture.competition,providerMatchId:String(c.id),providerTeamIds:{home:ids[fixture.homeTeam],away:ids[fixture.awayTeam]},expectedGoals,source:{provider:'FotMob',url:raw.url,retrievedAt:raw.retrievedAt,rawPath,calendarPath:`${base}/league-${leagueId}.json.gz`,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rawPath))).digest('hex')}});
 }
 const result={schemaVersion:1,role:'DESCRIPTIVE_HISTORY_ONLY',metric:'EXPECTED_GOALS',entries,missing};
 fs.writeFileSync(path.join(root,'data/normalized/european-history-xg-2026-27.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({matches:entries.length,values:entries.flatMap(e=>Object.values(e.expectedGoals)).filter(Number.isFinite).length,missing}));return result;
}
module.exports={build,project};if(require.main===module)build();
