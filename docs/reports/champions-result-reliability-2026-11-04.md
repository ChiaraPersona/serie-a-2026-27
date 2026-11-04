# Affidabilità dei risultati Champions — 4 novembre 2026

## Esito operativo

Il modello condiviso rimane preliminare. Non è stato sostituito con Elo né calibrato manualmente per AEK–Real. Il catalogo conserva contratti, quote e valutazioni diagnostiche. Per le fixture future della MD4, 1X2 e doppia chance non entrano nei suggerimenti senza validazione dell'evento e approvazione del selettore esistente. Nessuna modifica agli archivi delle gare iniziate, alle probabilità, alle formule, ai pesi o alle eccezioni già autorizzate sugli altri mercati.

Il difetto era riproducibile: AEK suggerita con `qualifiedSelection=false` e `evaluation.validation.approvable=false`. La pubblicazione recupera candidati preliminari e la policy anti-X può recuperare alternative preliminari. Il controllo finale MD4 ora viene applicato dopo questi passaggi, anche nel refresh delle sole policy. Non promuove automaticamente eventi con il solo flag di validazione.

Applicazione: nove fixture future controllate, otto suggerimenti esclusi. Il refresh verifica integralmente la conservazione di BetSelection e delle fixture fuori ambito. Le stime dello Scenario rimangono consultabili come preliminari: la rimozione dai suggerimenti non costituisce una nuova previsione.

## Evidenza sul confronto europeo

Comando diagnostico ripetibile: `node scripts/research/champions-result-reliability.cjs`. Scrive esclusivamente `output/champions-result-validation/research.json`, con hash degli input, confronti per fixture e protocollo di ricerca.

AEK–Real: modello condiviso 47,632/25,663/26,705%; riferimento Elo storico 32,332/19,616/48,052%; quote normalizzate per il margine 7,937/12,698/79,365%. Lo snapshot quote è del 4 novembre alle 13:38:26 UTC; non è una quota live. Il riferimento Elo è fermo al 30 maggio 2026 e non incorpora automaticamente la forma corrente. Identità UEFA unite tramite mappa interna esatta; rating mancanti producono N/D.

Il modello condiviso usa nove osservazioni AEK e 48 Real, con ultime gare rispettivamente 10 e 25 ottobre; non corregge la forma per forza avversaria. La normalizzazione domestica non è una validazione dei confronti internazionali.

Esiste già un backtest Elo con training 2023–24, validazione 2024–25 e test 2025–26 a parametri congelati. Nelle 189 gare Champions di test, Brier multiclass 0,56156 contro 0,61683 della baseline; log loss 0,94918 contro 1,02251; ECE 0,04688. Sono risultati dell'artefatto storico esistente, non una nuova esecuzione né una validazione del Poisson attuale. Non trasferire questa approvazione a gol, doppie chance, volumi o DUO.

## Ricerca necessaria prima della promozione

1. Verificare input domestici e quote storiche disponibili prima di ciascun kickoff; il solo timestamp della partita non dimostra disponibilità dei dati. Non ricostruire una previsione storica usando informazioni raccolte successivamente senza dichiarare la simulazione retrospettiva.
2. Confrontare rating europeo comune, modello domestico e baseline di frequenza su identiche fixture. Aggiungere la baseline quote soltanto dove esistono contratti e snapshot prepartita verificati.
3. Stimare correzioni per campionato/avversario, attenuazione dei piccoli campioni e decadimento temporale soltanto nel training; scegliere configurazione e regole di astensione nella validazione. Congelare prima del test indipendente.
4. Misurare Brier, log loss, calibrazione per fasce, intervalli raggruppati per fixture e copertura per dimensione/età del campione e coppia di campionati. Una migliore previsione AEK–Real non è un criterio di accettazione.
5. Riutilizzare i gate evento/modello esatti di `scripts/champions/event-validation.cjs`; non ridurre i criteri. Conservare l'astensione in assenza di evidenza. Validare separatamente le famiglie di mercato.

Il primo controllo rilevava che il registro non corrispondeva agli hash dei modelli correnti. Nel successivo intervento il builder canonico ha rivalutato gli snapshot originali e rigenerato il registro: gli ID ora coincidono, senza rinominare le osservazioni di modelli precedenti o trasferire approvazioni. Stato: 18 snapshot originali, 88 osservazioni ammissibili, 2.338 eventi in attesa, zero approvazioni. Il refresh conserva gli snapshot e i dati operativi, verificati dal nuovo test `test-champions-validation-refresh.cjs`.

È emerso anche un difetto nel pilot preliminare MD3: declassava incondizionatamente a PRELIMINARY un evento già approvato dal selettore e dal gate esatto. Ora conserva le approvazioni effettive ed esclude candidati preliminari incompatibili o equivalenti; un flag di approvazione senza validazione non basta. Il test di integrazione positivo passa; con registro reale o registro di altra versione non avviene alcuna promozione. Nessun catalogo storico è stato rigenerato.

I test di conservazione confrontavano alcuni file con hash di una vecchia sessione e segnalavano come regressioni aggiornamenti ordinari successivi. Ora congelano gli input all'inizio dell'azione controllata e ne verificano l'integrità alla fine. Il test di refresh esegue realmente il builder e confronta prima/dopo sia i dati operativi sia tutti gli snapshot originali; non aggiorna o elimina i vecchi archivi di controllo.

## Verifiche

- `test-champions-result-validation.cjs`: passa; riproduce candidato AEK e alternativa doppia chance, approvazione reale, conservazione contratti/valutazioni, fixture estranee e idempotenza.
- `test-champions-md04.cjs`: passa, 18 fixture e 264 suggerimenti residui, contratti esatti e sincronizzazione dati.
- Build `--presentation-only --champions-pages-only --matchday 4`: passa.
- `check-champions-md04-browser.cjs`: passa in 44 stati desktop/mobile; sincronizzazione Lettura/Schedina, persistenza selezioni, regressione MD3 e assenza di sezioni pubbliche sulle fonti. Evidenze in `output/champions-result-validation/browser/`.
- `test-champions-event-validation.cjs`: passa dopo la rigenerazione canonica del registro e la correzione dei controlli di conservazione.
- `test-champions-validation-integration.mjs`: passa, compresi approvazione sintetica, conflitti preliminari, registro di versione diversa e nessuna approvazione reale.
- `test-champions-validation-refresh.cjs`: passa; refresh reale con conservazione integrale degli input operativi e degli snapshot.

Nessun commit, push o deploy. Nessuna nuova formazione ufficiale acquisita; non è stato rieseguito il filtro titolari perché questo intervento riguarda soltanto l'ammissione dei risultati.
