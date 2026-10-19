import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const walk=dir=>!fs.existsSync(dir)?[]:fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
export function benchInputsDigest(){
 const inputs=[...walk('data/teams'),...walk('data/raw/champions-pilot/espn/summaries'),...walk('data/sources').filter(p=>/official-lineups|probable-lineups|shirt-numbers/.test(p)),
  ...fs.readdirSync('data/normalized').filter(p=>/^(matches|predictions|champions-(?:league|pilot-predictions|md\d+-integration|registered-squads|player-stats))/.test(p)).map(p=>'data/normalized/'+p),
  ...walk('scripts/readings'), 'scripts/build-reading-bench-forecasts.mjs','scripts/champions/substitute-minutes.js','scripts/champions/player-volume-utils.js',
  'js/pages/readings.js','js/pages/reading-detail/evidence.mjs','js/pages/reading-detail/bench-contract.mjs'];
 const hash=crypto.createHash('sha256');
 for(const p of inputs.sort()){hash.update(p);hash.update(fs.readFileSync(p));}
 return hash.digest('hex');
}
