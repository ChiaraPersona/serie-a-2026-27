'use strict';
// Import the public Opta application snapshot without evaluating remote code.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const raw='data/raw/opta/2026-11-19',bundlePath=raw+'/index.js.gz';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const countries={ENG:'England',GER:'Germany',FRA:'France',ESP:'Spain',ITA:'Italy',BEL:'Belgium',POR:'Portugal',NOR:'Norway',NED:'Netherlands',TUR:'Türkiye',CZE:'Czechia',GRE:'Greece',UKR:'Ukraine',SVK:'Slovakia',AZE:'Azerbaijan',AUT:'Austria'};
function build({availableAt=new Date().toISOString()}={}){
 assert(Number.isFinite(Date.parse(availableAt)));
 const bundle=zlib.gunzipSync(fs.readFileSync(path.join(root,bundlePath))).toString('utf8');
 const datasets=[...bundle.matchAll(/JSON\.parse\(`([\s\S]*?)`\)/g)].map(m=>JSON.parse(m[1]));
 const rows=datasets.find(a=>a[0]?.contestantId==='4dsgumo7d4zupm2ugsvm4zm4d');assert(rows&&rows.length>10000,'Complete mens ranking literal required');
 const audit=read('data/analysis/champions/opta-historical-feasibility-2026-11-18/archive-content-audit.json');
 const identities=audit.identities.map(t=>({...t}));
 // Primary snapshot distinguishes Sabah FK (AZE) from Sabah FC (Malaysia).
 const sabah=identities.find(t=>t.team==='Sabah');assert(sabah&&sabah.association==='AZE');
 Object.assign(sabah,{optaContestantId:'evvhmz4bq4dq1v9llaev1j97u',status:'PRIMARY_ID_COUNTRY_LEAGUE_VERIFIED'});
 const league=read(raw+'/league-meta.json').find(t=>t.leagueId==='3428tckxcirwwh3o3jgc1m8ji');assert.equal(league.countryName,'Azerbaijan');
 const clubs=identities.map(t=>{
  const matches=rows.filter(r=>r.contestantId===t.optaContestantId);assert.equal(matches.length,1,t.team+' exact contestant ID');const row=matches[0];
  assert.equal(row.country,countries[t.association],t.team+' country');assert(Number.isFinite(row.currentRating)&&row.currentRating>=0&&row.currentRating<=100);
  if(t.team==='Sabah'){assert.equal(row.leagueId,league.leagueId);assert.equal(row.contestantClubName,'Sabah FK');assert.equal(row.country,'Azerbaijan');}
  return {team:t.team,uefaTeamId:String(t.uefaTeamId),association:t.association,optaContestantId:row.contestantId,optaClubName:row.contestantClubName,country:row.country,leagueId:row.leagueId,rating:row.currentRating,rank:row.currentGlobalRank,identityStatus:'EXACT_ID_AND_PRIMARY_COUNTRY_VERIFIED'};
 });
 const calendar=read('data/normalized/champions-league-2026-27.json');assert.equal(clubs.length,36);assert.equal(new Set(clubs.map(t=>t.optaContestantId)).size,36);
 for(const name of calendar.teams)assert.equal(clubs.filter(t=>t.team===name).length,1);
 const output={schemaVersion:1,provider:'Opta',scale:'0-100',availableAt,providerPublishedAt:null,publicationTimeStatus:'PUBLIC_SNAPSHOT_OBSERVED_AT_RETRIEVAL_NOT_PROVIDER_TIMESTAMP',source:{url:'https://dataviz.theanalyst.com/opta-power-rankings/',bundleUrl:'https://dataviz.theanalyst.com/opta-power-rankings/index.js',rawPath:bundlePath,sha256:sha(bundlePath),extraction:'JSON literals parsed without evaluating the application',leagueMetadata:{path:raw+'/league-meta.json',sha256:sha(raw+'/league-meta.json')}},clubs};
 fs.writeFileSync(path.join(root,'data/sources/champions-opta-club-ratings-2026-27.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`Verified Opta snapshot: ${clubs.length} exact clubs; Sabah FK Azerbaijan ${clubs.find(t=>t.team==='Sabah').rating}`);return output;
}
if(require.main===module)build();module.exports={build};
