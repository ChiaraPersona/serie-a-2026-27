# Identificativi Sisal normalizzati

Ogni evento, mercato e selezione acquisito dal normalizzatore conserva ora
`originalIdentifiers` con i nomi e i tipi JSON originali. Un campo assente vale
`null`; lo zero osservato resta zero. Gli alias preesistenti non cambiano.

- Evento: eventId, regulatorEventId, brandId, codicePalinsesto,
  codiceAvvenimento, codiceDisciplina, codiceManifestazione, key, keyMultibrand.
- Mercato: marketId, eventId, brandId, codicePalinsesto, codiceAvvenimento,
  codiceScommessa, codiceClasseEsito, idInfoAggiuntiva, key, keyMultibrand,
  offerId, tradingSegmentKey.
- Selezione: selectionId, brandId, codiceEsito, codiceScommessaAAMS,
  codiceEsitoAAMS.

`identifierProvenance` sull'evento registra kind, rawFile, responseUrl e retrievedAt.
Mercati e selezioni usano `sourceRef: "event"` per riferirsi alla stessa evidenza
senza ripetere URL e percorsi per ogni quota; una provenienza diversa può essere
conservata direttamente sul singolo elemento.
`provider-response` significa osservato nella risposta Sisal archiviata, non
certificato come trasferibile. `synthetic-dom` distingue gli ID locali `dom:` e
`esito_`; `unverified` indica identità senza evidenza raw recuperabile.
La provenienza degli identificativi resta separata dalla data della quota: un
refresh DOM può aggiornare la quota conservando gli identificativi precedenti.
Non si deducono ID da nomi, codici DOM o esempi di link condivisi.

Migrazione locale, senza rete e senza cambiare quote o catalogo:

```
node scripts/normalize-sisal-odds.js --competition serie-a --identifiers-only
node scripts/normalize-sisal-odds.js --competition champions-league --identifiers-only
node scripts/sisal/test.js
```

Il confronto usa eventId, marketId e selectionId esatti, limitati al relativo
evento/mercato. I campi sono additivi e opzionali nello schema per compatibilità
con snapshot storici. Nessuna funzione di generazione fillTicket è implementata;
i campi non costituiscono una specifica né un'autorizzazione di trasferimento.
