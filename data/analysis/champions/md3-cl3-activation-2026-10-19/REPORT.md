# CL3 — attivazione locale, 19 ottobre 2026

CL3 attiva accanto a CL1 e CL2 attraverso lo stesso renderer, classi e stile esistenti. Correzione CSS limitata all’altezza CL3 su touch: una regola condivisa impostava height:auto con facce assolute, azzerando la card. Nessuna modifica alle altre card. Collegamento: `schedina.html?competizione=champions&giornata=3`.

Fronte: CL3, terza giornata, Da giocare. Retro: sette esiti in attesa; successo, ROI, puntato, vincite e netto N/D. Su touch primo tocco apre il retro, secondo apre MD3. Le altre card conservano il comportamento precedente.

## Sette singole approvate

| Partita | Esito | Quota | ID esatto snapshot |
|---|---|---|---|
| FenerbahÃ§e â€“ Slavia Praha | 1 | 1.65 | `sisal:4911220:823777389:5387046768` |
| Liverpool â€“ Villarreal | 1 | 1.5 | `sisal:4911219:823776841:5387007000` |
| Paris Saint-Germain â€“ Barcelona | 1 | 2.45 | `sisal:4911213:823775747:5387003978` |
| Napoli â€“ BodÃ¸/Glimt | X2 | 2.3 | `sisal:4911207:823790061:5387016639` |
| Como â€“ Manchester United | X2 | 1.6 | `sisal:4911218:823776791:5387045994` |
| Lille â€“ Galatasaray | 1 | 2.15 | `sisal:4911221:823793941:5387027327` |
| Club Brugge â€“ Lens | 1 | 2 | `sisal:4911217:823793393:5387018149` |

Ogni esito occupa una singola indipendente. Nessuna multipla generata o combinabilità presunta; nessuna aggiunta automatica alla schedina personale dell'utente. Restano disponibili 426 mercati e 657 selezioni aperte nello stesso catalogo delle Letture. Tutti i contratti richiesti corrispondono esattamente; nessuna sostituzione.

## Letture e valutazione

18/18 Letture attive, senza ricalcolo. Preview, sezioni arbitrali, quote e identificativi invariati. Individuali N/D; Sabah mantiene N/D per tutti i volumi dettagliati richiesti. Nessuna nuova narrazione o fonte pubblica.

La valutazione riutilizza `settleLeg`: solo fixture canonica con stato finished e punteggio effettivo completo. Prima della conclusione resta pending anche se è presente un punteggio. Verde/rosso seguono gli stili esistenti. ArchiveStats calcola 1 € per esito verificato, vincite da quota originaria, netto, ROI e successo; gli esiti in attesa sono esclusi dai denominatori economici. La simulazione non certifica liquidazioni del bookmaker.

## Verifiche

- Test catalogo preliminare: 18 forecast immutati, 426/657 contratti esatti, esclusione individuali/sospesi, persistenza e compatibilità.
- Test CL3: sette singole; vittoria/sconfitta/pareggio per 1 e X2; nessun esito con partita non conclusa o score mancante.
- Test pagina Schedina Champions e pagina Lettura Champions superati.
- Regressione 18 Letture arbitrali MD2 superata.
- Test schedina personale e BetSelection: superati; 6 Schedina, 137 MyCombo e 137 prediction legs.
- Edge: 57 pagine a 1440/390/320 px, più archivio/CL3 a tutte le larghezze; valori congelati, arbitri, sette righe e quote esatte, dimensioni card identiche, flip, nessun overflow, nessun errore JavaScript. Verifica touch dedicata superata: altezza 260 px, primo tap retro, secondo tap navigazione MD3. Screenshot ispezionato.
- Integrità: 9950 file confrontati. Modificati solo i sei file esistenti elencati sotto; tutti gli altri file preesistenti conservano l'hash. Motori, dati storici e precedenti giornate invariati. Non eseguiti builder del motore né rigenerazioni di altre giornate.

## File

Modificati:
- css/betting.css (solo CL3 touch)
- js/pages/betting.js
- js/pages/champions-md3-ui.mjs
- scripts/build-site.js
- schedina.html
- champions-league.html (soltanto versione shell)

Aggiunti:
- data/sources/champions-md03-approved-selections-2026-10-19.json
- data/normalized/schedina-champions-md03.json
- js/pages/champions-md3-approved.mjs
- scripts/build-champions-md3-approved.cjs (serializza esclusivamente approvazioni con join esatto; nessun motore)
- scripts/test-champions-md3-approved.mjs
- scripts/check-champions-md3-cl3-browser.cjs
- questa directory di evidenze e screenshot.

## Stato residuo

Nessun contratto bloccato tra i sette approvati. Risultati e rendimenti attendono dati ufficiali delle partite; individuali attendono formazioni/minuti documentati. Nessun commit, push o deploy eseguito.
