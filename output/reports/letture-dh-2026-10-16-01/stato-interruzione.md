# Letture D–H — interruzione per scritture concorrenti

16 ottobre 2026. **D–H non completati.** Nessun commit, push, deploy o build eseguito da questo lavoro. Nessun ripristino o sovrascrittura dei file lavorati da altri.

## Sequenza osservata

1. HEAD iniziale `4c96459c64379c062b21499431576f1173f20c2d`. Modifiche preesistenti su CSS/team, script e pagine squadra, registrate nelle acquisizioni e preservate.
2. Il controllo ravvicinato di 563 file ha rilevato scritture su `scripts/test-team-editorial-browser.cjs`. Un successivo controllo ha rilevato soltanto lo stesso file estraneo al restyling. È stata registrata separatamente la stabilità del perimetro pertinente, escludendo esplicitamente quel solo test esterno; nessuna baseline precedente è stata riscritta.
3. Sono state apportate le modifiche D ed E sotto indicate, con controlli mirati in memoria e test esistenti privi di rigenerazioni.
4. Il controllo successivo, **12:55:29 UTC**, ha rilevato modifiche ulteriori non effettuate da questo lavoro: **`css/team.css` e `js/team-squads.js`**. Evidenza: `guard-e.json`. Il primo è caricato anche dalle Letture tramite i CSS globali: la concorrenza coinvolge ora una dipendenza del restyling.
5. HEAD è diventato `44c1deb73539e461daea7952a1d586f358a49b7e`. Il diff fra i due HEAD include il lavoro sulle pagine squadra e anche i primi artefatti di acquisizione di questa directory, segno che operazioni concorrenti possono includere file creati da questo lavoro. Qui non sono stati impartiti comandi Git di scrittura.
6. Implementazione fermata prima di F–H e delle verifiche browser finali. Nessun file concorrente ripristinato; modifiche D/E mantenute nel working tree.

## Lavoro implementato ma non validato nel browser

### D — scenario

Nuovo rendering interno dello scenario: quattro confronti per gol attesi del modello, tiri, SOT e corner; valori casa/ospite, barre comparative, intervalli originali, risultati esatti e alternative, interpretazione disponibile e dettagli della qualità dati. La spiegazione completa originale rimane consultabile in un disclosure. Le barre effettuano solo una normalizzazione grafica, non un calcolo previsionale.

### E — pronostici e schedina

Nuove righe compatte espandibili, con probabilità/quota/EV separati, modificatori e identità integrali; filtri combinabili squadra, giocatore, famiglia, quota, evidenziati/outsider. Pulsante flottante e dialog nativo con drawer desktop/bottom sheet mobile, gestione focus, Escape e rimozione selezioni. Lo store non è stato modificato: i controller esistenti passano la propria istanza, mantenendo riconciliazione e contesti.

Le partite concluse rimangono non aggiungibili. La selezione diretta Serie A resta vincolata ai contratti canonici MD7 supportati; non viene estesa a MD6. Milan–Atalanta MD7 viene incluso nei soli piloti autorizzati per verificare mercati senza quota e interazioni. `layout=legacy` continua a disattivare il nuovo rendering. Gli altri incontri restano esclusi.

Queste sono funzionalità codificate, **non una dichiarazione di completamento o di verifica visuale riuscita**. Il browser test D–H richiesto dall'utente non è stato eseguito prima del blocco e non sono stati prodotti screenshot nuovi da presentare come D–H.

## File applicativi modificati da questo lavoro

- `css/reading-detail.css`
- `js/pages/readings.js`
- `js/pages/champions.js`
- `js/pages/reading-detail/view-model.mjs`
- `js/pages/reading-detail/serie-a-adapter.mjs`
- `js/pages/reading-detail/champions-adapter.mjs`
- `js/pages/reading-detail/shell.mjs`
- `scripts/test-reading-detail-adapters.mjs`: il test del gate ora include il terzo campione autorizzato e continua a escludere altre fixture MD7. Nessuno snapshot o valore matematico atteso è stato aggiornato.

Nuovi moduli:

- `js/pages/reading-detail/format.mjs`
- `js/pages/reading-detail/scenario.mjs`
- `js/pages/reading-detail/forecasts.mjs`

Nessun motore, dataset, contratto o store modificato da questi comandi. Il controllo degli hash non ha segnalato variazioni ai dati protetti; ha segnalato i due file concorrenti sopra indicati.

## Test effettivamente eseguiti

- Controllo in memoria D: presenza KPI, zero/null, assenza NaN, input immutato — PASS.
- `node --no-warnings scripts/test-reading-detail-adapters.mjs` dopo D — PASS.
- Controllo in memoria E: probabilità null, quota indisponibile, modificatore sostituto preservato, gate gare concluse — PASS.
- `node scripts/test-personal-betslip.mjs` dopo E — PASS.
- `node --no-warnings scripts/test-champions-md02-market-ui.mjs` dopo E — PASS.
- `node --check` su `format.mjs`, `scenario.mjs`, `forecasts.mjs`, `shell.mjs`, `readings.js` e `champions.js` — PASS.

Non vengono dichiarate passate l'intera suite, le interazioni browser, l'accessibilità, l'overflow o le verifiche visuali D–H. I test inline non scrivono dataset o aspettative.

## Come riprendere

Attendere la conclusione delle scritture concorrenti su CSS e pagine squadra; acquisire due letture ravvicinate di HEAD e dipendenze effettive senza resettare il working tree. Preservare le modifiche D/E sopra elencate. Verificare nel browser D/E, quindi proseguire F, G e H con i rispettivi test e i quattro viewport richiesti: 1440, 1024, 768 e 390 px. Restano da realizzare i nuovi interni di formazioni/giocatori, disciplina/tattica, storico e verifica post-partita.

Il blocco riguarda la stabilità della base condivisa, non la necessità di una nuova specifica UX. Nessuna nuova decisione grafica o matematica è stata richiesta all'utente.
