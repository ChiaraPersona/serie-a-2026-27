export const PERSONAL_BETSLIP_VERSION=1;
export const PERSONAL_BETSLIP_STORAGE_KEY="serie-a-2026-27:personal-betslip:v1";

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const finite=value=>value!==null&&value!==""&&Number.isFinite(Number(value));
const unique=values=>[...new Set((values||[]).filter(Boolean).map(String))];
const isoTime=value=>{const time=Date.parse(value||"");return Number.isFinite(time)?time:0};
const normalizeText=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();

export function contextKey(context){
  if(!context?.competition||!context?.season||!Number.isInteger(Number(context.matchday)))return null;
  return `${String(context.competition).toLowerCase()}:${context.season}:md${String(Number(context.matchday)).padStart(2,"0")}`;
}

export function isPlayableUnder(selection){
  const bet=selection?.betSelection||selection||{};
  const outcome=normalizeText(bet.market?.selection||selection?.selection);
  const label=normalizeText(selection?.label||bet.market?.bookmakerSemantics?.selectionName);
  return outcome==="UNDER"||/\bUNDER\b/.test(label);
}

export function isIndividualPlayerFoulSelection(selection){
  const bet=selection?.betSelection||selection||{};
  const name=normalizeText(bet.market?.name||selection?.market||selection?.marketName);
  return name==="U O FALLI COMMESSI GIOCATORE"||name==="U O FALLI SUBITI GIOCATORE";
}

export function isCornerPeriodSelection(selection){
  const bet=selection?.betSelection||selection||{};
  const descriptor=normalizeText(`${bet.market?.name||selection?.market||selection?.marketName||""} ${bet.market?.variant||selection?.variant||selection?.variantName||""}`);
  if(!/\bCORNER\b|\bCALCI(?:O)? D ANGOLO\b/.test(descriptor))return false;
  return /\b(?:1|2) TEMPO\b|\b(?:1|2)T\b|\b(?:PRIMO|SECONDO) TEMPO\b|\b(?:PRIMA|SECONDA) FRAZIONE\b|\bENTRAMB[EI](?: I)? TEMPI\b|\bTEMPO X\b|\bMINUTI X Y\b|\b(?:PRIMI|ULTIMI) \d+ MINUTI\b/.test(descriptor);
}

function playability(selection){
  const declared=selection?.betSelection?.operational?.playability;
  if(declared?.status==="NOT_PLAYABLE")return declared;
  if(Number(selection?.context?.matchday)>=6&&isPlayableUnder(selection))return {status:"NOT_PLAYABLE",code:"UNDER_NOT_PLAYABLE",reason:"Gli Under sono esclusi dalle proposte giocabili dalla sesta giornata."};
  if(Number(selection?.context?.matchday)>=6&&isIndividualPlayerFoulSelection(selection))return {status:"NOT_PLAYABLE",code:"INDIVIDUAL_FOUL_NOT_PLAYABLE",reason:"I falli commessi o subiti del singolo giocatore sono esclusi dalle proposte giocabili dalla sesta giornata."};
  if(Number(selection?.context?.matchday)>=6&&isCornerPeriodSelection(selection))return {status:"NOT_PLAYABLE",code:"CORNER_PERIOD_NOT_PLAYABLE",reason:"I corner riferiti a singoli tempi o finestre temporali sono esclusi dalle proposte giocabili dalla sesta giornata."};
  return {status:"PLAYABLE",code:null,reason:null};
}

function validCanonicalSelection(selection){
  const bet=selection?.betSelection;
  return Boolean(selection?.selectionId&&bet?.selectionId===selection.selectionId&&bet?.identity?.status==="VERIFIED_PROVIDER_IDS"&&bet.identity.providerSelectionId);
}

function marketOutcome(selection){return normalizeText(selection?.betSelection?.market?.selection||selection?.selection)}
function matchId(selection){return selection?.betSelection?.identity?.matchId||selection?.matchId||null}
function marketId(selection){return selection?.betSelection?.identity?.providerMarketId||null}
function overlapKey(selection){return selection?.betSelection?.overlap?.overlapKey||null}
function semanticKeys(selection){return unique(selection?.betSelection?.overlap?.semanticKeys)}
function quote(selection){return selection?.betSelection?.quote||{}}
function compatibility(selection){return selection?.betSelection?.compatibility||{}}

function contradictory(left,right){
  if(matchId(left)!==matchId(right)||!marketId(left)||marketId(left)!==marketId(right)||left.selectionId===right.selectionId)return false;
  const a=marketOutcome(left),b=marketOutcome(right);
  if(!a||!b||a===b)return false;
  const opposites=new Set(["UNDER|OVER","OVER|UNDER","SI|NO","NO|SI","GOAL|NOGOAL","NOGOAL|GOAL","1|2","2|1","1|X","X|1","2|X","X|2"]);
  return opposites.has(`${a}|${b}`)||Boolean(marketId(left));
}

