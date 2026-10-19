# Collegamento 2026/27 — proposta, non attivazione

## Decisione richiesta

Il collegamento modifica i rate e quindi proiezioni, ranking e probabilità. È una modifica sostanziale: il motore di produzione resta invariato. Proposta: autorizzare prima un candidato offline per tiri/SOT, mantenendo invariati volumi squadra, quote, selezioni pubblicate e storico. L'attivazione generale richiede una successiva valutazione; non è parte di questa preparazione.

## Comportamento verificato nel codice

- `scripts/build-champions-player-markets.js` legge soltanto il dataset 2025/26 e usa `previousSeason.totals.per90`. L'identificazione parte da nomi e include un fallback nominale: il nuovo collegamento dovrà invece usare ID canonici e provider verificati.
- Affidabilità storica: `rH = clamp(mH / (mH + 900), 0, 0.82)`. Il rate è `H = rH × rateStorico + (1-rH) × priorRuolo`. I 700 minuti cambiano l'etichetta verified/limited-history, non costituiscono una soglia universale di approvazione.
- Prior per tiri/SOT: portieri 0.01/0; difensori 0.65/0.18; centrocampisti 1.35/0.42; attaccanti 2.35/0.86. Nessuna modifica proposta a questi coefficienti in questa fase.
- `player-volume-utils.js` usa rate × minuti previsti / 90; quando i minuti previsti non sono disponibili, il builder attuale usa 0.94 come esposizione. Riconcilia con il volume squadra attraverso un fattore limitato a 0.72–1.35. I minuti storici nella riga dei mercati non sono i minuti previsti della prossima gara.
- Le probabilità di tiri usano Poisson. Il rischio cartellini usa anche falli, ruolo e minuti storici: inserire dati correnti nel campo `minutes` indistintamente cambierebbe implicitamente anche questo calcolo.
- Il modulo separato `scripts/champions/context-adjusted-player-baseline.js` contiene già un candidato AEK per il blending e il contesto avversario. Il builder pubblico non lo invoca. L'estensione ai 32 club non è automaticamente autorizzata né validata da quel pilota.
- Il percorso sperimentale `substitute-minutes.js` ha già soglie documentate: almeno 3 presenze da titolare (massimo 8 recenti); per i subentranti almeno 3 panchine nominate e 2 ingressi (massimo 12 panchine). I 817 record Package 1 sono limitati ai giocatori comparsi in campo: non ricostruiscono il denominatore delle panchine nominate. Non possono, da soli, stimare la probabilità di ingresso.

## Pesi candidati motivati dal codice esistente

Usare come riferimento da valutare, senza introdurre nuovi coefficienti:

```
wE = min(0.35, mE / (mE + 900)) se il canale Champions è utilizzabile, altrimenti 0
rD = min(0.35, mD / (mD + 900)) se il canale domestico è utilizzabile, altrimenti 0
wD = rD × (1-wE)
wH = 1-wD-wE
rateCandidato = wH × H + wD × DcorrettoPerContesto + wE × E
```

900 e 0.35 provengono dal pilota esistente: conservano la regolarizzazione verso lo storico e limitano l'impatto del campione breve. Un canale con 90 minuti avrebbe peso grezzo 0.091; con 450 minuti 0.333; con 900 minuti 0.35. Questi esempi illustrano la formula, non una validazione predittiva. I coefficienti del pilota rimangono candidati, non nuovi valori approvati per tutte le squadre. Non assegnare un peso fisso 50/50 o un bonus manuale ai dati recenti.

Per il contesto, il modulo esistente ha regressione 0.2 e limiti 0.85–1.15, con forza derivata da ESI e campioni avversari. Non applicare coefficienti manuali per campionato e non estrapolare il fallback greco a tutte le leghe. Senza copertura contestuale verificabile, il candidato deve segnalare il blocco del canale invece di adottare silenziosamente un coefficiente inventato. Valutare separatamente una variante senza correzione contestuale, esplicitamente dichiarata, prima di sceglierla.

## Contratto di evidenza e rischi

