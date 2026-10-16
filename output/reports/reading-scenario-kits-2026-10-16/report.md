# Scenario, formazioni e numerazioni - 16 ottobre 2026

515 numeri verificati su 533 giocatori delle 20 rose. 18 restano non verificati (null/N/D), senza rimuovere giocatori.

| Squadra | Numeri verificati | Non verificati |
|---|---:|---:|
| atalanta | 24/24 | 0 |
| bologna | 25/26 | 1 |
| cagliari | 25/28 | 3 |
| como | 26/26 | 0 |
| fiorentina | 23/23 | 0 |
| frosinone | 29/30 | 1 |
| genoa | 26/27 | 1 |
| inter | 24/24 | 0 |
| juventus | 28/28 | 0 |
| lazio | 24/26 | 2 |
| lecce | 26/27 | 1 |
| milan | 26/26 | 0 |
| monza | 27/29 | 2 |
| napoli | 26/26 | 0 |
| parma | 25/26 | 1 |
| roma | 23/23 | 0 |
| sassuolo | 27/29 | 2 |
| torino | 26/28 | 2 |
| udinese | 24/26 | 2 |
| venezia | 31/31 | 0 |

## Non verificati
- bologna: Enem (enem)
- cagliari: Sugawara (sugawara)
- cagliari: Gennaro Borrelli (gennaro-borrelli)
- cagliari: Nzola (nzola)
- frosinone: Eldin Lolic (eldin-lolic)
- genoa: Drameh (drameh)
- lazio: Patric (patric)
- lazio: Gudmundsson A. (gudmundsson-a)
- lecce: Hjalte Morel Lærke (hjalte-morel-l-rke)
- monza: Goglichidze (goglichidze)
- monza: Zeballos (zeballos)
- parma: Ghidotti (ghidotti)
- sassuolo: Alessandro Russo (alessandro-russo)
- sassuolo: Rafel Obrador (rafel-obrador)
- torino: Alberto Paleari (alberto-paleari)
- torino: Faustino Anjorin (faustino-anjorin)
- udinese: Edoardo Piana (edoardo-piana)
- udinese: Jovanovic (jovanovic)

## Fonti e metodo
Fonte prioritaria: [Documentazione Lega Serie A](https://www.legaseriea.it/lega-serie-a/documentazione), comunicati C.S.8 del 21 agosto fino al C.S.37 del 12 ottobre 2026. Consultati i PDF originali, incluse le scansioni. Confronto: rose Transfermarkt 2026/27, URL e righe in transfermarkt-squads.json. Associazioni tramite providerIds.transfermarkt o nomi completi verificati nel registro alias e nelle fonti canoniche gia collegate allo stesso ID e alla stessa squadra; nessuna associazione soltanto sul cognome. Nessuna composizione rosa modificata. Le righe ufficiali non associate rimangono nel report number-plan.json.

## Correzione documentata
Luca Marianucci: il vecchio import indicava 5 e pagina 8; il PDF ufficiale C.S.8, pagina 9, indica 35, confermato da Transfermarkt. Corretto a 35 mantenendo la fonte ufficiale. Numerazioni originarie conservate in shirt-source-before.json.

## Cronologia
numberHistory registra data e provenienza. Le Letture usano solo numeri documentati entro la data della fixture; i numeri confermati solo su Transfermarkt il 16 ottobre non sono applicati alle gare precedenti. Per queste gare alcuni numeri restano — anche se presenti nella rosa attuale. Le pagine squadra conservano il campo verticale; i numeri delle probabili formazioni sono risolti usando i player ID della fonte canonica.

## File
Componenti: scenario.mjs, people.mjs, champions-adapter.mjs, evidence.mjs, nuovo shirt-numbers.mjs; css/reading-detail.css; js/components/lineup-kit.mjs e lineup-field.mjs (supporto numero opzionale); js/team-squads.js (numeri nel campo verticale, struttura invariata); scripts/test-no-shirt-numbers.js (provenienza multicomunicato). Dati: fonte shirt-numbers-2026-27.json, 20 data/teams/*.json e 329 data/players/*/*.json, solo shirtNumber. Elenco analitico in number-files.json, piu data/players/napoli/luca-marianucci.json.

## Controlli
Test adattatori e sezioni interne, test numerazioni, test pagine squadra: superati. Integrita: 8725 hash invariati; 349 artefatti modificati esclusivamente nel campo shirtNumber. Nessuna modifica a statistiche, identita, motori, quote, forecast, contratti, risultati o store. Verifica temporale: fonte futura esclusa, cambio Ricci 14->21 correttamente datato. Risultati browser in browser-results.json; screenshot Scenario e Formazioni per i tre piloti a 1440 e 390 px, test aggiuntivo a 768 px.