export function assessSelections(selections){
  const rows=Array.isArray(selections)?selections:[];
  const issues=[];
  const addIssue=(type,message,selectionIds=[],severity="blocking")=>issues.push({type,message,selectionIds:unique(selectionIds),severity});
  for(const row of rows){
    const policy=playability(row);
    if(policy.status==="NOT_PLAYABLE")addIssue(policy.code||"POLICY_NOT_PLAYABLE",`${row.label||row.selectionId}: ${policy.reason}`,[row.selectionId]);
    const currentQuote=quote(row);
    if(!finite(currentQuote.decimal)||!currentQuote.verifiedAt||!currentQuote.source?.provider)addIssue("MISSING_VERIFIED_QUOTE",`${row.label||row.selectionId}: quota verificata non disponibile.`,[row.selectionId]);
    if(currentQuote.availability!=="AVAILABLE_AT_SNAPSHOT")addIssue("AVAILABILITY_NOT_CONFIRMED",`${row.label||row.selectionId}: disponibilità non confermata dallo snapshot.`,[row.selectionId]);
    const status=String(compatibility(row).status||"");
    if(/^INCOMPATIBILE/.test(status)||status==="INCOMPATIBLE")addIssue("MODEL_BOOKMAKER_INCOMPATIBLE",`${row.label||row.selectionId}: target bookmaker e modello non compatibili.`,[row.selectionId]);
    if(row.dataStatus==="MISSING_FROM_CURRENT_DATA")addIssue("MISSING_FROM_CURRENT_DATA",`${row.label||row.selectionId}: mercato non presente nei dati correnti; selezione conservata.`,[row.selectionId]);
  }
  for(let leftIndex=0;leftIndex<rows.length;leftIndex+=1){
    for(let rightIndex=leftIndex+1;rightIndex<rows.length;rightIndex+=1){
      const left=rows[leftIndex],right=rows[rightIndex];
      if(left.selectionId===right.selectionId){addIssue("EXACT_DUPLICATE","Selezione duplicata.",[left.selectionId]);continue}
      if(matchId(left)!==matchId(right))continue;
      if(contradictory(left,right)){
        addIssue("MARKET_CONTRADICTION",`${left.label} e ${right.label}: esiti contraddittori dello stesso mercato.`,[left.selectionId,right.selectionId]);
        continue;
      }
      const sameOverlap=overlapKey(left)&&overlapKey(left)===overlapKey(right);
      const sharedSemantic=semanticKeys(left).filter(key=>semanticKeys(right).includes(key));
      if(sameOverlap||sharedSemantic.length)addIssue("LOGICAL_OVERLAP",`${left.label} e ${right.label}: sovrapposizione logica${sharedSemantic.length?` (${sharedSemantic.join(", ")})`:""}.`,[left.selectionId,right.selectionId]);
    }
  }
  const combinationConfirmed=rows.length<=1||rows.every(row=>compatibility(row).bookmakerCombinability==="CONFIRMED");
  if(rows.length>1&&!combinationConfirmed)addIssue("BOOKMAKER_COMBINABILITY_UNKNOWN","La combinabilità della multipla non è verificata dal bookmaker.",rows.map(row=>row.selectionId));
  const usable=rows.length>0&&!issues.some(issue=>issue.severity==="blocking")&&combinationConfirmed;
  const theoreticalRows=rows.filter(row=>playability(row).status==="PLAYABLE"&&finite(quote(row).decimal)&&Number(quote(row).decimal)>0);
  return {
    issues,
    usableCombinedOdds:usable?Number(rows.reduce((total,row)=>total*Number(quote(row).decimal),1).toFixed(2)):null,
    theoreticalCombinedOdds:theoreticalRows.length?theoreticalRows.reduce((total,row)=>total*Number(quote(row).decimal),1):null,
    theoreticalQuoteCount:theoreticalRows.length,
    theoreticalExcludedCount:rows.length-theoreticalRows.length,
    combinationConfirmed,
  };
}

function emptyState(){return {version:PERSONAL_BETSLIP_VERSION,activeContext:null,contexts:{},storageError:null}}

