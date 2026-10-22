import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const write=(relative,value)=>{const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`)};
const clamp=(value,low=0,high=100)=>Math.max(low,Math.min(high,value));
const round=(value,digits=0)=>Number(value.toFixed(digits));

const calendar=read("data/normalized/champions-league-2026-27.json");
const baseline=read("data/champions-2026-27/team-motivation-baseline.json");
const strength=read("data/normalized/champions-team-strength-2026-27.json");
const history=read("data/normalized/uefa-team-history-2026-27.json");
const context=read("data/normalized/champions-pre-match-context-2026-27.json");
const matchdayArgument=process.argv.find(argument=>argument.startsWith("--matchday"));
const targetMatchday=Number(matchdayArgument?.includes("=")?matchdayArgument.split("=")[1]:matchdayArgument?process.argv[process.argv.indexOf(matchdayArgument)+1]:process.env.npm_config_matchday||1);
if(!Number.isInteger(targetMatchday)||targetMatchday<1||targetMatchday>8)throw new Error("Motivation: --matchday deve essere compreso tra 1 e 8");
const matchdayWeight={1:0.55,2:0.60,3:0.68,4:0.75,5:0.82,6:0.90,7:0.96,8:1};
const weights={qualificationImportance:0.30,seasonalObjective:0.20,opponentPrestige:0.10,historicalEvent:0.10,psychologicalMomentum:0.10,pressure:0.10,narrativeFactor:0.05,homeFactor:0.05};
const allowedReasons=new Set(["must_win","top8_race","top24_race","elimination_risk","already_qualified","big_match","elite_opponent","historic_match","champions_debut","return_to_champions","home_pressure","hostile_away_environment","coach_under_pressure","poor_recent_form","excellent_recent_form","revenge_factor","former_coach","former_player","title_contender","rotation_expected","fixture_congestion","strong_ucl_ambition","underdog_opportunity"]);
const objectiveValue={win_competition:98,final:94,semifinal:90,quarterfinal:84,round_of_16:76,playoff:68,league_phase_survival:60,experience_and_visibility:56};
const objectiveLabels={win_competition:"Vittoria",final:"Finale",semifinal:"Semifinale",quarterfinal:"Quarti",round_of_16:"Ottavi",playoff:"Playoff",league_phase_survival:"Restare in corsa",experience_and_visibility:"Esperienza e visibilità"};
const strengthByTeam=new Map(strength.teams.map(team=>[team.team,team]));
const historyByTeam=new Map(history.teams.map(team=>[team.team,team]));
const contextByTeam=new Map(context.teams.map(team=>[team.team,team]));
const baselineByTeam=new Map(baseline.teams.map(team=>[team.team,team]));

function scorePair(fixture){
  if(!fixture.score||!Number.isFinite(fixture.score.home)||!Number.isFinite(fixture.score.away))return null;
  return [fixture.score.home,fixture.score.away];
}
const standings=new Map(calendar.teams.map(team=>[team,{team,played:0,points:0,goalsFor:0,goalsAgainst:0}]));
for(const fixture of calendar.fixtures.filter(item=>item.matchday<targetMatchday)){
  const score=scorePair(fixture);if(!score)continue;
  const home=standings.get(fixture.homeTeam),away=standings.get(fixture.awayTeam);home.played+=1;away.played+=1;home.goalsFor+=score[0];home.goalsAgainst+=score[1];away.goalsFor+=score[1];away.goalsAgainst+=score[0];
  if(score[0]>score[1])home.points+=3;else if(score[0]<score[1])away.points+=3;else{home.points+=1;away.points+=1}
}
const ranked=[...standings.values()].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor||a.team.localeCompare(b.team,"it"));
ranked.forEach((team,index)=>team.position=index+1);
const tableByTeam=new Map(ranked.map(team=>[team.team,team]));
const remainingIncludingCurrent=9-targetMatchday;

if(calendar.summary?.teams!==36||baseline.teams.length!==36)throw new Error("Motivation: attese 36 squadre");
if(new Set(baseline.teams.map(team=>team.team)).size!==36)throw new Error("Motivation: baseline con duplicati");
for(const team of calendar.teams)if(!baselineByTeam.has(team))throw new Error(`Motivation: baseline mancante per ${team}`);

function level(score){return score>=90?"extreme":score>=75?"very_high":score>=60?"high":score>=40?"medium":"low"}
function confidenceFor(team,profile,teamContext){
  let value=0.82;
  if(profile?.dataCoveragePct<100)value-=0.10;
  if(profile?.dataCoveragePct===0)value-=0.15;
  if(historyByTeam.get(team.team)?.coverage!=="sufficient")value-=0.08;
  if(!teamContext?.metrics?.finalDomesticMatchCompleted)value-=0.12;
  if(team.experienceLevel==="debutant")value-=0.04;
  return round(clamp(value,0.45,0.92),2);
}
function momentum(team){
  const profile=historyByTeam.get(team.team),recent=profile?.recent10;
  if(!recent?.matches||recent.pointsPerMatch==null)return {value:50,status:"fallback-neutral",sample:0};
  const performance=35+(recent.pointsPerMatch/3)*50+clamp(recent.goalDifferencePerMatch,-1.5,1.5)*6;
  return {value:round(clamp(performance)),status:"european-recent10-proxy",sample:recent.matches};
}
function calculateSide(fixture,teamName,opponentName,venue){
  const team=baselineByTeam.get(teamName),opponent=baselineByTeam.get(opponentName);
  const profile=strengthByTeam.get(teamName),opponentProfile=strengthByTeam.get(opponentName);
  const teamContext=contextByTeam.get(teamName),mdFactor=matchdayWeight[fixture.matchday];
  const opponentStrength=opponentProfile?.europeanStrengthIndex;
  const ownStrength=profile?.europeanStrengthIndex;
  const table=tableByTeam.get(teamName),maximumPoints=table.points+remainingIncludingCurrent*3;
  const possibleAbove=ranked.filter(other=>other.team!==teamName&&other.points+remainingIncludingCurrent*3>=table.points).length;
  const alreadyTop8=table.played>0&&possibleAbove<=7,alreadyTop24=table.played>0&&possibleAbove<=23;
  const eliminated=table.played>0&&maximumPoints<(ranked[23]?.points||0);
  let rawQualification=62+(team.uclAmbition-75)*0.18+(ownStrength!=null&&opponentStrength!=null&&ownStrength>opponentStrength+30?5:0);
  if(targetMatchday>=4){if(table.position>24)rawQualification+=18;if(Math.abs(table.points-(ranked[7]?.points||0))<=3)rawQualification+=12;if(Math.abs(table.points-(ranked[23]?.points||0))<=3)rawQualification+=14}
  if(alreadyTop8)rawQualification=28;else if(alreadyTop24)rawQualification=38;else if(eliminated)rawQualification=22;
  rawQualification=clamp(rawQualification);
  const qualificationImportance=round(50+(rawQualification-50)*mdFactor);
  const seasonalObjective=round((objectiveValue[team.seasonObjective]+team.uclAmbition+team.baselineMotivation)/3);
  const opponentPrestige=round(opponentStrength==null?50:clamp(30+opponentStrength*0.7));
  const historicalEvent=team.experienceLevel==="debutant"?100:team.experienceLevel==="returning"?clamp(team.historicalImportance+6):team.historicalImportance;
  const recent=momentum(team);
  const pressure=round(clamp(team.clubPressure+(fixture.matchday>=6?5:0)+(opponentPrestige>=90?2:0)));
  const narrativeFactor=team.experienceLevel==="debutant"?92:team.experienceLevel==="returning"?62:opponentPrestige>=90?52:24;
  const homeFactor=venue==="home"?round(clamp(58+team.historicalImportance*0.25)):18;
  let adjustment=0,adjustmentReason=null;
  if(team.experienceLevel==="debutant"){adjustment=10;adjustmentReason="first_champions_league_match_in_club_history"}
  else if(team.experienceLevel==="returning"){adjustment=4;adjustmentReason="return_to_champions_after_absence"}
  const components={qualificationImportance,seasonalObjective,opponentPrestige,historicalEvent,psychologicalMomentum:recent.value,pressure,narrativeFactor,homeFactor};
  const weighted=Object.entries(weights).reduce((sum,[key,weight])=>sum+components[key]*weight,0);
  const score=round(clamp(weighted+adjustment));
  let urgencyRaw=58+(team.clubPressure-70)*0.12+(ownStrength!=null&&opponentStrength!=null&&ownStrength>opponentStrength+35?7:0)+(team.experienceLevel==="debutant"?-4:0);
  if(targetMatchday>=4&&table.position>24)urgencyRaw+=18;if(targetMatchday>=6&&table.position>8)urgencyRaw+=10;if(alreadyTop8||alreadyTop24)urgencyRaw-=28;if(eliminated)urgencyRaw=12;
  const urgency=round(clamp(50+(clamp(urgencyRaw)-50)*mdFactor));
  const rotationRisk=round(clamp(16+(team.uclAmbition>=95&&opponentPrestige<55?12:0)+(profile?.dataCoveragePct<100?4:0)));
  const reasons=[];
  if(alreadyTop8||alreadyTop24)reasons.push("already_qualified");
  else if(eliminated)reasons.push("elimination_risk");
  else if(targetMatchday>=6&&table.position<=12)reasons.push("top8_race");
  else if(targetMatchday>=4&&table.position>=20)reasons.push("top24_race");
  if(team.experienceLevel==="debutant")reasons.push("champions_debut","historic_match");
  else if(team.experienceLevel==="returning")reasons.push("return_to_champions");
  if(opponentPrestige>=90)reasons.push("elite_opponent","big_match");
  if(team.uclAmbition>=90)reasons.push("strong_ucl_ambition","title_contender");
  if(ownStrength!=null&&opponentStrength!=null&&ownStrength+28<opponentStrength)reasons.push("underdog_opportunity");
  if(venue==="home"&&pressure>=84)reasons.push("home_pressure");
  if(recent.value>=78)reasons.push("excellent_recent_form");
  if(rotationRisk>=28)reasons.push("rotation_expected");
  const uniqueReasons=[...new Set(reasons)].filter(reason=>allowedReasons.has(reason));
  const referee=fixture.refereeAssignment?.statistics;
  const refereeStrictness=referee?.yellowCardsPerMatch?.value==null?null:round(clamp(35+(referee.yellowCardsPerMatch.value-3)*12));
  const disciplinaryScore=round(clamp(urgency*0.35+pressure*0.35+narrativeFactor*0.20+(refereeStrictness??50)*0.10));
  const motivationStrengthAdjustment=round(clamp((score-70)*0.0015,-0.04,0.04),4);
  const rotationWeight=round(0.02+(team.uclAmbition/100)*0.04,3);
  const rotationStrengthAdjustment=round(-(rotationRisk/100)*rotationWeight,4);
  return {team:teamName,motivation:{score,level:level(score),qualificationImportance,qualificationImportanceRaw:round(rawQualification),qualificationState:{points:table.points,position:table.played?table.position:null,matchesPlayed:table.played,remainingIncludingCurrent,maximumPoints,alreadyTop8,alreadyTop24,eliminated},matchdayFactor:mdFactor,seasonalObjective,opponentPrestige,historicalEvent,psychologicalMomentum:recent.value,psychologicalMomentumEvidence:{status:recent.status,matches:recent.sample,domesticFormStatus:teamContext?.status||"unavailable"},pressure,narrativeFactor,homeFactor,urgency,rotationRisk,confidence:confidenceFor(team,profile,teamContext),contextAdjustment:{value:adjustment,reason:adjustmentReason},reasons:uniqueReasons.slice(0,5),sourceContext:[],debug:{weights,weightedScore:round(weighted,2),formula:Object.fromEntries(Object.keys(weights).map(key=>[key,{value:components[key],weight:weights[key],contribution:round(components[key]*weights[key],2)}]))},modelAdjustments:{motivationStrengthAdjustment,rotationStrengthAdjustment,rotationWeight,netStrengthAdjustment:round(motivationStrengthAdjustment+rotationStrengthAdjustment,4),maximumMotivationAdjustment:0.04,disciplinaryMotivationAdjustment:{score:disciplinaryScore,refereeStrictness,status:"diagnostic-only",applied:false}}}};
}

const fixtures=calendar.fixtures.filter(fixture=>fixture.matchday===targetMatchday).map(fixture=>({matchId:fixture.id,matchday:fixture.matchday,date:fixture.date,kickoff:fixture.kickoff,home:calculateSide(fixture,fixture.homeTeam,fixture.awayTeam,"home"),away:calculateSide(fixture,fixture.awayTeam,fixture.homeTeam,"away"),updatedAt:"2026-09-07"}));
if(fixtures.length!==18)throw new Error(`Motivation: attese 18 gare MD${targetMatchday}, trovate ${fixtures.length}`);
for(const fixture of fixtures)write(`data/champions-2026-27/motivation/${fixture.matchId}.json`,fixture);
const teams=fixtures.flatMap(fixture=>[fixture.home,fixture.away]).sort((a,b)=>b.motivation.score-a.motivation.score||a.team.localeCompare(b.team,"it"));
const md=String(targetMatchday).padStart(2,"0");
const output={schemaVersion:1,competition:baseline.competition,season:baseline.season,matchday:targetMatchday,updatedAt:"2026-09-07",status:"experimental-explainable",warning:"La forma domestica finale pre-Champions non è ancora disponibile nel dataset per nessuna delle 36 squadre. Psychological Momentum usa le ultime gare europee come proxy; confidence ridotta. Gli effetti disciplinari sono solo diagnostici.",methodology:{formula:weights,matchdayWeight,contextAdjustmentCap:10,motivationStrengthFormula:"clamp((motivation - 70) * 0.0015, -0.04, 0.04)",rotationFormula:"-(rotationRisk / 100) * rotationWeight",predictionApplication:"Gli aggiustamenti di forza sono applicati al modello 1X2 e registrati separatamente; il correttore disciplinare resta disattivato finché non viene calibrato per stile e arbitro."},summary:{fixtures:fixtures.length,teams:teams.length,completedMatchesBeforeMatchday:[...standings.values()].reduce((sum,team)=>sum+team.played,0)/2,domesticFormComplete:0,lowConfidence:teams.filter(team=>team.motivation.confidence<0.65).length},objectiveLabels,baselines:baseline.teams,teams,fixtures};
write(`data/normalized/champions-motivation-md${md}-2026-27.json`,output);
const lines=[`# Motivation Index — Champions League 2026/27, MD${targetMatchday}`,"","| Team | Motivation | Urgency | Pressure | Rotation Risk | Confidence |","|---|---:|---:|---:|---:|---:|",...teams.map(team=>`| ${team.team} | ${team.motivation.score} | ${team.motivation.urgency} | ${team.motivation.pressure} | ${team.motivation.rotationRisk} | ${Math.round(team.motivation.confidence*100)}% |`),"","## Dati mancanti o poco affidabili","","- Forma domestica finale pre-Champions: pendente per 36/36 squadre.","- Disponibilità, infortuni e turnover annunciato: non integrati; Rotation Risk resta prudenziale.","- Narrative specifiche, dichiarazioni e rivalità: non valorizzate senza fonte documentata.","- Correttore disciplinare: calcolato per audit ma non applicato ai mercati.",""];
fs.mkdirSync(path.join(root,"output"),{recursive:true});fs.writeFileSync(path.join(root,`output/champions-motivation-md${md}-report.md`),lines.join("\n"));
console.log(`OK Motivation Champions MD${targetMatchday}: ${fixtures.length} gare · ${teams.length} squadre · ${output.summary.lowConfidence} confidence < 0,65`);
