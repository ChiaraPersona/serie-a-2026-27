const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
const normalized=value=>String(value??"").trim().toUpperCase().replaceAll("–","-").replaceAll(",",".");

const resultStatus=won=>({status:won?"won":"lost",label:won?"Esatto":"Sbagliato"});
const pending=()=>({status:"pending",label:""});
const unavailable=()=>({status:"unavailable",label:""});

function totalStat(match,key){
  const home=match?.teamStats?.home?.[key],away=match?.teamStats?.away?.[key];
  return finite(home)&&finite(away)?Number(home)+Number(away):null;
}

function thresholdFromLabel(label){
  const text=normalized(label);
  const atLeast=text.match(/ALMENO\s+(\d+(?:\.\d+)?)/);
  if(atLeast)return {value:Number(atLeast[1]),inclusive:true};
  const line=text.match(/(?:UNDER|OVER)\s+(\d+(?:\.\d+)?)/);
  return line?{value:Number(line[1]),inclusive:false}:null;
}

function settleThreshold(selection,actual,threshold){
  if(!finite(actual)||!threshold)return unavailable();
  if(selection==="UNDER")return resultStatus(Number(actual)<threshold.value);
  if(selection==="OVER")return resultStatus(threshold.inclusive?Number(actual)>=threshold.value:Number(actual)>threshold.value);
  return unavailable();
}

export function settleLeg(leg,match){
  if(match?.status!=="finished"||!finite(match?.score?.home)||!finite(match?.score?.away))return pending();

  const home=Number(match.score.home),away=Number(match.score.away),total=home+away;
  const market=normalized(leg?.market),selection=normalized(leg?.selection),actualScore=`${home}-${away}`;

  if(market.includes("RISULTATO ESATTO")){
    const accepted=selection.split("/").map(item=>item.trim()).filter(Boolean);
    return resultStatus(accepted.includes(actualScore));
  }

  if(market==="MULTIGOAL CASA + MULTIGOAL OSPITE"){
    const ranges=selection.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/)?.slice(1).map(Number);
    if(!ranges)return unavailable();
    return resultStatus(home>=ranges[0]&&home<=ranges[1]&&away>=ranges[2]&&away<=ranges[3]);
  }

  const outcome=home>away?"1":home<away?"2":"X";
  if(market.includes("1X2 ESITO FINALE"))return resultStatus(selection===outcome);
  if(market.includes("DOPPIA CHANCE"))return resultStatus(selection.includes(outcome));

  // I mercati giocatore "Duo / sostituto incluso" richiedono la liquidazione
  // ufficiale del bookmaker: il solo tabellino individuale non è sufficiente.
  if(leg?.marketScope==="player"||market.includes("GIOCATORE")||market.includes("ASSIST")||market.includes("MARCATORE"))return unavailable();
  if(market.includes("PUNTI CARTELLINI")||market.includes("VINCE O QUASI"))return unavailable();

  const threshold=thresholdFromLabel(leg?.label);
  if(market==="UNDER/OVER")return settleThreshold(selection,total,threshold);
  if(market.includes("TIRI IN PORTA"))return settleThreshold(selection,totalStat(match,"shotsOnTarget"),threshold);
  if(market.includes("TIRI TOTALI"))return settleThreshold(selection,totalStat(match,"shots"),threshold);
  if(market.includes("CORNER"))return settleThreshold(selection,totalStat(match,"corners"),threshold);

  return unavailable();
}
