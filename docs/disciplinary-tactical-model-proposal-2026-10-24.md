# Rischio disciplinare, duelli e canali: proposta di analisi

Data: 24 ottobre 2026. Stato: **proposta di ricerca**, nessun nuovo modello validato o pubblicato. Questa analisi riguarda il comportamento dei giocatori e le informazioni disponibili prima della partita. Non modifica formule, pronostici, quote, liquidazioni o pagine pubbliche.

## Decisione

Sviluppare una rete di interazioni tra giocatori, distinta per fase di gioco, e verificare se aggiunge capacità predittiva alla baseline disciplinare. Un giocatore può avere più avversari rilevanti; tutti i ruoli sono ammessi. I canali descrivono l'esposizione alle azioni, mentre i duelli descrivono le persone e i compiti coinvolti. L'informazione deve contribuire una sola volta quando rappresenta la medesima esposizione.

Il primo risultato sarà descrittivo e verificabile: abbinamenti tattici plausibili, evidenze, incertezze. Le probabilità numeriche richiedono una validazione separata. Un abbinamento ben raccontato non dimostra da solo un miglioramento della previsione.

## 1. Riscontro sul progetto attuale

Verifica in sola lettura del codice e dei file presenti in questo checkout; i conteggi sono una fotografia locale, non un replay di snapshot prepartita immutabili.

| Verifica | Risultato | Evidenza locale |
|---|---|---|
| Candidati pubblicati MD8 | 50 in 10 fixture; 50 ID canonici; 0 avversari diretti valorizzati | `data/normalized/predictions.json`, filtro `matchId` terminante in `md-08`, campo `likelyBooked` |
| Ruoli dei 50 candidati | 38 difensori, 10 centrocampisti, 2 attaccanti | Stesso filtro; è la composizione dell'output, non una misura di bias predittivo |
| Diagnosi della regola di abbinamento sugli XI attuali | 34 candidati con più avversari idonei sul lato opposto; 14 esclusi per lato centrale; 2 per ruolo attaccante | `scripts/predictions/engine.js`, `directDuel`; fonti ufficiali per fixture quando presenti, altrimenti `probable-lineups-md8-2026-27.json` con `lineupStatus === 'starter'`; join roster esclusivamente per `playerId` |
| Input individuali storici degli XI | 220 posti; 218 join al roster generato già esistente; 213 con `foulsWon/90` numerico; nessun campo dribbling nel relativo blocco `per90` | `data/generated/team-pages/*-squad.json`. Le due assenze di join non dimostrano assenza nel registro identità: il builder può aggiungere schede minime |
| Partite precedenti alla MD8 | 70 gare Serie A concluse MD1–MD7; 236 record disciplinari; nessun campo per motivo della sanzione o avversario collegato nei record | `data/normalized/matches.json`, `bookings`; il numero di record non è un conteggio di ammonizioni ordinarie né di esiti bookmaker |
| Statistiche individuali di quelle gare | 2.226 righe con `foulsWon` numerico; nessun campo dribbling nelle righe ispezionate | `playerStats.home/away`; la presenza numerica non certifica da sola completezza o disponibilità prepartita |
| Canali utilizzati dal motore | Pesi euristici ricavati da etichette tattiche, poi normalizzati in percentuale | `engine.js`, `attackChannels`: base 1/1/1, incrementi per etichette di fascia, centro, ampiezza, cross e filtranti |
| Età dei profili tattici | Tutti e 20 hanno `season: 2025-26`; 3 dichiarano anche `characteristicsSeason: 2026-27`, 17 non la specificano | `data/normalized/team-style-profiles.json`; serve verifica della data per singolo campo |

La diagnosi conta soltanto gli undici: l'array delle probabili include anche riserve, che non devono entrare indiscriminatamente negli avversari iniziali. I risultati descrivono la regola applicata agli input attuali, senza pretendere di riprodurre ogni risoluzione di nomi del vecchio builder.

Il problema non è semplicemente l'assenza di statistiche dei falli subiti. `directDuel` pretende esattamente un avversario sul lato opposto e non distingue abbastanza profondità e compiti. Può quindi rendere ambiguo un confronto includendo, ad esempio, sia un esterno sia un difensore centrale avversario sul medesimo lato.

Altre caratteristiche rilevanti del motore attuale:

