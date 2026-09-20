const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
const normalized=value=>String(value??"").trim().toUpperCase().replaceAll("–","-").replaceAll(",",".");

const resultStatus=won=>({status:won?"won":"lost",label:won?"Esatto":"Sbagliato"});
const pending=()=>({status:"pending",label:""});
const unavailable=()=>({status:"unavailable",label:""});
const voided=()=>({status:"void",label:"Annullata"});
const comparableName=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

function totalStat(match,key){
  const home=match?.teamStats?.home?.[key],away=match?.teamStats?.away?.[key];
  return finite(home)&&finite(away)?Number(home)+Number(away):null;
}

function teamStatFromLabel(leg,match,key){
  const [homeLabel,awayLabel]=String(leg?.fixture??"").split(/\s*[–-]\s*/);
  const label=comparableName(leg?.label);
  if(homeLabel&&label.startsWith(comparableName(homeLabel)))return match?.teamStats?.home?.[key];
  if(awayLabel&&label.startsWith(comparableName(awayLabel)))return match?.teamStats?.away?.[key];
  return null;
}

function thresholdFromLabel(label){
  const text=normalized(label);
  const atLeast=text.match(/ALMENO\s+(\d+(?:\.\d+)?)/);
  if(atLeast)return {value:Number(atLeast[1]),inclusive:true};
  const lessThan=text.match(/MENO DI\s+(\d+(?:\.\d+)?)/);
  if(lessThan)return {value:Number(lessThan[1]),inclusive:false};
  const moreThan=text.match(/PI[UÙ] DI\s+(\d+(?:\.\d+)?)/);
  if(moreThan)return {value:Number(moreThan[1]),inclusive:false};
  const genericLine=text.match(/U\/O\s+(\d+(?:\.\d+)?)/);
  if(genericLine)return {value:Number(genericLine[1]),inclusive:false};
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
  const wantedTokens=name.replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
  const fuzzy=all.filter(item=>{
    const candidateTokens=comparableName(item.player).replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
    const words=wantedTokens.filter(token=>token.length>1),initials=wantedTokens.filter(token=>token.length===1);
    return words.length>0&&words.every(token=>candidateTokens.includes(token))&&initials.every(initial=>candidateTokens.some(token=>token.startsWith(initial)));
  });
  const primary=all.find(item=>comparableName(item.player)===name)||(fuzzy.length===1?fuzzy[0]:null);
  const substitution=(match?.substitutions||[]).find(item=>comparableName(item.playerOut)===name);
  if(!primary&&substitution){
    const goalsFor=person=>(match?.scorers||[]).filter(item=>!item.ownGoal&&comparableName(item.player)===comparableName(person)).length;
    return [{player,goals:goalsFor(player)}, {player:substitution.playerIn,goals:goalsFor(substitution.playerIn)}];
  }
  if(!primary)return null;
  const substitute=substitution?all.find(item=>comparableName(item.player)===comparableName(substitution.playerIn)):null;
  return [primary,...(substitute?[substitute]:[])];
}

