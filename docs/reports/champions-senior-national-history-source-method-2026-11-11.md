# Metodo fonti nazionali maggiori 2025/26 — 11 novembre 2026

Ricerca tecnica primaria per acquisire statistiche della sola nazionale maggiore maschile nella finestra concordata 1 luglio 2025–30 giugno 2026. Nessuna modifica a dataset o codice di produzione da questa ricerca. Le prove API sono state effettuate direttamente l’11 novembre tramite Python; i probe sono in `output/probe-national-*.py` e `output/probe-arab-cup-espn.py`.

## Indici e parametri verificati

Il [catalogo core ESPN delle competizioni](https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000) restituisce 220 slug in una pagina. Le definizioni core consultate espongono `gender=MALE`; il nome esatto distingue le competizioni senior da femminili, giovanili e club. Il codice non deve interpretare automaticamente tutti gli slug `fifa.*` come nazionali maggiori.

Il percorso più efficiente verificato è [indice eventi UEFA WCQ per finestra](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.worldq.uefa/events?dates=20250701-20260630&limit=1000): 156 riferimenti evento, `pageCount=1`. La controprova con [gennaio–giugno 2025](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.worldq.uefa/events?dates=20250101-20250630&limit=1000) restituisce 48 riferimenti differenti, dimostrando che il filtro date è applicato. Con la stessa finestra, [amichevoli](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.friendly/events?dates=20250701-20260630&limit=1000) restituisce 457 eventi in una pagina e [Mondiale](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/events?dates=20250701-20260630&limit=1000) 79. Verificare sempre `pageCount` e acquisire ogni pagina; questi conteggi non autorizzano a presumere che qualunque campione futuro stia in una pagina.

Il site scoreboard ha un comportamento differente:

- [UEFA WCQ settembre 2025, `dates=202509`](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=202509): funziona, 48 gare.
- [5 settembre, `dates=20250905`](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250905): funziona, 10 gare.
- `dates=20250901-20250930` e `dates=20250901-20250907`: HTTP 400, sia con limit 100 sia 1000. Non usare gli intervalli con trattino sul site scoreboard: utilizzare il mese YYYYMM, il giorno YYYYMMDD oppure l’indice core sopra.
- `/leagues/{slug}/seasons/2025/events` e l’omologo 2026: HTTP 404 nei test. Non sostituire il percorso core root events con un percorso stagione non verificato.

L’indice per data evita inoltre l’ambiguità degli anni ESPN delle competizioni di nazionale: il [referto Polonia–Svezia del 31 marzo 2026](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/summary?event=761954) dichiara `header.season.year=2025` e nome `2026 World Cup Qualifying - UEFA`. Il solo numero stagione non coincide quindi con una finestra luglio–giugno. Gli endpoint atleta senza stagione nel percorso possono ignorare `?season=2026`, come già documentato nell’audit precedente; preferire il calendario e filtrare la data di ciascun referto.

## Whitelist ESPN verificabile

Tutti i seguenti slug compaiono nel catalogo primario. Il solo namespace non sostituisce la verifica del nome della competizione e dei partecipanti nel referto.

### Gare ufficiali senior

```text
fifa.world
fifa.worldq.uefa
fifa.worldq.concacaf
fifa.worldq.afc
fifa.worldq.caf
fifa.worldq.conmebol
fifa.worldq.ofc
fifa.wcq.ply
uefa.nations
uefa.euro
uefa.euroq
conmebol.america
concacaf.gold
concacaf.gold_qual
concacaf.nations.league
concacaf.confederations_playoff
caf.nations
caf.nations_qual
caf.championship
caf.cosafa
afc.asian.cup
afc.cupq
afc.saff.championship
global.gulf_cup
global.finalissima
```