- Il rischio combina cartellini storici, falli storici/correnti, una base fissa per ruolo, canale, arbitro e contesto squadra. La base nominale è 1,15 per difensori, 0,95 per centrocampisti, 0,48 per gli altri ruoli ammessi. Questo privilegia strutturalmente alcuni ruoli, ma l'adeguatezza va misurata sui dati.
- La quota corrente aggiorna i falli; `estimatedCards` resta il valore storico. I minuti attesi allegati in `cardResearchFeatures` sono marcati `usedInLegacyRiskScore: false` e non vanno descritti come ingrediente del punteggio corrente.
- I portieri sono esclusi dal ranking attuale. La ricerca proposta li include, lasciando ai dati la valutazione del loro rischio.
- Il ranking conserva cinque nomi e può sostituire l'ultimo per rappresentare entrambe le squadre. La ricerca deve valutare tutto l'universo ammissibile e rendere distinta questa scelta di presentazione.
- Il primo del ranking viene etichettato euristicamente come possibile primo ammonito. Prevedere chi riceverà almeno un giallo e chi sarà il primo sono due bersagli diversi.

Riferimenti: [motore](../scripts/predictions/engine.js), [builder e metadati di esposizione](../scripts/build-predictions.js), [contratti disciplinari](card-data-targets-v1.md).

## 2. Che cosa prevedere

Mantenere il contratto di ricerca già definito: `RECORDED_YELLOW` è un giallo ordinario osservato nel feed completo, con le sue specifiche regole di contesto. Non diventa automaticamente `PLAYER_YELLOW`, `PLAYER_ANY_CARD`, DUO o primo ammonito. Una scheda distinta deve dichiarare bersaglio, popolazione, copertura e orizzonte.

La baseline di rischio totale può usare le caratteristiche tattiche come predittori. Non possiamo decomporre numericamente i gialli in falli, proteste e ritardi con i 236 record attuali, perché mancano le cause. Lo storico totale resta una baseline complessiva, non una prova di proteste o indisciplina comportamentale. Sommare a quella baseline un'altra componente ricavata dagli stessi cartellini conterebbe due volte l'evidenza.

Una futura analisi delle cause richiederà eventi classificati e copertura sufficiente. Se si definisce un bersaglio diverso, per esempio il solo giallo in campo, occorrono una nuova versione e la certificazione del contesto: non si restringe silenziosamente il target attuale.

## 3. Interazioni per tutti i ruoli

Il grafo ha come nodi ID canonici dei giocatori e come relazioni potenziali confronti in una fase di gioco. Non è una mappa obbligatoria uno-contro-uno.

| Fase | Esempi di coinvolgimento da verificare | Informazioni utili |
|---|---|---|
| Difesa organizzata | Terzino contro ala; mezzala in raddoppio; centrale contro punta; mediano sul trequartista | Posizione nella fixture, sistema senza palla, canale offensivo avversario, coperture documentate |
| Transizione difensiva | Mediano o attaccante che rincorre il portatore; difensore che esce dalla linea | Recuperi/perdite e azioni di transizione, quando misurati; semplice modulo insufficiente |
| Pressing | Punta sul centrale; trequartista sul mediano; esterno sul terzino | Compiti di pressione e falli correlati, se disponibili |
| Possesso e contesa offensiva | Punta contro centrale; giocatore che protegge palla; duello aereo o seconda palla | Falli offensivi/eventi collegati, tempo in possesso e azioni della propria squadra |
| Altre condotte | Proteste, ritardi, infrazioni reiterate, condotte del portiere | Motivo esplicito della sanzione; altrimenti resta solo la baseline complessiva |

Il medesimo giocatore può comparire in più righe. Il ruolo nominale è un'informazione iniziale, non un'esclusione. Non è corretto usare soltanto gli attacchi avversari per spiegare i falli offensivi di una punta: servono anche le fasi di possesso della sua squadra.

Per gli abbinamenti:

1. Risolvere fixture, squadra e giocatore per ID; identità irrisolta rimane tale, senza confronti approssimativi dei nomi.
2. Leggere la posizione specifica della partita. Una posizione storica nella rosa non dimostra il compito corrente; l'ordine della distinta permette di ricavare il lato solo se la convenzione è documentata.
3. Collegare gli avversari compatibili per zona, profondità e fase. Consentire avversario prevalente, copertura e alternativa solo quando le evidenze giustificano questa distinzione; altrimenti usare un insieme non ordinato.
4. Registrare per ogni relazione come è stata ottenuta: `OBSERVED_HISTORICAL`, `TACTICAL_ESTIMATE` o `UNKNOWN`. Un duello osservato in passato non certifica quello futuro.
5. Tenere separati partecipazione, sovrapposizione temporale e affidabilità dell'abbinamento. Una XI ufficiale certifica i titolari, non la marcatura; due medie di minuti non identificano esattamente i minuti di sovrapposizione.

