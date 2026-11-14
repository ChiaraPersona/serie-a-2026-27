"use strict";
const {run}=require('../../acquire-xgot-seasons.cjs');
const fs=require('node:fs'),path=require('node:path');
const TARGETS=[
 ...[[55,'serie-a'],[42,'champions-league'],[47,'premier-league'],[87,'la-liga'],[54,'bundesliga'],
 [53,'ligue-1'],[61,'liga-portugal'],[57,'eredivisie'],[40,'belgian-pro-league'],[38,'austrian-bundesliga'],
 [135,'greek-super-league'],[71,'super-lig'],[176,'slovak-first-league'],[441,'ukrainian-premier-league'],
 [262,'azerbaijan-premier-league']].map(([leagueId,competition])=>({leagueId,competition,season:'2026/2027'})),
 {leagueId:59,competition:'eliteserien',season:'2026'},
 {leagueId:86,competition:'serie-b',season:'2025/2026'},
 {leagueId:10216,competition:'conference-league',season:'2025/2026'}
];
if(require.main===module){
 const offline=process.argv.includes('--offline'),settings=path.resolve(__dirname,'../../../data/analysis/xgot/current-seasons/acquisition-settings.json');
 const calendarTag=offline?(fs.existsSync(settings)?JSON.parse(fs.readFileSync(settings)).calendarTag:null):new Date().toISOString().replace(/[^a-zA-Z0-9]/g,'');
 run({targets:TARGETS,offline,calendarTag,normalizedRoot:'data/normalized/xgot-current-seasons',auditRoot:'data/analysis/xgot/current-seasons'})
 .then(()=>{if(!offline)fs.writeFileSync(settings,JSON.stringify({calendarTag,policy:'Fresh immutable calendar snapshot per online run; existing match archives preserved'},null,2)+'\n')})
 .catch(e=>{console.error(e);process.exitCode=1});
}
module.exports={TARGETS};
