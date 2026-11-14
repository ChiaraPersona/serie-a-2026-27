const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#039;|&#39;/g,"'").replace(/\s+/g,' ').trim();
const count=s=>/^\d+$/.test(s)?Number(s):null;
function parseOfstats(html){
 const rows=[];
 for(const [,tr] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
  if(cells.length!==5||!/^\d{2}\.\d{2}\.\d{4}$/.test(clean(cells[0])))continue;
  const match=clean(cells[1]).match(/^(.*?)\s+(\d+):(\d+)\s+(.*?)$/),href=cells[1].match(/href="([^"]+)"/)?.[1];if(!match||!href)continue;
  const [day,month,year]=clean(cells[0]).split('.'),red=count(clean(cells[4])),yellow=count(clean(cells[3]));
  rows.push({date:`${year}-${month}-${day}`,season:Number(month)>=7?`${year}/${String(Number(year)+1).slice(-2)}`:`${Number(year)-1}/${year.slice(-2)}`,competition:null,home:match[1],away:match[4],score:{home:Number(match[2]),away:Number(match[3])},fouls:count(clean(cells[2])),yellowCards:red===0?yellow:null,dismissals:red===0?0:null,directRedCards:red===0?0:null,secondYellowCards:red===0?0:null,penaltiesAwarded:null,providerYellowCards:yellow,providerRedCards:red,matchUrl:'https://ofstats.com'+href});
 }
 return rows;
}
function parseDatasport(html){
 const rows=[];
 for(const [,tr] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const raw=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]),c=raw.map(clean);
  if(c.length!==9||!/^\d{2}\/\d{2}\/\d{4}$/.test(c[2]))continue;
  const [day,month,year]=c[2].split('/'),teams=c[3].split(/\s+-\s+/),score=c[4].match(/^(\d+)\s*-\s*(\d+)$/),season=c[0].match(/(\d{4})-(\d{4})/);if(!score||teams.length!==2||!season)continue;
  const direct=count(c[6]),second=count(c[7]);
  rows.push({date:`${year}-${month}-${day}`,season:`${season[1]}/${season[2].slice(-2)}`,competition:c[0].replace(/\s*\d{4}-\d{4}/,''),home:teams[0],away:teams[1],score:{home:Number(score[1]),away:Number(score[2])},yellowCards:count(c[5]),directRedCards:direct,secondYellowCards:second,dismissals:direct===null||second===null?null:direct+second,fouls:null,penaltiesAwarded:count(c[8]),matchUrl:raw[3].match(/href="([^"]+)"/)?.[1]||null});
 }
 return rows;
}
function parseDetail(html){
 const league=clean(html.match(/<div class="league-name">([\s\S]*?)<\/div>/)?.[1]),season=league.match(/(\d{4})\/(\d{4})/);
 const rawCompetition=season?league.slice(0,season.index).trim():null;
 const competition=({'Champions League':'UEFA Champions League','Europa League':'UEFA Europa League','Conference League':'UEFA Conference League','Europa Conference League':'UEFA Conference League'})[rawCompetition]||rawCompetition;
 const refereeId=html.match(/class="game-referee"[\s\S]*?href="\/referee\/([^"]+)"/)?.[1]?.replace(/-2$/,'')||null;
 const sideStats=section=>{const part=html.match(new RegExp('class="row stat-section-item[^"\\n]*section-'+section+'"([\\s\\S]*?)<div class="col-lg-12 stat-label"'))?.[1]||'';const values=[...part.matchAll(/class="[^"]*stat-digit"[^>]*>\s*(\d+)\s*<\/div>/g)].map(m=>Number(m[1]));return values.length===2?values:null;};
 const yellow=sideStats('yellowcards'),red=sideStats('redcards'),fouls=sideStats('fouls');
 const timeline=[...html.matchAll(/<div id="(\d+)"[^>]*>([\s\S]*?)<\/div>/g)].filter(m=>/time-action/.test(m[2])&&/yellow_card_40|yellow_red_card|red_card_40/.test(m[2])).map(m=>({id:m[1],text:clean(m[2]),type:/yellow_red_card/.test(m[2])?'secondYellowCards':/red_card_40/.test(m[2])?'directRedCards':'yellowCards'}));
 const unique=[...new Map(timeline.map(e=>[e.id,e])).values()];
 const cardCounts=Object.fromEntries(['yellowCards','directRedCards','secondYellowCards'].map(k=>[k,unique.filter(e=>e.type===k).length]));
 const y=yellow?.reduce((a,b)=>a+b,0),r=red?.reduce((a,b)=>a+b,0),eventRed=cardCounts.directRedCards+cardCounts.secondYellowCards;
 const verifiedCards=yellow&&red&&(cardCounts.yellowCards===y||cardCounts.yellowCards+cardCounts.secondYellowCards===y)&&(eventRed===r||eventRed+cardCounts.secondYellowCards===r);
 return {competition,season:season?`${season[1]}/${season[2].slice(-2)}`:null,refereeId,fouls:fouls?fouls[0]+fouls[1]:null,providerYellowCards:y??null,providerRedCards:r??null,events:unique,verifiedCards:!!verifiedCards,cardCounts:verifiedCards?{...cardCounts,dismissals:eventRed}:null};
}
module.exports={clean,parseOfstats,parseDatasport,parseDetail};