Le coordinate di `js/components/lineup-field.mjs` sono geometria del disegno, non dati di tracking: nessuna distanza calcolata su quel campo deve essere presentata come prossimità reale o frequenza di duello.

## 4. Canali d'attacco senza falsa precisione

Distinguere tre stati:

- **Misurato:** quota di azioni in una zona con definizione dell'azione, periodo, numero di eventi, copertura, competizione e orientamento del campo.
- **Stimato qualitativamente:** etichette come preferenza a sinistra o gioco sulle fasce. È la natura del segnale oggi tradotto dal motore in percentuali; non va riletto come frequenza osservata.
- **Non disponibile:** nessun segnale sostenuto. Nessun 33/33/33 spacciato per dato della squadra.

Una quota di attacchi a sinistra va collegata alla zona difensiva opposta soltanto dopo aver verificato l'orientamento. Un'elevata quota relativa non implica da sola molti attacchi: va distinta dal volume assoluto. Servono inoltre azioni comparabili; posizione dei tiri, avanzamenti e ingressi nell'ultimo terzo non sono lo stesso canale.

Canali e relazioni non devono essere due bonus indipendenti alla medesima pressione. La proposta quantitativa da testare usa una sola rappresentazione dell'esposizione per zona/fase e i profili degli avversari compatibili all'interno di quella esposizione. Le frequenze di coinvolgimento rimangono `null` finché non sono misurate o stimate da un modello validato. Nella fase descrittiva non distribuire percentuali arbitrarie tra due possibili avversari.

## 5. Modello statistico candidato

Riutilizzare il framework C0–C4 e aggiungere un esperimento separato, senza riscrivere i suoi risultati. Partire da una baseline parsimoniosa con storico individuale regolarizzato, ruolo come prior, esposizione prepartita e falli disponibili. Aggiungere poche caratteristiche tattiche dichiarate prima della valutazione, con regolarizzazione e coefficienti appresi soltanto nel passato.

La forma iniziale da valutare può essere una regressione logistica regolarizzata, coerente con il framework; un modello gerarchico o di sopravvivenza è un'estensione solo se i dati e il bersaglio la giustificano. Non fissare ora pesi percentuali o moltiplicatori da intuizione. Il ruolo può avere un effetto stimato e regolarizzato; non deve azzerare il contributo degli attaccanti.

Lo storico di falli subiti dell'avversario è un segnale utile ma non prova di dribbling, velocità o pericolosità nel duello. Allo stesso modo, molti falli commessi non implicano automaticamente molte ammonizioni: la severità e il contesto, quando disponibili, costituiscono evidenze ulteriori.

Il primo ammonito richiede una valutazione temporale e il rischio concorrente degli altri giocatori; non si ottiene assegnando quel titolo al numero uno del ranking di giallo complessivo.

## 6. Verifica necessaria

Due verifiche distinte:

**Validità tattica:** controllo di identità, orientamento, compatibilità di zona e compiti; confronto con eventi collegati o osservazioni documentate. Errori da misurare includono avversario fuori XI, fascia invertita, difensore-avversario selezionato solo per coincidenza del lato, falsa unicità e mancata copertura dei ruoli centrali. Senza eventi o annotazioni indipendenti si può verificare la coerenza, non quantificare l'accuratezza delle marcature.

**Utilità predittiva:** stesso universo di candidati e stessi cutoff per baseline, baseline + canali, baseline + duelli, combinazione congiunta. Il legacy è confrontabile come ranking; non trasformare `riskScore` in probabilità dividendolo per 100 o 150.

Congelare gli input prima del kickoff. Eventi, minuti effettivi e XI effettivi conosciuti dopo non diventano caratteristiche prepartita. Anche timestamp di disponibilità, probabili e aggregati storici devono essere verificati; i 70 match oggi presenti non equivalgono automaticamente a 70 match utili per training senza leakage.

