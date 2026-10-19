const fs=require('node:fs');
const {profileStatistics}=require('./referee-stats/history-statistics.cjs');
const database='data/normalized/referee-history/md07-2026-27.json',db=JSON.parse(fs.readFileSync(database));
const fixtures=JSON.parse(fs.readFileSync('data/normalized/matches.json')).filter(m=>m.competition==='serie-a'&&m.matchday===7);
const referees=db.referees.map(r=>({refereeId:r.refereeId,coverage:r.coverage,statistics:profileStatistics(r.matches,{before:fixtures.find(f=>f.refereeAssignment.referee.slug===r.refereeId).date})}));
fs.writeFileSync('data/generated/referee-history-analytics-md07.json',JSON.stringify({schemaVersion:1,informationalOnly:true,database,policy:'Only verified available official competition records; quarantined identities and missing/disputed metrics excluded. All averages, frequencies and ratios carry effective n. No model activation.',referees},null,2)+'\n');
console.log('Research aggregates generated for ten referees; model integration absent.');
