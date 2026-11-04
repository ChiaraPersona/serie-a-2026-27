'use strict';
// Integrity checks span the action under test, not an obsolete rollout date.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const paths=['data/normalized/predictions.json','data/normalized/schedina-md07.json','data/normalized/odds/sisal/serie-a.json','data/normalized/champions-league-2026-27.json','data/normalized/champions-md03-probable-individuals-2026-27.json','data/normalized/champions-md03-preliminary-2026-27.json','data/normalized/odds/sisal/champions-league.json','data/normalized/schedina-champions-md03.json','data/normalized/schedina-champions-md04.json'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function captureInputs(){return Object.fromEntries(paths.map(p=>[p,hash(p)]));}
function assertInputsUnchanged(before){for(const [p,h]of Object.entries(before))assert.equal(hash(p),h,p+' changed during validation');}
module.exports={captureInputs,assertInputsUnchanged};
