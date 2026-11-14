import fs from 'node:fs';
import crypto from 'node:crypto';
import {readingCases} from './readings/fixtures.mjs';
import {buildBenchFixture} from './readings/bench-forecasts.mjs';
import minutesModel from './champions/substitute-minutes.js';
import snapshots from './champions/complete-forecast-snapshots.js';
import {benchInputsDigest} from './readings/bench-inputs.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const inputsDigest=benchInputsDigest();
if(process.argv.includes('--if-needed')&&fs.existsSync('data/normalized/reading-bench-forecasts.json')&&read('data/normalized/reading-bench-forecasts.json').inputsDigest===inputsDigest){
 console.log('Bench forecasts: inputs unchanged');process.exit(0);
}
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protectedFiles=['data/normalized/predictions.json','data/normalized/champions-pilot-predictions-2026-27.json','data/normalized/champions-pilot-predictions-md02-2026-27.json','data/normalized/champions-md02-integration-2026-27.json','data/normalized/champions-player-markets-md01-2026-27.json'];
const before=Object.fromEntries(protectedFiles.map(p=>[p,digest(p)]));
const stats=read('data/normalized/champions-player-stats-2025-26.json');
const cases=await readingCases();
const evidence=minutesModel.collectRosterEvidence(process.cwd(),stats.teams.flatMap(t=>t.players.map(p=>p.providerPlayerId)).filter(Boolean));
const fixtures=cases.map(c=>{
 let kickoffAt=null;try{kickoffAt=snapshots.zonedLocalToUtc(c.model.fixture.date,c.model.fixture.kickoff,'Europe/Rome');}catch{}
 return buildBenchFixture(c,stats,evidence,kickoffAt);
}).filter(f=>f.players.length);
const counts=rows=>({analysed:rows.length,withForecast:rows.filter(p=>Number.isFinite(p.projectedShots)&&Number.isFinite(p.projectedShotsOnTarget)).length,withMinutes:rows.filter(p=>Number.isFinite(p.expectedMinutes)).length,withHistoricalStats:rows.filter(p=>p.historical&&Object.values(p.historical.per90||{}).some(Number.isFinite)).length,withoutForecast:rows.filter(p=>!Number.isFinite(p.projectedShots)||!Number.isFinite(p.projectedShotsOnTarget)).length});
const summary=Object.fromEntries(['serie-a','champions'].map(c=>[c,counts(fixtures.filter(f=>f.competition===c).flatMap(f=>f.players))]));
summary.total=counts(fixtures.flatMap(f=>f.players));
const after=Object.fromEntries(protectedFiles.map(p=>[p,digest(p)]));
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Protected forecasts changed');
const result={schemaVersion:1,inputsDigest,kind:'reading-only-bench-forecasts',policies:{starterValues:'immutable',teamTotals:'immutable',missing:'null-never-zero',serieA:'No approved bench entry estimator; no role-only forecasts',champions:'Existing chronological minutes and role-regularized rate models; only unallocated starter budgets; no event probability approximation',chronology:'Past fixtures are reconstructions, never original frozen forecasts'},summary,protectedFiles:before,fixtures};
const write=(p,s)=>{if(fs.existsSync(p)&&fs.readFileSync(p,'utf8')===s)return;const tmp=p+'.tmp';fs.writeFileSync(tmp,s);fs.renameSync(tmp,p);};
write('data/normalized/reading-bench-forecasts.json',JSON.stringify(result,null,2)+'\n');
fs.mkdirSync('reports/reading-bench',{recursive:true});
write('reports/reading-bench/coverage.json',JSON.stringify({summary,protectedFilesBefore:before,protectedFilesAfter:after,reasons:fixtures.flatMap(f=>f.players).reduce((acc,p)=>{for(const r of p.reasons)acc[r]=(acc[r]||0)+1;return acc;},{})},null,2)+'\n');
console.log(JSON.stringify(summary));
