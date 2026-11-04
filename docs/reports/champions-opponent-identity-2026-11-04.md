# Identità degli avversari Champions: ampliamento verificato

Verifica interna al 2026-11-04. Nessuna modifica ai modelli o alle selezioni operative.

Identità totali: 118; semi canonici: 36; nuove identità ESPN: 79; fixture storiche riconciliate: 523.

Nelle finestre domestiche del confronto esistente, avversari collegati a un Elo diretto: **88/264**. Le osservazioni utilizzabili per il residuo punti rispetto all'atteso richiedono anche l'Elo della squadra osservata e sono **83/264**, rispetto alle precedenti 42/264 utilizzabili. Non confondere copertura dell'avversario e copertura della coppia.

La differenza di cinque osservazioni dipende dall'assenza di Elo storico diretto di Como e Viking: Como negli eventi ESPN `401874774`, `401874940`, `401874755`; Viking negli eventi `401843468`, `401843455`. Non viene sostituito il rating mancante con 1500 per calcolare la correzione domestica.

## Verifica dell'identità

Si parte dai 36 collegamenti canonici già presenti fra le squadre Champions e gli ID UEFA/ESPN. Un nuovo avversario viene collegato soltanto attraverso una stessa partita storica europea, identificata univocamente da stagione, competizione, data, punteggio nei 90 minuti e almeno una squadra con ID già noto, rispettando casa/trasferta. Il collegamento conserva gli ID delle due partite, i percorsi e i puntatori JSON degli originali e l'identità usata come ancora. Le ulteriori propagazioni mantengono la catena di evidenza.

Non si associano nomi simili o tradotti. Le etichette dei nomi servono soltanto alla consultazione. I namespace provider sono separati; un ID FotMob non è un ID ESPN. I supplementi FotMob entrano solo con canonicalTeamId esplicito già riconosciuto.

Il matching per firma di partita richiede corrispondenza unica: zero o più candidati non producono una nuova identità. L'identità nuova non crea automaticamente un rating: un club senza rating rimane N/D nel confronto della forza.

## API e riproduzione

`createOpponentResolver(dataset)({provider, providerTeamId, canonicalTeamId})` restituisce l'identità verificata e `uefaTeamId`, oppure `null`. Conflitti e duplicati producono errore. `buildIdentityMap({pilot, history, teamMap, asOf, sources})` consente test isolati.

Comando: `node scripts/champions/opponent-identity.cjs --as-of 2026-11-04`. Scrive soltanto il mapping e un riepilogo `.generated.md` separato, preservando questo audit e i controlli manuali dei referti.

## Limiti

I club che non giocano le coppe europee possono restare senza rating. La riconciliazione verifica identità, non rende il campione rappresentativo dell'intero campionato. Il mapping acquisito oggi non va presentato come informazione congelata prima delle gare storiche. Nessuna sostituzione con medie di lega, nessuna probabilità inventata.

## Controllo indipendente dei referti originali e dei supplementari

Sono stati aperti tutti i **523/523** referti ESPN compressi associati alle fixture riconciliate, sotto `data/raw/champions-pilot/espn/summaries/2025-26/`. Tutti conservano gli ID home/away attesi e il punteggio totale importato nel dataset canonico. In **522/523** casi la somma dei primi due tempi del referto coincide anche con `score90` dello storico UEFA; nessun referto è mancante. Le gare dello storico UEFA con `score90` diverso da `scoreTotal` non entrano tra le 523 riconciliazioni: l'uguaglianza richiesta fra punteggio ESPN e `score90` le esclude.

Tre referti riconciliati riportano `STATUS_FINAL_PEN`. Due mantengono primi due tempi coerenti con i 90 minuti UEFA; uno è anomalo: ESPN `401862897`, PSG–Arsenal del 30 maggio 2026, `data/raw/champions-pilot/espn/summaries/2025-26/uefa.champions/401862897.json.gz`. Il punteggio totale è 1–1, ma i parziali sono `[0,2,-1,0,4]` e `[1,1,-1,0,3]`, quindi non permettono di verificare autonomamente il punteggio ai 90 minuti. L'anomalia resta esplicita e non viene corretta per inferenza.

Quella finale collega due identità già presenti nei 36 semi canonici e **non compare come evidenza di alcuno dei 79 nuovi mapping**. Le evidenze che introducono nuove identità non dipendono pertanto dal referto con parziali incoerenti. Il semplice numero 523 descrive tutte le fixture riconciliate, comprese quelle che non aggiungono identità; non certifica che ciascuna abbia parziali originali puliti.

## Fonti interne primarie

- `data/sources/champions-pilot-match-stats-2025-27.json`: SHA-256 e puntatori ai record nel [mapping](../../data/sources/champions-opponent-identity-map-2026-27.json).
- `data/normalized/uefa-europe-history-2023-26.json`: SHA-256 e puntatori ai record nel [mapping](../../data/sources/champions-opponent-identity-map-2026-27.json).
- `data/sources/champions-team-history-map-2026-27.json`: SHA-256 e puntatori ai record nel [mapping](../../data/sources/champions-opponent-identity-map-2026-27.json).
