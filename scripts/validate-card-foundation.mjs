import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const tests=[
  'scripts/test-card-foundation.mjs','scripts/test-player-identities.js','scripts/test-statmuse-refresh-md01-md05.js',
  'scripts/test-predictions.js','scripts/test-reading-prediction-v2.mjs','scripts/test-team-matchup-profiles.js','scripts/test-team-volume-profiles.js',
  'scripts/test-team-referee-profiles.js','scripts/referee-stats/test.js','scripts/test-future-data-readiness.js',
  'scripts/test-schedina.js','scripts/test-schedina-md02.js','scripts/test-schedina-md03.js','scripts/test-schedina-md04.js','scripts/test-schedina-md05.js',
  'scripts/test-schedina-md05-results.mjs','scripts/test-betting-void-md02.js','scripts/test-prediction-snapshots.js',
  'scripts/validate-data.js','scripts/referee-stats/validate-season.js --season 2023-24',
  'scripts/test-app-modules.mjs','scripts/test-css-modules.js','scripts/test-probable-lineups.js',
  'scripts/test-champions-player-markets.js','scripts/test-champions-schedina.js','scripts/test-champions-results.js',
  'scripts/test-champions-reading-page.mjs',
  'scripts/referee-stats/validate-season.js --season 2024-25','scripts/referee-stats/validate-2025-26.js'
];
const results=tests.map(command=>{const result=spawnSync(process.execPath,['--no-warnings',...command.split(' ')],{encoding:'utf8',timeout:120000});return {command,exitCode:result.status,passed:result.status===0,stdout:result.stdout.trim(),stderr:result.stderr.trim(),error:result.error?.message??null};});
const report={generatedAt:new Date().toISOString(),suites:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
fs.writeFileSync('output/reports/card-foundation-tests-2026-10-03.json',JSON.stringify(report,null,2)+'\n');
for(const r of results)console.log(`${r.passed?'PASS':'FAIL'} ${r.command}${r.passed?'':': '+(r.stderr||r.stdout).slice(-550)}`);
console.log(`${report.passed}/${report.suites} suites passed`);
process.exitCode=report.failed?1:0;