function playerDidNotPlay(match,player){
  const name=comparableName(player);
  return ["home","away"].some(side=>(match?.didNotPlay?.[side]||[]).some(item=>comparableName(item?.player??item)===name));
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
  const halfTime=finite(match?.halfTimeScore?.home)&&finite(match?.halfTimeScore?.away)?{home:Number(match.halfTimeScore.home),away:Number(match.halfTimeScore.away)}:null;
  const periodScores=text=>{
    if(!halfTime)return null;
    const value=normalized(text);
    if(value.includes("TEMPO 1")||value.includes("1 TEMPO"))return halfTime;
    if(value.includes("TEMPO 2")||value.includes("2 TEMPO"))return {home:home-halfTime.home,away:away-halfTime.away};
    return null;
  };

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
  if(market==="1 TEMPO: ESITO 1X2"||market==="2 TEMPO: ESITO 1X2"){
    const period=periodScores(market);
    if(!period)return unavailable();
    const periodOutcome=period.home>period.away?"1":period.home<period.away?"2":"X";
    return resultStatus(selection===periodOutcome);
  }
  if(market==="DRAW NO BET"||market==="DRAW NO BET TEMPO X"){
    const score=market==="DRAW NO BET"?{home,away}:periodScores(leg?.variant);
    if(!score||!["1","2"].includes(selection))return unavailable();
    if(score.home===score.away)return voided();
    return resultStatus(selection===(score.home>score.away?"1":"2"));
  }
  if(market.includes("DOPPIA CHANCE")&&!market.includes("TEMPO"))return resultStatus(selection.includes(outcome));
  if(market==="GOAL/NOGOAL"){
    if(!["GOAL","NOGOAL"].includes(selection))return unavailable();
    return resultStatus(selection==="GOAL"?home>0&&away>0:home===0||away===0);
  }
  if(market==="CASA: SEGNA GOAL"||market==="OSPITE: SEGNA GOAL"){
    if(!["SI","NO"].includes(selection))return unavailable();
    const scored=market.startsWith("CASA")?home>0:away>0;
    return resultStatus(selection==="SI"?scored:!scored);
  }
  if(market.includes("SEGNA GOAL")&&(market.includes("CASA")||market.includes("OSPITE"))){
    const period=periodScores(`${market} ${leg?.variant||""}`);
    if(!period||!["SI","NO"].includes(selection))return unavailable();
    const scored=market.includes("CASA")?period.home>0:period.away>0;
    return resultStatus(selection==="SI"?scored:!scored);
  }
  if(market.includes("SEGNA NEI 2 TEMPI")){
    if(!halfTime||!["SI","NO"].includes(selection))return unavailable();
    const descriptor=normalized(`${leg?.variant||""} ${leg?.label||""}`);
    const side=descriptor.includes("SQUADRA 1")?"home":descriptor.includes("SQUADRA 2")?"away":null;
    if(!side)return unavailable();
    const scoredBoth=halfTime[side]>0&&(side==="home"?home-halfTime.home:away-halfTime.away)>0;
    return resultStatus(selection==="SI"?scoredBoth:!scoredBoth);
  }
  if(market.includes("DOPPIA CHANCE TEMPO")){
    const period=periodScores(`${market} ${leg?.variant||""}`);
    if(!period)return unavailable();
    const periodOutcome=period.home>period.away?"1":period.home<period.away?"2":"X";
    return resultStatus(selection.includes(periodOutcome));
  }
  if(market.includes("UNDER/OVER TEMPO")){
    const period=periodScores(`${market} ${leg?.variant||""}`);
    return period?settleThreshold(selection,period.home+period.away,thresholdFromLabel(leg?.label)):unavailable();
  }
  if(market==="GOAL/NOGOAL TEMPO X"){
    const period=periodScores(leg?.variant);
    if(!period||!["GOAL","NOGOAL","NO GOL"].includes(selection))return unavailable();
    const both=period.home>0&&period.away>0;
    return resultStatus(selection==="GOAL"?both:!both);
  }
  if(market==="SQUADRA X VINCE ALMENO UN TEMPO"){
    if(!halfTime||!["SI","NO"].includes(selection))return unavailable();
    const descriptor=normalized(leg?.variant),side=descriptor.includes("SQUADRA 1")?"home":descriptor.includes("SQUADRA 2")?"away":null;
    if(!side)return unavailable();
    const other=side==="home"?"away":"home";
    const wonHalf=halfTime[side]>halfTime[other]||(side==="home"?home-halfTime.home>away-halfTime.away:away-halfTime.away>home-halfTime.home);
    return resultStatus(selection==="SI"?wonHalf:!wonHalf);
  }
  if(market.includes("VINCE A 0")){
    if(!["SI","NO"].includes(selection))return unavailable();
    const score=market.endsWith("1T")?halfTime:market.endsWith("2T")?periodScores("2 TEMPO"):{home,away};
    if(!score)return unavailable();
    const homeSide=market.startsWith("CASA"),wonToNil=homeSide?score.home>0&&score.away===0:score.away>0&&score.home===0;
    return resultStatus(selection==="SI"?wonToNil:!wonToNil);
  }
  if(market==="1X2 NEI MINUTI X-Y"){
    const endMinute=Number(normalized(leg?.variant).match(/(?:PRIMI|MINUTI)\s+(\d+)/)?.[1]);
    if(!finite(endMinute)||!Array.isArray(match?.scorers)||match.scorers.length!==total)return unavailable();
    let windowHome=0,windowAway=0;
    for(const scorer of match.scorers.filter(item=>Number(item.minute)<=endMinute)){
      if(comparableName(scorer.team)===comparableName(match.homeTeam))windowHome+=1;
      else if(comparableName(scorer.team)===comparableName(match.awayTeam))windowAway+=1;
      else return unavailable();
    }
    const windowOutcome=windowHome>windowAway?"1":windowHome<windowAway?"2":"X";
    return resultStatus(selection===windowOutcome);
  }
  if(market==="TEMPO PRIMO GOAL"){
    const firstGoal=[...(match?.scorers||[])].filter(item=>finite(item.minute)).sort((left,right)=>Number(left.minute)-Number(right.minute))[0];
    const actualPeriod=firstGoal?(Number(firstGoal.minute)<=45?"1":"2"):"X";
    return resultStatus(selection===actualPeriod);
  }
  if(market.includes("VINCE O QUASI")){
    const variant=normalized(leg?.variant),predictedOutcome=normalized(leg?.predictedOutcome);
    const side=variant.includes("SQUADRA 1")||predictedOutcome==="1"?"home":variant.includes("SQUADRA 2")||predictedOutcome==="2"?"away":null;
    if(!side||!["SI","NO"].includes(selection))return unavailable();
    const requiredLead=Number(variant.match(/(\d+)UP/)?.[1]||1);
    if(!Array.isArray(match?.scorers)||match.scorers.length!==total)return unavailable();
    let runningHome=0,runningAway=0,reached=false;
    for(const scorer of [...match.scorers].sort((left,right)=>Number(left.minute)-Number(right.minute))){
      if(comparableName(scorer.team)===comparableName(match.homeTeam))runningHome+=1;
      else if(comparableName(scorer.team)===comparableName(match.awayTeam))runningAway+=1;
      else return unavailable();
      const lead=side==="home"?runningHome-runningAway:runningAway-runningHome;
      if(lead>=requiredLead)reached=true;
    }
    return resultStatus(selection==="SI"?reached:!reached);
  }

  if(leg?.marketScope==="player"||market.includes("GIOCATORE")||market.includes("ASSIST")||market.includes("MARCATORE")){
    // A verified goal by the named player settles a scorer bet even when
    // the provider has not supplied individual statistics yet.
    if(market.includes("MARCATORE")&&(match.scorers||[]).some(row=>comparableName(row.player)===comparableName(leg.player)&&!row.ownGoal))return resultStatus(selection==="SI");
    if((market.includes("CARTELLINO")||leg?.marketFamily==="Ammoniti")&&match?.resultCoverage?.participation==="available"){
      if(playerDidNotPlay(match,leg?.player))return voided();
      const duo=new Set([comparableName(leg?.player)]);
      const replacement=(match?.substitutions||[]).find(item=>comparableName(item.playerOut)===comparableName(leg?.player));
      if(replacement?.playerIn)duo.add(comparableName(replacement.playerIn));
      const booked=(match?.bookings||[]).some(item=>duo.has(comparableName(item.player)));
      return resultStatus(selection==="SI"?booked:!booked);
    }
    if(match?.resultCoverage?.participation==="available"&&(market.includes("SEGNA O FA ASSIST")||market.includes("ASSIST")||market.includes("MARCATORE"))){
      if(playerDidNotPlay(match,leg?.player))return voided();
      const duo=new Set([comparableName(leg?.player)]);
      const replacement=(match?.substitutions||[]).find(item=>comparableName(item.playerOut)===comparableName(leg?.player));
      if(replacement?.playerIn)duo.add(comparableName(replacement.playerIn));
      const goals=(match?.scorers||[]).filter(item=>!item.ownGoal&&duo.has(comparableName(item.player))).length;
      const assists=(match?.scorers||[]).filter(item=>duo.has(comparableName(item.assist))).length;
      if(market.includes("SEGNA O FA ASSIST"))return resultStatus(selection==="SI"?goals+assists>0:goals+assists===0);
      if(market.includes("ASSIST"))return resultStatus(selection==="SI"?assists>0:assists===0);
      return resultStatus(selection==="SI"?goals>0:goals===0);
    }
    const playerName=leg?.player||String(leg?.variant||"").split(/\s+U\/O\b/i)[0]||String(leg?.label||"").split(/\s+almeno\b/i)[0];
    const players=playerDuo(match,playerName),goals=players?.reduce((sum,item)=>sum+(finite(item.goals)?Number(item.goals):0),0),assists=players?.reduce((sum,item)=>sum+(finite(item.assists)?Number(item.assists):0),0);
    if(!players&&playerDidNotPlay(match,playerName))return voided();
    if(!players)return unavailable();
    if(market.includes("CARTELLINO")||leg?.marketFamily==="Ammoniti"){
      if(!Array.isArray(match?.bookings)||!["SI","NO"].includes(selection))return unavailable();
      const names=new Set(players.map(item=>comparableName(item.player)));
      const booked=match.bookings.some(item=>names.has(comparableName(item.player)));
      return resultStatus(selection==="SI"?booked:!booked);
    }
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
    if(market.includes("FALLI COMMESSI"))return settlePlayerThreshold(selection,players,"foulsCommitted",threshold);
    if(market.includes("FALLI SUBITI"))return settlePlayerThreshold(selection,players,"foulsWon",threshold);
    return unavailable();
  }
  if(market==="U/O PUNTI CARTELLINI"){
    if(!Array.isArray(match?.bookings))return unavailable();
    return settleThreshold(selection,match.bookings.length,thresholdFromLabel(leg?.label));
  }
  if(market.includes("PUNTI CARTELLINI"))return unavailable();

  const threshold=thresholdFromLabel(leg?.label);
  if(market==="U/O GOAL SQUADRA TEMPO"){
    const period=periodScores(leg?.variant);
    const descriptor=normalized(`${leg?.variant||""} ${leg?.label||""}`);
    const side=descriptor.includes("SQUADRA 1")?"home":descriptor.includes("SQUADRA 2")?"away":null;
    return period&&side?settleThreshold(selection,period[side],threshold):unavailable();
  }
  if(market==="ENTRAMBE ALMENO X CORNER"){
    const minimum=Number(normalized(`${leg?.variant||""} ${leg?.label||""}`).match(/ALMENO\s+(\d+(?:\.\d+)?)/)?.[1]);
    const homeCorners=match?.teamStats?.home?.corners,awayCorners=match?.teamStats?.away?.corners;
    if(!finite(minimum)||!finite(homeCorners)||!finite(awayCorners)||!["SI","NO"].includes(selection))return unavailable();
    const both=Number(homeCorners)>=minimum&&Number(awayCorners)>=minimum;
    return resultStatus(selection==="SI"?both:!both);
  }
  if(market.includes("SQUADRA X")){
    if(market.includes("TIRI IN PORTA"))return settleThreshold(selection,teamStatFromLabel(leg,match,"shotsOnTarget"),threshold);
    if(market.includes("TIRI TOTALI"))return settleThreshold(selection,teamStatFromLabel(leg,match,"shots"),threshold);
    if(market.includes("CORNER"))return settleThreshold(selection,teamStatFromLabel(leg,match,"corners"),threshold);
  }
  if(market==="UNDER/OVER")return settleThreshold(selection,total,threshold);
  if(market.includes("TIRI IN PORTA"))return settleThreshold(selection,totalStat(match,"shotsOnTarget"),threshold);
  if(market.includes("TIRI TOTALI"))return settleThreshold(selection,totalStat(match,"shots"),threshold);
  if(market.includes("CORNER"))return settleThreshold(selection,totalStat(match,"corners"),threshold);

  return unavailable();
}
