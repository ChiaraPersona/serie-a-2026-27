'use strict';
// Keep the builder's unresolved role-prior row in technical evidence only.
const fs=require('node:fs');
const file='data/normalized/predictions.json',data=JSON.parse(fs.readFileSync(file)),id='cagliari-frosinone-2026-27-md-11';
const prediction=data.predictions.find(p=>p.matchId===id);
const unresolved=prediction.shooters.allPlayers.filter(p=>!p.playerId);
if(unresolved.length)fs.writeFileSync('output/cagliari-frosinone-md11-official/unresolved-player-priors.json',JSON.stringify({matchId:id,reason:'UNRESOLVED_CANONICAL_IDENTITY_NOT_OPERATIONAL',players:unresolved},null,2)+'\n');
prediction.shooters.allPlayers=prediction.shooters.allPlayers.filter(p=>p.playerId);
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
