# Serie A MD11: pronostici e Schedina

Aggiornate le dieci gare programmate con le probabili Fantacalcio importate il 5 novembre e lo snapshot Sisal `data/raw/odds/sisal/serie-a/2026-11-05T14-08-21-385Z.json.gz`. Tutti i 220 probabili titolari hanno ID canonico; lo stato resta probabile. Nessun filtro definitivo nuovo.

I builder MD11 riutilizzano motore 4.13.0, distribuzioni, validazione congelata MD6 e criteri esistenti. Cutoff esclusivo MD11; nessun risultato della giornata usato. Le previsioni e Letture estranee sono confrontate con la baseline locale in `output/md11-reading-refresh/before.json.gz`.

Cataloghi Lettura/Schedina sincronizzati. La presentazione condivisa espone 130 contratti distinti ammessi: 110 con quota verificata e 20 stime di squadra senza quota. Le stime senza quota mantengono EV N/D. I contratti tiri/SOT giocatore restano DUO: probabilità, quota equa ed EV non validati sono null; i contratti non riconciliati non sono suggeriti. Nessuna quota o probabilità sostitutiva inventata.

MyCombo: 28 portafogli validati e 2 N/D motivati. Nessuna modifica a formule, pesi o soglie di approvazione. La regola pubblica della quota minima 1.08 prosegue dalla MD10. Aggiunta la giornata 11 all'archivio Schedina e alle proiezioni leggere.

Verifiche superate: dati/cutoff/isolamento, contratti provider e soglie, salvataggio e ripristino personale, sincronizzazione cataloghi, rischio MyCombo, BetSelection, cache/caricamento e build. Controllate tutte le dieci Letture e Schedina a 1440 e 390 pixel, senza errori JavaScript o overflow. Evidenze in `reports/md11-reading-refresh/`, `reports/md11-schedina/` e `output/md11-reading-refresh/`. Il test caricamento ora include MD10/11 e le 15 schede correnti.

Nessun commit, push o deploy.
