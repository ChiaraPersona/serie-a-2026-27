const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
const normalized=value=>String(value??"").trim().toUpperCase().replaceAll("–","-").replaceAll(",",".");

const resultStatus=won=>({status:won?"won":"lost",label:won?"Esatto":"Sbagliato"});
const pending=()=>({status:"pending",label:""});
const unavailable=()=>({status:"unavailable",label:""});
const comparableName=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

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

function playerDuo(match,player){
  const name=comparableName(player),all=[...(match?.playerStats?.home||[]),...(match?.playerStats?.away||[])];
  const primary=all.find(item=>comparableName(item.player)===name);
  if(!primary)return null;
  const substitution=(match?.substitutions||[]).find(item=>comparableName(item.playerOut)===name);
  const substitute=substitution?all.find(item=>comparableName(item.player)===comparableName(substitution.playerIn)):null;
  return [primary,...(substitute?[substitute]:[])];
}

function settlePlayerThreshold(selection,players,key,threshold){
  if(!players||!threshold)return unavailable();
  const known=players.filter(item=>finite(item?.[key])).reduce((sum,item)=>sum+Number(item[key]),0),complete=players.every(item=>finite(item?.[key]));
  if(selection==="OVER"){
    const won=threshold.inclusive?known>=threshold.value:known>threshold.value;
    return won?resultStatus(true):complete?resultStatus(false):unavailable();
  }
  if(selection==="UNDER"){
    const alreadyLost=threshold.inclusive?known>=threshold.value:known>threshold.value;
    return alreadyLost?resultStatus(false):complete?resultStatus(true):unavailable();
  }
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
  if(market.includes("VINCE O QUASI")){
    const variant=normalized(leg?.variant),predictedOutcome=normalized(leg?.predictedOutcome);
    const side=variant.includes("SQUADRA 1")||predictedOutcome==="1"?"home":variant.includes("SQUADRA 2")||predictedOutcome==="2"?"away":null;
    if(!side||!["SI","NO"].includes(selection))return unavailable();
    const finalWin=side==="home"?home>away:away>home;
    if(finalWin)return resultStatus(selection==="SI");
    return unavailable();
  }

  if(leg?.marketScope==="player"||market.includes("GIOCATORE")||market.includes("ASSIST")||market.includes("MARCATORE")){
    const players=playerDuo(match,leg?.player),goals=players?.reduce((sum,item)=>sum+(finite(item.goals)?Number(item.goals):0),0),assists=players?.reduce((sum,item)=>sum+(finite(item.assists)?Number(item.assists):0),0);
    if(!players)return unavailable();
    if(market.includes("SEGNA O FA ASSIST"))return resultStatus(selection==="SI"?goals+assists>0:goals+assists===0);
    if(market.includes("ASSIST"))return resultStatus(selection==="SI"?assists>0:assists===0);
    if(market.includes("MARCATORE"))return resultStatus(selection==="SI"?goals>0:goals===0);
    const threshold=thresholdFromLabel(leg?.label);
    if(market.includes("TIRI IN PORTA")){
      const settlement=settlePlayerThreshold(selection,players,"shotsOnTarget",threshold);
      if(settlement.status!=="unavailable")return settlement;
      if(selection==="OVER"&&threshold?.inclusive&&goals>=threshold.value)return resultStatus(true);
      return unavailable();
    }
    if(market.includes("TIRI TOTALI"))return settlePlayerThreshold(selection,players,"shots",threshold);
    return unavailable();
  }
  if(market==="U/O PUNTI CARTELLINI"){
    if(!Array.isArray(match?.bookings))return unavailable();
    return settleThreshold(selection,match.bookings.length,thresholdFromLabel(leg?.label));
  }
  if(market.includes("PUNTI CARTELLINI"))return unavailable();

  const threshold=thresholdFromLabel(leg?.label);
  if(market==="UNDER/OVER")return settleThreshold(selection,total,threshold);
  if(market.includes("TIRI IN PORTA"))return settleThreshold(selection,totalStat(match,"shotsOnTarget"),threshold);
  if(market.includes("TIRI TOTALI"))return settleThreshold(selection,totalStat(match,"shots"),threshold);
  if(market.includes("CORNER"))return settleThreshold(selection,totalStat(match,"corners"),threshold);

  return unavailable();
}
