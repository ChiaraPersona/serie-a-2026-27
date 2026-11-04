# Verifica prospettica dei mercati Champions

Protocollo interno avviato il 4 novembre 2026. Nessuna modifica a formule, quote, selezioni operative, criteri numerici di approvazione o interfaccia pubblica.

## Che cosa viene conservato

`node scripts/champions-market-prospective.cjs --capture --matchday 4` legge il catalogo canonico già calcolato. Non ricalcola pronostici. Usa esclusivamente l'ora reale di esecuzione e ammette soltanto fixture programmate con calcio d'inizio successivo alla cattura, convertito da Europe/Rome. Un catalogo con timestamp mancante o futuro non viene congelato.

Gli snapshot in `data/predictions/champions-market-prospective/` conservano probabilità originali, selezioni proposte e non proposte, soggetto, soglia, direzione, periodo, modificatori, quote, valutazione originale, modello pubblicato, baseline empirica e ricevute SHA-256 degli input. I conteggi MD4 senza un ID pubblicato ricevono un'identità di ricerca derivata dagli hash dei moduli espressamente dichiarati dalla loro provenienza; non si ricava una probabilità nuova. Le ricevute descrivono i file disponibili alla cattura, senza fingere di ricostruire versioni mancanti alla generazione originaria.

I timestamp `latestInputAt` e `trainingThroughAt` indicano il limite superiore provato dalla cattura locale, non attestano l'ultima osservazione effettiva né un nuovo fitting. La cattura locale non è una marca temporale di un'autorità esterna.

La prima cattura di ogni esatto evento/modello/soggetto rimane quella valutata. Aggiornamenti successivi sono revisioni separate: non sostituiscono probabilità o anomalie già registrate. Un evento prima assente può entrare solo se compare in una revisione ancora precedente al kickoff. Una fixture senza eventi registra un'astensione esplicita. Soglie diverse e contratti diversi restano separati; gli alias con probabilità discordanti vengono messi in quarantena.

## Mercati e controlli

- Esiti, doppie chance, gol, tiri, tiri in porta e corner vengono separati per modello, ambito e contratto. La distribuzione analitica 1-X-2 è conservata anche se una sua componente non è una selezione proposta.
- I contratti DUO, con pali/traverse o supplementari non vengono valutati tramite statistiche del singolo giocatore. Le relative probabilità mancanti restano mancanti.
- Una soglia di conteggio deve essere semintera: nessun pareggio di soglia viene trasformato in perdita. Per UNDER la baseline rappresenta UNDER, non la frequenza di OVER.
- Over e Under dello stesso evento devono avere probabilità complementari. Le incoerenze originali sono conservate e isolate senza correggere il modello o i cataloghi.
- Esiti effettivi non verificati, futuri o non riconciliati per identità/periodo restano in attesa o in quarantena.
- La baseline viene congelata prima del kickoff usando il collettore storico esistente. Una baseline assente non vale zero.

## Valutazione dopo le partite

`node scripts/champions-market-prospective.cjs --matchday 4` aggiorna soltanto `data/analysis/champions/market-prospective/latest.json`, leggendo gli esiti canonici disponibili. Non ricostruisce previsioni per le gare passate e non aggiorna il registro operativo di validazione.

Il report distingue attese, quarantena e osservazioni ammissibili. Brier, log-loss, calibrazione, bias e MAE riusano `scripts/champions/event-validation.cjs`; i conteggi di campione sono fixture indipendenti, non numero di quote. I riepiloghi descrittivi sono separati per evento esatto e per selezione proposta/non proposta. I criteri numerici esistenti restano invariati. Per i gol, la mancanza di un gate di approvazione completo comporta sempre stato diagnostico, anche quando le metriche sono calcolabili.

Il protocollo non certifica liquidazioni, rendimento o probabilità congiunte di MyCombo; `activation` resta `false`. Il risultato prospettico sarà disponibile soltanto dopo le partite e dopo l'acquisizione dei loro esiti verificati.

## Integrazione e test

Il comando CLI `scripts/build-champions-md04.cjs` acquisisce ora uno snapshot dopo il normale build o gli aggiornamenti di policy. Le chiamate programmatiche a `build()` restano prive di questa acquisizione automatica; possono usare esplicitamente il comando dedicato. Non è necessario rigenerare pronostici o sito per la sola verifica interna.

Test mirati: `node scripts/test-champions-market-prospective.cjs` e `node scripts/test-champions-strength-comparison.cjs`. Coprono cutoff, immutabilità della prima cattura, revisioni, DUO, complementi incoerenti, baseline, actual non verificati e collegamenti di identità ancorati a fixture.

## Copertura degli avversari

L'overlay `data/sources/champions-opponent-identity-map-2026-27.json` amplia i collegamenti provider→UEFA mediante partite europee storiche condivise e un'ancora già nota; non usa somiglianze dei nomi. Vedere `docs/reports/champions-opponent-identity-2026-11-04.md` per evidenze e limiti.

`node scripts/build-champions-strength-comparison.cjs --as-of 2026-11-04 --with-opponent-map` produce una variante interna distinta dal confronto originale. La conoscenza acquisita oggi non viene retrodatata alle vecchie previsioni. Rating assenti e copertura incompleta non vengono sostituiti con medie nazionali né inseriti nei pronostici.
