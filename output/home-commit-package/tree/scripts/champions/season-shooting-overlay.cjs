"use strict";
const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'../../data/normalized/champions-player-shooting-2026-27.json');
function attachSeasonShooting(output,asOf=output.asOf){
 if(!fs.existsSync(file))return output;
 const evidence=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!asOf||evidence.asOf>asOf)return output;
 const byPlayer=new Map(evidence.teams.flatMap(t=>t.players.map(p=>[`${t.id}|${p.id}`,p])));
 for(const t of output.teams)for(const p of t.players){const value=byPlayer.get(`${t.id}|${p.id}`);if(value)p.officialClubShooting={asOf:evidence.asOf,status:value.status,fullSeasonVerified:value.fullSeasonVerified,coveredTotals:value.coveredTotals,currentClubCatalogueZero:value.currentClubCatalogueZero,competitions:value.competitions};}
 return output;
}
module.exports={attachSeasonShooting};