export function createPersonalBetslipStore({storage=globalThis.localStorage,storageKey=PERSONAL_BETSLIP_STORAGE_KEY,now=()=>new Date().toISOString()}={}){
  const listeners=new Set();
  let state=emptyState();
  try{
    const parsed=JSON.parse(storage?.getItem(storageKey)||"null");
    if(parsed?.version===PERSONAL_BETSLIP_VERSION&&parsed.contexts&&typeof parsed.contexts==="object")state={...emptyState(),...parsed,storageError:null};
  }catch(error){state.storageError=`Ripristino non riuscito: ${error.message}`}
  const persist=()=>{
    try{storage?.setItem(storageKey,JSON.stringify({...state,storageError:null}));state.storageError=null}
    catch(error){state.storageError=`Salvataggio locale non riuscito: ${error.message}`}
  };
  const emit=()=>{const snapshot=getSnapshot();listeners.forEach(listener=>listener(snapshot))};
  const bucket=()=>state.activeContext?state.contexts[state.activeContext]||null:null;
  const commit=()=>{persist();emit()};
  const getSnapshot=()=>{
    const active=bucket();
    const selections=clone(active?.selections||[]);
    return {version:state.version,activeContext:state.activeContext,context:clone(active?.context||null),selections,assessment:assessSelections(selections),storageError:state.storageError};
  };
  const setContext=context=>{
    const key=contextKey(context);
    if(!key)return {status:"INVALID_CONTEXT"};
    state.activeContext=key;
    if(!state.contexts[key])state.contexts[key]={context:clone(context),selections:[],updatedAt:now()};
    commit();
    return {status:"OK",contextKey:key};
  };
  const add=selection=>{
    const active=bucket();
    if(!active)return {status:"NO_ACTIVE_CONTEXT"};
    if(!validCanonicalSelection(selection))return {status:"UNVERIFIED_IDENTITY"};
    if(contextKey(selection.context)!==state.activeContext)return {status:"CONTEXT_MISMATCH"};
    const policy=playability(selection);
    if(policy.status==="NOT_PLAYABLE")return {status:policy.code||"POLICY_NOT_PLAYABLE",reason:policy.reason};
    if(active.selections.some(row=>row.selectionId===selection.selectionId))return {status:"DUPLICATE",selectionId:selection.selectionId};
    const stored={...clone(selection),addedAt:now(),addedQuote:finite(quote(selection).decimal)?Number(quote(selection).decimal):null,quoteChanged:false,dataStatus:"CURRENT"};
    active.selections.push(stored);active.updatedAt=now();commit();
    return {status:"ADDED",selectionId:stored.selectionId,assessment:assessSelections(active.selections)};
  };
  const addMany=selections=>{
    const results=(selections||[]).map(add);
    return {status:"COMPLETE",added:results.filter(row=>row.status==="ADDED").length,duplicates:results.filter(row=>row.status==="DUPLICATE").length,rejected:results.filter(row=>!["ADDED","DUPLICATE"].includes(row.status)),results,assessment:getSnapshot().assessment};
  };
  const remove=selectionId=>{
    const active=bucket();if(!active)return {status:"NO_ACTIVE_CONTEXT"};
    const before=active.selections.length;active.selections=active.selections.filter(row=>row.selectionId!==selectionId);
    if(before===active.selections.length)return {status:"NOT_FOUND"};
    active.updatedAt=now();commit();return {status:"REMOVED",selectionId};
  };
  const clear=()=>{const active=bucket();if(!active)return {status:"NO_ACTIVE_CONTEXT"};const removed=active.selections.length;active.selections=[];active.updatedAt=now();commit();return {status:"CLEARED",removed}};
  const reconcile=latestSelections=>{
    const active=bucket();if(!active)return {status:"NO_ACTIVE_CONTEXT",updated:0,missing:0};
    const latest=new Map((latestSelections||[]).filter(validCanonicalSelection).map(row=>[row.selectionId,row]));
    let updated=0,missing=0;
    active.selections=active.selections.map(stored=>{
      const fresh=latest.get(stored.selectionId);
      if(!fresh){missing+=1;return {...stored,dataStatus:"MISSING_FROM_CURRENT_DATA"}}
      const storedQuote=quote(stored),freshQuote=quote(fresh);
      const useFresh=isoTime(freshQuote.verifiedAt)>=isoTime(storedQuote.verifiedAt);
      const changed=useFresh&&finite(freshQuote.decimal)&&Number(freshQuote.decimal)!==Number(storedQuote.decimal);
      if(useFresh){updated+=1;return {...clone(fresh),addedAt:stored.addedAt,addedQuote:stored.addedQuote,previousQuote:changed?Number(storedQuote.decimal):(stored.previousQuote??null),quoteChanged:Boolean(stored.quoteChanged||changed),dataStatus:"CURRENT"}}
      return {...stored,dataStatus:"CURRENT"};
    });
    active.updatedAt=now();commit();return {status:"RECONCILED",updated,missing};
  };
  const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener)};
  return {getSnapshot,setContext,add,addMany,remove,clear,reconcile,subscribe};
}

export function personalBetslipSummary(snapshot){
  const context=snapshot?.context;
  const heading=context?`Schedina personale · ${context.competition} ${context.season} · giornata ${context.matchday}`:"Schedina personale";
  const rows=(snapshot?.selections||[]).map((selection,index)=>{
    const currentQuote=quote(selection);
    const quoteText=finite(currentQuote.decimal)?Number(currentQuote.decimal).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}):"N/D";
    return `${index+1}. ${selection.fixture||matchId(selection)||"Partita N/D"} — ${selection.label||selection.betSelection?.market?.selection||"Selezione N/D"} @ ${quoteText} (snapshot ${currentQuote.verifiedAt||"N/D"})`;
  });
  const theoretical=snapshot?.assessment?.theoreticalCombinedOdds;
  const excluded=Number(snapshot?.assessment?.theoreticalExcludedCount)||0;
  const warning=theoretical==null?"Quota combinata teorica: N/D.":`Quota combinata teorica: ${theoretical.toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2})}${excluded?` (parziale: ${excluded} selezioni non incluse)`:""}. La combinabilità bookmaker resta una verifica separata.`;
  return [heading,...rows,warning].join("\n");
}