1. Join per ID canonico squadra/giocatore e ID provider verificato; il caso `bodo-glimt`/`bod-glimt` e gli alias di giocatori vanno trattati con mapping esatti auditabili. Nessuna nuova risoluzione approssimativa per cognome.
2. Campioni separati: domestico, Champions, altre competizioni europee, nazionali. Non usare `allEvidenceTotals` come canale domestico e non sommare `totals` a `entries` o `totalsByCompetition`.
3. Un evento compare una sola volta per competizione/atleta. Il ledger Package 1 è già incorporato nel dataset corrente: non aggiungerlo nuovamente. Le sei righe del Package 2 sono già nello storico. Un summary che contiene due squadre non vale come due presenze dello stesso giocatore.
4. Verificare eventuali sovrapposizioni fra stagioni a calendario annuale, aggregati stagionali e referti. Quando lo storico non espone i singoli eventi, non dichiarare una deduplicazione evento per evento che il formato non consente: controllare intervalli/stagioni e bloccare sovrapposizioni non risolvibili.
5. Per ogni metrica, numeratore e minuti devono riferirsi alle stesse presenze. Sommare solo valori disponibili con tutti i minuti del campione può deprimere i rate quando mancano i tiri di alcune gare. Non trasformare assenze di metrica in zero.
6. I minuti Package 1 sono stimati. Conservare questa qualità e confrontare candidati con/senza tali esposizioni, senza inventare un fattore di sconto. Il pilota non dimostra che 90 minuti stimati abbiano l'affidabilità di 90 minuti osservati. La politica di ammissione delle stime va approvata prima dell'uso operativo.
7. Cutoff evento e reperibilità del referto devono precedere il kickoff della gara da prevedere. `asOf` non equivale a `retrievedAt`. I referti del 19 ottobre sono utilizzabili prospetticamente per il 20–21, se prima del kickoff effettivo; non possono rivalutare retroattivamente previsioni originali MD1/MD2.
8. Storico minuti, esposizione corrente e minuti previsti della prossima gara restano campi distinti. Per MD3 mancano XI e panchine: non applicare il fallback 0.94 per fabbricare candidati. I portieri non entrano nelle graduatorie di tiri.
9. Slavia, Sabah, Slovan e Shakhtar: solo canale collettivo, anche quando esistono dati individuali storici. Per Sabah la copertura collettiva non supera il gate esistente per volumi dettagliati: mantenere N/D per tiri/SOT non supportati, usando solo gli altri output collettivi già supportati.
10. Limitare il primo candidato a tiri/SOT. Gol, assist, cartellini, DUO, sostituti e altri mercati restano invariati finché non è valutato il rispettivo contratto. Le quote valide devono appartenere allo stesso contratto provider; la sola presenza di un nome nel listino non conferma identità o formazione.

## Regressioni richieste prima di un'attivazione

- Candidato con canali correnti disabilitati uguale all'output storico, a parità di input e ordine dei giocatori.
- Nessun dato corrente: peso corrente zero e fallback storico esatto; storico assente: nessuna promozione automatica di un prior a previsione approvata.
- Pesi finiti, non negativi, somma uno; zero minuti non produce per90; null rimane null; zero osservato rimane zero; copertura per metrica omogenea.
- Invarianza rispetto a ordine, copie degli overlay e riesecuzioni; nessun doppio conteggio fra domestico/UEFA e aggregati/ledger.
- SOT non superiore ai tiri; riconciliazione coerente con volumi collettivi; nessun cambiamento di quote, contratti o risultati squadra. Se il metodo attuale non garantisce queste proprietà, segnalare il blocco senza correggerlo implicitamente.
- XI e panchine mancanti, ID incerti o una delle quattro squadre: nessuna selezione individuale; gli archivi restano completi.
- Eventi futuri, match target o referti reperiti dopo il kickoff esclusi; verificare separatamente lo storico congelato.
- Minuti previsti dei subentranti stimati soltanto da panchine documentate; mai dal solo campione di presenze dei pacchetti.
- Confronto walk-forward su snapshot prepartita e successivi actual, con MAE tiri/SOT e numerosità per ruolo/competizione. I coefficienti non diventano approvati sulla base dei test unitari o delle sole 18 gare ancora da disputare. Per mercati/probabilità occorre anche calibrazione fuori campione sul contratto corretto.

## Implementato in questa sessione

Soltanto audit e manifest interni, gate testato ma non collegato al builder pubblico, e correzione del contratto temporale del test current-season. Nessun rate, peso, prior, previsione, quota o selezione è stato modificato. Il candidato di blending descritto sopra non è stato implementato né eseguito.
