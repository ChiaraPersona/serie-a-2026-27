import {createPersonalBetslipStore} from "./personal-betslip-store.mjs";

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const formatOdds=value=>Number.isFinite(Number(value))?Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}):"N/D";

export function createChampionsSelection(fixture,market,selection){
  const modifiers={...market.modifiers};
  return {
    selectionId:selection.selectionId,
    context:{competition:"champions",season:"2026-27",matchday:2},
    matchId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    label:`${market.variantName||market.marketName} · ${selection.name}`,
    selection:selection.code||selection.name,
    market:market.marketName,
    variant:market.variantName,
    modelProbability:null,
    expectedValue:null,
    betSelection:{
      selectionId:selection.selectionId,
      identity:{
        status:"VERIFIED_PROVIDER_IDS",
        matchId:fixture.fixtureId,
        providerEventId:fixture.oddsEvent.providerEventId,
        providerMarketId:market.providerMarketId,
        providerSelectionId:selection.providerSelectionId,
        providerPlayerIds:[...market.providerPlayerIds],
        canonicalPlayerIds:[...market.canonicalPlayerIds]
      },
      market:{
        name:market.marketName,
        code:market.marketCode,
        variant:market.variantName,
        threshold:market.threshold,
        selection:selection.code||selection.name,
        modifiers,
        bookmakerSemantics:{selectionName:selection.name,modifiers}
      },
      quote:{
        decimal:selection.odds,
        oddsRaw:selection.oddsRaw,
        availability:selection.quoteAvailability,
        verifiedAt:fixture.oddsEvent.retrievedAt,
        source:{provider:"Sisal"}
      },
      compatibility:{status:market.forecastCompatibility,bookmakerCombinability:"UNKNOWN"},
      operational:{playability:{status:"PLAYABLE"}},
      overlap:{overlapKey:`${fixture.fixtureId}:${market.providerMarketId}`,semanticKeys:[]}
    }
  };
}

const modifierLabels=market=>[
  market.replacementIncluded?"sostituto incluso":null,
  market.woodworkIncluded?"pali/traverse":null,
  market.periodScope==="first-half"?"primo tempo":null,
  market.periodScope==="both-halves"?"entrambi i tempi":null,
  market.threshold!=null?`soglia ${market.threshold}`:null
].filter(Boolean);