Definizioni primarie aperte direttamente: [playoff Mondiale](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.wcq.ply), [AFC qualificazioni](https://sports.core.api.espn.com/v2/sports/soccer/leagues/afc.cupq), [African Nations Championship](https://sports.core.api.espn.com/v2/sports/soccer/leagues/caf.championship), [COSAFA](https://sports.core.api.espn.com/v2/sports/soccer/leagues/caf.cosafa), [SAFF](https://sports.core.api.espn.com/v2/sports/soccer/leagues/afc.saff.championship), [Gulf Cup](https://sports.core.api.espn.com/v2/sports/soccer/leagues/global.gulf_cup), [Finalissima](https://sports.core.api.espn.com/v2/sports/soccer/leagues/global.finalissima), [Concacaf Cup](https://sports.core.api.espn.com/v2/sports/soccer/leagues/concacaf.confederations_playoff). Tutte restituiscono `gender=MALE`; CHAN è una selezione senior con restrizioni ai giocatori di campionati domestici, non una competizione giovanile, e va tenuta distinguibile dai tornei maggiori senza restrizione.

### Amichevoli senior

Solo [fifa.friendly](https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.friendly), nome `International Friendly`, abbreviazione nei referti `Men’s International Friendly`, gender MALE. Non usare `international.friendly`, che non è lo slug osservato. Escludere `fifa.friendly_u21`, i namespace women, U17/U19/U20/U21/U23 e olimpiadi; escludere i club come `fifa.cwc` e `fifa.intercontinental.cup`. Un nome generico o un flag `isNational` non dimostrano da soli che una squadra sia la nazionale maggiore; controllare eventuali suffissi d’età/A/B nel partecipante e non risolverli approssimativamente.

## Limite noto: Coppa Araba 2025

La [FIFA conferma il torneo](https://inside.fifa.com/official-documents/annual-report/2025/2025-at-a-glance/fifa-arab-cup-qatar-2025) e conserva [liste ufficiali giocatori](https://fdp.fifa.org/assetspublic/ce252/pdf/SquadLists-English.pdf), con intervallo 25 novembre–18 dicembre 2025 comprendente la qualificazione. È un evento nella finestra concordata; le squadre possono usare selezioni diverse per disponibilità dei giocatori, ma non è un torneo U21 da scartare per nome.

Il catalogo ESPN di 220 competizioni non contiene uno slug Arab Cup. Sono stati provati i namespace core `fifa.arab`, `fifa.arab_cup`, `fifa.arab.cup`, `fifa.arabcup`, `global.arab_cup`, `global.arab.cup`, `arab.cup`: tutti HTTP 400. Questo prova soltanto l’indisponibilità di questi percorsi, non che ESPN o altre fonti non possiedano il dato. Non inventare uno slug e non riclassificare le gare come amichevoli per aggirare il limite. Se non acquisita da FIFA o secondo provider con identità verificate, la Coppa Araba va dichiarata come lacuna di copertura e non si deve chiamare lo storico “completo per tutte le nazionali”.

## Date effettive, supplementari e rigori

Lo [scoreboard Mondiale del 30 giugno 2026](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260630) include la gara 760491 Ecuador–Messico con data effettiva UTC `2026-07-01T02:00Z`: il giorno calendario della pagina riflette il contesto locale della gara. Il filtro finale deve utilizzare il timestamp effettivo con la convenzione di fuso dichiarata, non solo il mese/giorno della richiesta. La finestra termina il 30 giugno: le gare mondiali di luglio 2026 non entrano automaticamente nel campione 2025/26.

Lo [scoreboard playoff UEFA del 31 marzo 2026](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20260331) dimostra i segnali:

- 761952 Bosnia–Italia e 761955 Cechia–Danimarca: `STATUS_FINAL_PEN`, clock 7200, display 120 minuti, period 5.
- 761954 Svezia–Polonia: `STATUS_FULL_TIME`, clock 5400, period 2.

Il summary può riportare soltanto `status.type` e omettere clock e period. Controllare quindi anche `type.name`, descrizione, dettagli e, quando necessario, il metadato evento/scoreboard. Una partita ai rigori può terminare dopo 90 oppure dopo 120: non assumere automaticamente 120 dalla sola stringa PEN. Non applicare il cap a 90 delle vecchie funzioni club a una gara con supplementari e poi sommare tiri dell’intera gara. Se i minuti sull’intera durata sono verificabili, mantenerli come full-match con ambito esplicito; se non sono verificabili, lasciare minuti/per90 N/D oppure conservare la gara in un bucket tecnico separato, senza dichiarare copertura completa. I gol della serie rigori non sono gol individuali della partita.

## Identità, metriche e conteggi raccomandati

- Associare i giocatori solo per ID ESPN già verificato, entro il namespace provider. Un’identità non risolta non autorizza lookup approssimativi né zero presenze.
- Deduplicare per evento e giocatore, conservando la competizione del referto originale; un evento eventualmente visto da più indici entra una volta sola.
- Verificare `completed=true`, data nel periodo, competizione senior ammessa, squadra e ID atleta del roster.
- Il flag `played` dell’eventlog non basta: gli audit precedenti hanno trovato panchine `played=true` con `roster.stats.appearances=0`. Dare priorità al referto del match.
- Presenze/minuti e tiri/SOT mancanti richiedono denominatori separati; non equiparare null e zero. Una risposta con solo `$ref` non prova zero presenze.
- Club, nazionale ufficiali e nazionale amichevoli devono restare distinti. I totali nazionali per ciclo competizione non vanno sommati se non filtrabili alla finestra esatta luglio–giugno.
- Conservare URL, timestamp, hash e motivi di esclusione internamente; la policy pubblica del progetto esclude sezioni Fonti/Provenienza.
