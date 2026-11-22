# Aspettativa gara: CL5

## Approfondimento successivo

I commenti iniziali sono stati ampliati con un'analisi individuale riproducibile delle 18 gare: `scripts/research/champions-md5-expectation-analysis.py`. Report completo e input con SHA256: `data/analysis/champions/md5-expectations-2026-11-20/REPORT.md`; dati: `results.json` nella stessa directory. Il generatore `scripts/research/write-champions-expectation-comparisons.py` produce esclusivamente il testo pubblico in `js/pages/reading-detail/champions-expectation-comparisons.mjs`.

Per ogni squadra sono separati campionato corrente, campione domestico per sede, ultime cinque domestiche, quattro gare Champions e gare Champions per sede. Crosswalk provider esatti; sei righe duplicate LASK riconciliate per giornata/sede con punteggi coerenti (avversari controllati nella revisione indipendente). Slavia domestico N/D; Sabah campione interno parziale di otto gare, distinto dai dieci risultati ufficiali verificati nel suo commento dedicato.

Confronti: gol operativi correnti, prova Opta diretta congelata e sensibilità descrittiva `lambda_casa=(GF_europei_casa+GA_europei_ospite)/2`, `lambda_ospite=(GF_europei_ospite+GA_europei_casa)/2`, dove casa/ospite identifica la squadra e GF/GA sono medie sulle quattro gare europee complessive, non sulle sole gare per sede. Le ultime due grandezze generano distribuzioni Poisson distinte, mai mescolate con l'1X2 operativo. Nessun nuovo fitting, soglia di approvazione o promozione del modello. Questa sensibilità non aggiusta forza degli avversari, leghe o sede: non dimostra una nuova stima attendibile. Per Sabah produce 1,25–3,00, distinto dalla precedente ipotesi manuale 3,50 sul Barcelona.

La forza degli avversari è riassunta separatamente con rating correnti, senza presentarli come rating prepartita storici o fattori correttivi applicati. Una revisione indipendente ha riprodotto i totali delle 36 squadre, massa/medie e primi tre punteggi delle 18 distribuzioni con griglia 80×80. Test del renderer: tutti i valori corrente/prova coerenti al report, 18/18 commenti, fixture estranee e concluse escluse. Sintassi e risposta HTTP controllate; nessuna verifica visiva in questa estensione. Versioni moduli e shell aggiornate.

Estensione editoriale alle 18 fixture `ucl-2026-27-md05-01` … `18`, 24–25 novembre 2026. Testi in `js/pages/reading-detail/champions-expectation.mjs`, montati prima della sezione Formazioni. Nessuna modifica a previsioni, formule, selezioni o quote.

## Evidenze interne

- Calendario e identificativi: `data/normalized/champions-league-2026-27.json`.
- Risultati europei per ciascuna squadra: `data/generated/champions-team-history.json`, sole gare Champions 2026/27 precedenti alla fixture. Verificare i risultati nel calendario canonico per eventuali aggiornamenti.
- Forma domestica: `data/sources/champions-pilot-match-stats-2025-27.json`, stagione 2026/27, lega assegnata al team, crosswalk per provider, cutoff 20 novembre; risultati disponibili fino all'8 novembre. Nessuna media aggregata su righe di provider diversi: i riferimenti numerici europei usano le quattro fixture canoniche. Per Slavia copertura domestica insufficiente dichiarata nel testo.
- Sabah–Barcelona mantiene il commento già provato e i riscontri ufficiali nei report `sabah-barcelona-primary-check-2026-11-20.md` e `sabah-barcelona-goal-estimate-check-2026-11-20.md`.

Le considerazioni su controllo della gara e possibilità di vittoria larga sono interpretazioni qualitative, non probabilità calibrate. Non si applicano bonus fissi di campionato né si trasformano risultati estremi (Como–Lens, Villa–Fenerbahçe) in nuove medie attese. Non si assumono XI ufficiali. Il commento è delimitato per fixture ID, data e stato scheduled; altre giornate e partite concluse non ricevono questo testo.

## Verifiche

Controllo automatico sul calendario: 18/18 testi CL5 presenti, nessun testo per altre fixture, nessun testo dopo conclusione o con data diversa. Controllate sintassi dei moduli, assenza di link/provenienza nei nuovi testi e risposta HTTP del server locale con cache disabilitata. Versioni degli import e shell Champions aggiornate. Nessun controllo visivo desktop/mobile eseguito in questa estensione. Nessun commit, push o deploy.