export function mountChampionsMarketUi(fixture,{storage=globalThis.localStorage,publishedSelections=[]}={}){
  const root=document.querySelector(`[data-champions-market-root][data-fixture-id="${CSS.escape(fixture.fixtureId)}"]`);
  if(!root)return null;
  const scope=root.closest(".champions-sisal-catalog")||root;
  const store=createPersonalBetslipStore({storage});
  store.setContext({competition:"champions",season:"2026-27",matchday:2});
  const catalogContracts=fixture.oddsEvent.playerMarkets.flatMap(market=>market.selections.filter(selection=>selection.interfaceSelectable).map(selection=>createChampionsSelection(fixture,market,selection)));
  const contracts=[...new Map([...catalogContracts,...publishedSelections].map(selection=>[selection.selectionId,selection])).values()];
  const retainedOtherFixtures=store.getSnapshot().selections.filter(row=>row.betSelection?.identity?.matchId!==fixture.fixtureId);
  store.reconcile([...retainedOtherFixtures,...contracts]);

  root.innerHTML=`<div class="champions-market-layout"><div class="champions-market-browser"><div class="champions-market-controls"><label><span>Cerca mercato o giocatore</span><input type="search" data-market-search placeholder="Es. tiri, Veerman, primo tempo"></label><label class="champions-market-toggle"><input type="checkbox" data-market-selectable checked><span>Solo quote disponibili</span></label><strong data-market-count></strong></div><div class="champions-market-list" data-market-list></div><div class="champions-market-more"><button type="button" data-market-more>Mostra altri 100</button><button type="button" data-market-all>Mostra tutti</button></div></div><aside class="champions-market-slip" aria-labelledby="champions-market-slip-title"><header><p class="eyebrow">Sincronizzata per fixtureId</p><h3 id="champions-market-slip-title">La mia schedina</h3><a href="schedina.html?competizione=champions&amp;giornata=2">Apri nella pagina Schedina →</a></header><div data-market-slip></div></aside></div>`;
  const list=root.querySelector("[data-market-list]");
  const search=root.querySelector("[data-market-search]");
  const selectableOnly=root.querySelector("[data-market-selectable]");
  const count=root.querySelector("[data-market-count]");
  const more=root.querySelector("[data-market-more]");
  const all=root.querySelector("[data-market-all]");
  let limit=100;

  const filteredMarkets=()=>{
    const query=search.value.trim().toLocaleLowerCase("it");
    return fixture.oddsEvent.playerMarkets.filter(market=>{
      if(selectableOnly.checked&&!market.selections.some(selection=>selection.interfaceSelectable))return false;
      if(!query)return true;
      return `${market.marketName} ${market.variantName} ${market.selections.map(selection=>selection.name).join(" ")}`.toLocaleLowerCase("it").includes(query);
    });
  };
  const renderMarkets=()=>{
    const rows=filteredMarkets();
    const shown=rows.slice(0,limit);
    count.textContent=`${shown.length.toLocaleString("it-IT")} di ${rows.length.toLocaleString("it-IT")} mercati`;
    list.innerHTML=shown.map(market=>{
      const tags=modifierLabels(market).map(label=>`<span>${esc(label)}</span>`).join("");
      const selections=market.selections.map(selection=>`<li><div><strong>${esc(selection.name)}</strong><small>ID ${esc(selection.providerSelectionId)} · Prob. N/D · EV N/D</small></div><b>${formatOdds(selection.odds)}</b><button type="button" data-add-selection="${esc(selection.selectionId)}" ${selection.interfaceSelectable?"":"disabled"}>${selection.interfaceSelectable?"Aggiungi":"N/D"}</button></li>`).join("");
      return `<details class="champions-market-card"><summary><span><small>${esc(market.marketCode)} · ID ${esc(market.providerMarketId)}</small><strong>${esc(market.variantName||market.marketName)}</strong></span><span class="champions-market-tags">${tags}</span></summary><ul>${selections}</ul></details>`;
    }).join("")||`<p class="reading-panel-empty">Nessun mercato corrisponde ai filtri.</p>`;
    more.hidden=shown.length>=rows.length;
    all.hidden=shown.length>=rows.length;
  };
  const renderSlip=snapshot=>{
    const container=root.querySelector("[data-market-slip]");
    const rows=snapshot.selections;
    const theoretical=snapshot.assessment.theoreticalCombinedOdds;
    container.innerHTML=rows.length?`<ol>${rows.map(row=>`<li><div><small>${esc(row.fixture)}</small><strong>${esc(row.label)}</strong><span>${modifierLabels({...(row.betSelection?.market?.modifiers||{}),threshold:row.betSelection?.market?.threshold}).map(esc).join(" · ")||"contratto originale"}</span></div><b>${formatOdds(row.betSelection?.quote?.decimal)}</b><button type="button" data-remove-selection="${esc(row.selectionId)}" aria-label="Rimuovi ${esc(row.label)}">×</button></li>`).join("")}</ol><div class="champions-market-total"><span>Quota combinata teorica</span><strong>${formatOdds(theoretical)}</strong><small>La combinabilità bookmaker resta separata.</small></div><button type="button" class="champions-market-clear" data-clear-slip>Svuota schedina</button>`:`<p class="champions-market-empty">Nessuna selezione. Le quote valide possono essere aggiunte anche con probabilità ed EV N/D.</p>`;
  };
  const renderPublished=snapshot=>{
    const selected=new Set(snapshot.selections.map(row=>row.selectionId));
    scope.querySelectorAll("[data-add-published-selection]").forEach(button=>{
      const active=selected.has(button.dataset.addPublishedSelection);
      button.setAttribute("aria-pressed",String(active));
      button.textContent=active?"Aggiunta":"Aggiungi";
    });
  };
  const byId=new Map(contracts.map(row=>[row.selectionId,row]));
  scope.addEventListener("click",event=>{
    const published=event.target.closest("[data-add-published-selection]");
    if(published){const row=byId.get(published.dataset.addPublishedSelection);if(row)store.add(row);return}
    const add=event.target.closest("[data-add-selection]");
    if(add){const row=byId.get(add.dataset.addSelection);if(row)store.add(row);return}
    const remove=event.target.closest("[data-remove-selection]");
    if(remove){store.remove(remove.dataset.removeSelection);return}
    if(event.target.closest("[data-clear-slip]")){store.clear();return}
    if(event.target.closest("[data-market-more]")){limit+=100;renderMarkets();return}
    if(event.target.closest("[data-market-all]")){limit=Number.MAX_SAFE_INTEGER;renderMarkets()}
  });
  search.addEventListener("input",()=>{limit=100;renderMarkets()});
  selectableOnly.addEventListener("change",()=>{limit=100;renderMarkets()});
  store.subscribe(snapshot=>{renderSlip(snapshot);renderPublished(snapshot)});
  renderMarkets();
  renderSlip(store.getSnapshot());
  renderPublished(store.getSnapshot());
  return {store,contracts,renderMarkets};
}
