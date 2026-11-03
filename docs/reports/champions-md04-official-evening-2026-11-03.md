# Formazioni ufficiali Champions MD4, 3 novembre 2026

Acquisizione utente: Manchester United–Roma, Feyenoord–Inter, Atlético de Madrid–Bayern, Barcelona–Aston Villa, LASK–Slovan Bratislava, Villarreal–PSG e Bodø/Glimt–Lille. Quattordici squadre, 154 titolari; panchine e ordine tattico trascritti dalle immagini in `data/sources/official-lineup-evidence/champions-md04-six-evening/` (il nome della cartella riflette il primo lotto, contiene anche Bodø/Glimt–Lille).

La fonte canonica è `data/sources/champions-official-formations-md04-2026-27.json`. L'importatore `scripts/import-champions-md04-official-nov03.cjs` usa una mappa esplicita di ID già presenti, senza matching approssimativo. Per Molgaard #20 del LASK è stato riconciliato l'ID esistente `kasper-j-rgensen`, verificando numero e identità nella [rosa LASK](https://www.lask.at/de/m/teams/pros) e il [nome completo](https://www.soccerway.com/player/jorgensen-kasper/dfifJRsr/).

Lavelli M. #53, Dominguez J. #27, Bar A. #90 e Traore Y. #43 restano riserve senza ID canonico verificato, con dati individuali N/D. Nessuna identità o statistica creata.

Il builder MD4 supporta `--official --fixtures ID,ID` per isolare le nuove gare e non rieseguire quelle già iniziate. Le formule e i criteri di pubblicazione restano invariati. Le scritture JSON usano un file temporaneo e sostituzione atomica, per gestire gli errori intermittenti di Windows incontrati durante questa acquisizione. L'archivio mantiene i contratti esclusi; quote, soglie e modificatori dei contratti rimasti sono confrontati con lo snapshot precedente.

Verifiche: `scripts/test-champions-md04.cjs`, `scripts/check-champions-md04-official-nov03.cjs`, `scripts/check-champions-md04-browser.cjs`. Evidenze di integrità in `output/official-md04-six-evening/integrity.json`; controlli UI desktop/mobile in `output/official-md04-six-evening/browser/`.

Nessuna liquidazione, modifica dei rendimenti originali, commit, push o deploy.
