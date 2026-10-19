# Champions MD3 — verifica in blocco delle identità

Confrontate tutte le 817 righe del Pacchetto 1 con gli snapshot roster ESPN 2026/27 presenti nell’esportazione originale (acquisiti a settembre). Abbinamento per ID ESPN della squadra, con controllo del nome normalizzato. Le varianti di nome richiedono revisione; i giocatori assenti dallo snapshot possono essere nuovi arrivi, quindi NON sono automaticamente errori.

**Nessun record autorizzato all’importazione:** gli snapshot sono precedenti al 19 ottobre e il controllo non certifica tiri, SOT, minuti o corrispondenza al referto.

{
  "rows": 817,
  "distinct_players": 519,
  "teams": 31,
  "results": {
    "ESPN_ID_AND_NAME_MATCH": 803,
    "NOT_IN_SEPTEMBER_ROSTER": 11,
    "ESPN_ID_MATCH_NAME_VARIANT": 3
  },
  "scope": "Confronto automatico con 36 snapshot roster ESPN acquisiti il 7 settembre 2026; NON verifica indipendente delle rose al 19 ottobre né delle statistiche partita.",
  "import_authorized": 0
}
