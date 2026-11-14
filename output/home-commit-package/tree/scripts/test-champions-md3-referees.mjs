import assert from 'node:assert/strict';
import fs from 'node:fs';
import {md3RefereeMarkup} from '../js/pages/reading-detail/champions-md3-referees.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='data/analysis/champions/md3-referees-2026-10-19';
const old=read(`${base}/calendar-before.json`),data=read('data/normalized/champions-league-2026-27.json');
const profiles=read('data/normalized/champions-referee-profiles-md03-2026-27.json');
const canonical=read('data/sources/champions-referee-profiles-md03-2026-27.json');
assert.deepEqual(profiles.referees,canonical.referees);
const source=read(`${base}/input/referees_md3_research.json`);
const fixtures=data.fixtures.filter(f=>f.matchday===3);assert.equal(fixtures.length,18);
const branding=new Map(data.teamBranding.map(t=>[t.team,t]));
for(const f of data.fixtures){
 const before=old.fixtures.find(b=>b.id===f.id);
 if(f.matchday!==3){assert.deepEqual(f,before);continue;}
 const {refereeAssignment,...rest}=f;const {refereeAssignment:ignored,...oldRest}=before;assert.deepEqual(rest,oldRest);
 const row=source.fixtures.find(r=>r.date===f.date&&r.home===f.homeTeam&&r.away===f.awayTeam);assert(row);
 assert.equal(refereeAssignment.referee.name,row.referee);assert.equal(refereeAssignment.statistics,null);
 const p=profiles.referees.find(p=>p.refereeId===refereeAssignment.refereeId);assert(p);
 assert.equal(p.predictionEligible,false);assert.equal(p.sample.recentTenVerified,false);assert.equal(p.sample.cutoffCertified,false);assert.equal(p.sample.cutoffDate,null);
 const expected={yellowCardsPerMatch:'yellow_per_match',providerCardsPerMatch:'total_cards_per_match',foulsPerMatch:'fouls_per_match'};
 for(const [k,v] of Object.entries(expected))assert.equal(p.metrics[k],row[v]===''?null:row[v]);
 assert.equal(p.metrics.redCardsPerMatch,null);
 const html=md3RefereeMarkup(f,p,branding);
 assert(html.includes(row.referee));assert(html.includes('Disciplina e profilo arbitrale'));assert(html.includes('<svg'));
 assert(!/statz|scoreline|https?:|ultime 10|media stagionale|campione stagionale/i.test(html));
 assert(html.includes(row.sample_scope==='historical_UCL_provider_cards'?'campione storico':row.sample_scope?'2025/26–2026/27':'Campione statistico non disponibile'));
 for(const [key,value] of Object.entries(p.metrics))assert(html.includes(`data-referee-metric="${key}"><strong>${value===null?'—':value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>`));
}
const testFixture=fixtures[0];const missing=md3RefereeMarkup(testFixture,null,branding);assert(missing.includes('Campione statistico non disponibile'));
console.log('OK 18 exact assignments; separate historical/domestic samples; missing metrics stay —; no model use; all other 126 fixtures unchanged.');
