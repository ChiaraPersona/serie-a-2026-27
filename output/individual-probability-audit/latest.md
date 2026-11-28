# Audit probabilità individuali

Serie A: 90/119 fixture con pool completo; 1799 righe, 1799 con probabilità tiri, 1799 con probabilità SOT.

Champions MD4: 281/396 titolari con probabilità; 115 senza. Blocchi: {"COLLECTIVE_ONLY_TEAM":44,"GOALKEEPER_SHOT_METRIC_INELIGIBLE":36,"EXPECTED_MINUTES_UNAVAILABLE":25,"BASELINE_UNAVAILABLE_OR_UNSAFE":26,"TEAM_RECONCILIATION_NOT_PASSED":18,"TEAM_VOLUMES_UNAVAILABLE":22}.
Champions MD5: 307/396 titolari con probabilità; 89 senza. Blocchi: {"GOALKEEPER_SHOT_METRIC_INELIGIBLE":36,"EXPECTED_MINUTES_UNAVAILABLE":20,"BASELINE_UNAVAILABLE_OR_UNSAFE":16,"COLLECTIVE_ONLY_TEAM":44}.

## Verifica storica Serie A MD6

| Evento | N | Probabilità media | Frequenza osservata | Brier |
|---|---:|---:|---:|---:|
| shots1Plus | 142 | 0.6333 | 0.5986 | 0.1897 |
| shots2Plus | 142 | 0.3303 | 0.2958 | 0.1491 |
| shots3Plus | 142 | 0.1589 | 0.1056 | 0.0753 |
| sot1Plus | 142 | 0.3048 | 0.2606 | 0.1602 |
| sot2Plus | 142 | 0.079 | 0.0423 | 0.0377 |

Esclusioni: {"NO_UNIQUE_CANONICAL_PLAYER":28,"ACTUAL_NONSTARTER":30}.

Campione diagnostico di una giornata: non sufficiente per approvare o ricalibrare il modello corrente. Contratti DUO separati dalle probabilità individuali. Nessuna modifica ai dati pubblicati.

## Interpretazione e passo successivo

Le probabilità del singolo esistono già. Il catalogo DUO le mantiene come riferimento separato e non le trasferisce al contratto con sostituto. Le fixture Serie A senza allPlayers sono output con schema diverso o precedente, non giocatori con probabilità zero.

MD5 Champions: i 36 portieri sono esclusi per la metrica; restano 53 titolari di movimento senza previsione. I motivi di blocco possono sovrapporsi: non sommarne i conteggi.

Il controllo storico esclude 28 giocatori senza identità canonica univocamente confrontabile e 30 non titolari effettivi. Le cinque soglie sugli stessi 142 giocatori non sono 710 osservazioni indipendenti. I valori aggregati indicano una sovrastima nel campione; non dimostrano superiorità rispetto a un riferimento e non autorizzano correzioni automatiche.

Passo successivo: estendere il campione con snapshot prepartita verificabili e statistiche individuali per ID, separando versioni del motore; valutare la calibrazione su giornate successive a quelle usate per stimarla. Per DUO serve una ricerca distinta su sostituzioni e contratto esatto.

Dettaglio, fasce di calibrazione e hash degli input in latest.json.