Usare split cronologici per partita, trasformazioni e calibrazione dentro i segmenti di training/validazione appropriati, test finale separato, confronti appaiati e bootstrap per partita. Valutare Brier/log loss e curva di calibrazione per probabilità valide; precisione dei primi nomi, richiamo e lift per ranking, con denominatori e copertura. Esaminare i risultati per ruolo, minuti previsti, competizione e stato probabile/ufficiale.

La ricerca del 4 ottobre, verificata nel report locale, contiene 2.037 osservazioni su 49 partite, 145 positivi osservazionali e leader `UNRESOLVED`. Questi sono risultati di quel report, non un aggiornamento al 24 ottobre. Non costituiscono prova a favore del nuovo ramo tattico. Le soglie minime del protocollo rendono eseguibile il confronto, non garantiscono potenza o stabilità.

Serie A e Champions richiedono verifiche separate; un eventuale pooling deve modellare e validare le differenze di competizione. Nessuna promozione automatica per una singola metrica migliore o per spiegazioni più convincenti.

## 7. Contratto del prototipo e presentazione proposta

Output interno per giocatore:

```json
{
  "fixtureId": "canonical-fixture-id",
  "playerId": "canonical-player-id",
  "lineupStatus": "probable",
  "asOf": "verified-pre-kickoff-timestamp",
  "roleInFixture": null,
  "interactions": [
    {
      "opponentPlayerId": "canonical-opponent-id",
      "phase": "organized-defence",
      "relation": "possible-cover",
      "status": "TACTICAL_ESTIMATE",
      "evidenceRefs": [],
      "unresolved": ["coverage-duty-unverified"],
      "exposureShare": null
    }
  ],
  "channelEvidence": {"status": "QUALITATIVE", "observedShare": null},
  "validatedCardProbability": null,
  "publicationState": "RESEARCH"
}
```

Schema illustrativo, non payload operativo: una relazione senza evidenze resta irrisolta e non viene presentata come accertata. Riferimenti, URL e documentazione restano interni; l'eventuale UI mostra stato e limiti senza sezioni pubbliche sulle fonti, rispettando le attribuzioni obbligatorie.

Esempio di forma della futura motivazione, con nomi segnaposto: «Possibili confronti con A e B nel settore destro. Coinvolgimento previsto in copertura; preferenza offensiva avversaria a sinistra stimata dal profilo tattico. Compito di raddoppio da confermare». Numeri e caratteristiche del singolo vengono aggiunti solo se presenti. La spiegazione deve riflettere il modello usato: un duello descrittivo non può essere indicato come causa di un punteggio legacy che non lo utilizza.

GPT può aiutare a strutturare evidenze e spiegazioni vincolate agli ID e ai campi disponibili. Non assegna probabilità di marcatura, cause di cartellino o pesi statistici senza un metodo verificato. Ogni output deve essere riproducibile o conservato con versione e input.

## 8. Ordine di lavoro raccomandato

1. **Audit del contratto e degli input:** inventario di XI/posizioni, età dei profili, target, copertura e semantica dei canali; integrare gli stati mancanti nel solo prototipo.
2. **Grafo descrittivo:** abbinamenti molti-a-molti per tutti i ruoli, controlli di orientamento e identità, esempi revisionabili; nessun peso arbitrario.
3. **Snapshot prospettici:** congelare prima delle prossime gare eleggibili. Le partite già iniziate/concluse restano soltanto materiale storico con i relativi limiti.
4. **Esperimento statistico:** ablation, calibrazione e controlli per ruolo sul campione temporale valido. I componenti che non dimostrano utilità restano descrittivi o esclusi.
5. **Proposta di integrazione:** solo con evidenza sufficiente e verifica della compatibilità con i contratti pubblicati; mantenere distinta la graduatoria di rischio da eventuali probabilità validate.

Il risultato da perseguire è una motivazione riconducibile a persone, fasi e dati verificabili, con una dimostrazione separata dell'utilità predittiva.

## Riferimenti

- [Verifica delle fonti primarie IFAB, StatsBomb e scikit-learn](disciplinary-tactical-methods-sources-2026-10-24.md).
- [Protocollo C0–C4](card-prediction-research-c0-c4.md) e [contratti dei dati disciplinari](card-data-targets-v1.md).
- [Report osservazionale del 4 ottobre](../output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.md).
- [Motore attuale](../scripts/predictions/engine.js), [builder](../scripts/build-predictions.js), [geometria illustrativa delle formazioni](../js/components/lineup-field.mjs).
