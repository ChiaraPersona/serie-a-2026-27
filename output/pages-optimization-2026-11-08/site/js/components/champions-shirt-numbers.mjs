// Exact, team-scoped identity joins only. Existing confirmed numbers take precedence.
export function championsShirtNumber(registry,team,player,current=null){
 if(current!=null)return current;
 const teamId=team.id||team.teamId||team.slug;
 const clubId=team.uefaClubId||team.uefaTeamId;
 const rows=(registry?.records||[]).filter(r=>r.status==='accepted'&&((teamId&&r.teamId===teamId)||(clubId&&String(r.uefaClubId)===String(clubId))));
 const playerId=typeof player==='object'?(player.canonicalPlayerId||player.playerId||player.id):null;
 const name=typeof player==='string'?player:player.canonicalName||player.currentName||player.name||player.sourceName||player.suppliedName;
 const hits=rows.filter(r=>playerId?(r.playerId===playerId||r.playerIdAliases?.includes(playerId)):r.aliases.includes(name));
 return hits.length===1?hits[0].shirtNumber:null;
}
