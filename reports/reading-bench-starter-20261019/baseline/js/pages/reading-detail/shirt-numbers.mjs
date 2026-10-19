// Presentation metadata is date-scoped; current roster numbers are not historical evidence.
export function shirtNumberAt(source,teamId,playerId,date){
 if(!playerId||!date)return null;
 const records=(source.numberHistory||[]).filter(p=>p.teamId===teamId&&p.playerId===playerId&&p.documentDate<=date);
 records.sort((a,b)=>b.documentDate.localeCompare(a.documentDate));
 return records[0]?.shirtNumber??null;
}
