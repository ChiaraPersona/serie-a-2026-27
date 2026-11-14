// Presentation projection: retain canonical identities and dates, never forecasts.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
function build(){
 const calendar=read('data/normalized/champions-league-2026-27.json'),fixtures=new Map(calendar.fixtures.map(f=>[f.id,f]));
 const records=[];
 const files=fs.readdirSync(path.join(root,'data/sources')).filter(name=>/^champions-(probable|official)-formations-md\d+-2026-27\.json$/.test(name)).sort();
 for(const name of files){
  const file=`data/sources/${name}`,data=read(file);
  for(const t of data.teams||[]){
   const fixture=fixtures.get(t.fixtureId);
   if(!fixture||!t.teamId||t.starters?.length!==11||t.starters.some(p=>!p.playerId))continue;
   records.push({teamId:t.teamId,fixtureId:t.fixtureId,date:fixture.date,status:t.status,formation:t.formation,coach:t.coach||null,
    players:t.starters.map(p=>({id:p.playerId,name:p.canonicalName||p.sourceName,shirtNumber:p.shirtNumber??null})),
    provenance:{file,source:t.source||data.source||null}});
  }
 }
 const output={schemaVersion:1,competition:'champions',policy:'DISPLAY_REFERENCE_ONLY_NO_FORECAST_OR_MARKET_EFFECT',records};
 fs.writeFileSync(path.join(root,'data/generated/champions-lineup-references.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`Champions reference projection: ${records.length} XIs, ${new Set(records.map(r=>r.teamId)).size} canonical teams`);
 return output;
}
if(require.main===module)build();module.exports={build};
