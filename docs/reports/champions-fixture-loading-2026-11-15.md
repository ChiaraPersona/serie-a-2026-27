# Letture Champions per partita — 15 novembre 2026

Proiezioni dedicate alle 54 fixture concluse MD2–MD4. I dati già pubblicati sono
riorganizzati al build; non vengono modificati formule, pesi o pronostici.
Le fixture future, l'indice e le schede delle squadre conservano i loro lettori.

## Download misurato

Confronto nello stesso browser con HTTP gzip e JSON già compattato in entrambe
le versioni. I numeri includono tutte le risposte JSON della pagina campione;
non sono il peso dell'intero sito. MB decimali.

| Campione | Prima | Dopo | Riduzione |
|---|---:|---:|---:|
| MD2, prima fixture | 1,63 MB | 0,71 MB | circa 56% |
| MD3, prima fixture | 4,13 MB | 0,71 MB | circa 83% |
| MD4, prima fixture | 2,02 MB | 0,79 MB | circa 61% |

Nella fixture MD3 campione i JSON prima della compressione HTTP scendono da
54,70 MB a circa 6,45 MB. Bodø/Glimt e la fixture Viking–Sabah sono stati
verificati separatamente, includendo i percorsi con informazioni mancanti.

## Dati e contratti

`scripts/build-champions-reading-data.mjs` legge gli archivi canonici e usa
l'adapter operativo esistente per preparare la vista. Scrive una proiezione
per fixture e un registro dei contratti per giornata. Le selezioni nel payload
fanno riferimento al registro, conservando tutti i campi dei contratti originali.

Il registro comprende anche le selezioni delle altre fixture necessarie alla
riconciliazione della Schedina personale. Non si eliminano selezioni salvate
soltanto perché l'utente sta consultando un'altra partita. Il registro ufficiale
viene ricaricato e il filtro dei titolari resta applicato prima della vista.

Le identità usano gli ID canonici o i collegamenti UEFA già presenti negli
archivi; nessuna corrispondenza approssimativa fra nomi. Formazioni, giocatori,
referti, quote, soglie, DUO e probabilità conservano il contenuto originale.
I mercati tecnici non pubblicati restano negli archivi canonici interni.

Il build del sito che include Champions aggiorna queste proiezioni. Un manifest
interno conserva gli hash di input, codice e output: il builder riutilizza i
54 file quando tutto coincide. `--force` forza la rigenerazione. Una seconda
esecuzione è stata verificata con `reused: true`.

Le proiezioni concluse MD2–MD4 sono necessarie nel pacchetto pubblico: se mancano,
vanno rigenerate. Non viene usato come fallback di rete l'archivio tecnico completo.

## Peso del pacchetto e del disco

Il pacchetto pubblico resta intorno a **349,36 MB**. Le nuove proiezioni
sostituiscono 13 input di compilazione MD3 nella pubblicazione; altri due
artefatti senza consumatori browser rimangono soltanto interni. Gli originali
canonici restano nel repository, compresi gli archivi esclusi dal deploy.

I 58 JSON delle nuove proiezioni, dei tre registri e del manifest interno
occupano circa 65,01 MB logici. La compressione NTFS locale ne riduce
l'occupazione a circa **27,26 MB**, mantenendo percorsi e contenuto invariati.
Il riutilizzo basato sugli hash passa anche dopo questa compressione.

## Verifiche

- 54 fixture e 902 contratti ricostruiti dagli originali senza differenze;
  referti osservati e fixture del workspace identici.
- 630 selezioni salvate esercitate nella riconciliazione delle tre giornate.
- Confronti di cinque Letture a 1440/390 px: DOM e screenshot identici.
  Il server di prova rifiuta gli input tecnici esclusi dalla pubblicazione.
- Sito verificato usando la lista reale dei file pubblicabili: home, indice
  Champions, scheda Bodø/Glimt, Schedina MD3, Lettura MD3 e futura MD5,
  a entrambe le larghezze, senza risorse mancanti o errori JavaScript.
- Test del pacchetto, del caricamento Schedina e del rendering iniziale.
- La proiezione Schedina MD3 è stata riallineata a un metadato di evidenza già
  presente nel referto canonico della fixture MD3-15. Catalogo, contratti e
  schedine prima/dopo sono identici. Il relativo test torna a passare:
  18 fixture, 1.796 contratti e 177 selezioni salvate.

Evidenze in `output/champions-fixture-light-2026-11-15/`: `browser.json`,
`public-smoke.json`, `public-plan.json` e screenshot. La cartella è ignorata da Git.

## Copia interna superata

`output/home-commit-package/` non ha riferimenti negli strumenti attivi ed è
stato sostituito da:

- `data/technical-archive/workspace-copies/home-commit-package-2026-11-15.zip`
- il relativo `.manifest.json`, con percorsi e SHA-256 di tutti i 1.546 file.

Ogni entry ZIP è stata confrontata con il relativo hash originale. Prima della
rimozione della directory sono stati ricontrollati hash dello ZIP, contenuto
dei sorgenti, numero dei file e assenza di collegamenti simbolici/junction.

La copia occupava circa 46,31 MB reali su disco; ZIP e manifest ne occupano
circa 21,64 MB: **24,67 MB recuperati per questa copia**. Il confronto tiene
conto della compressione NTFS già presente, non parte dagli 80,24 MB logici.
Questo risparmio è specifico della copia rimossa: le nuove proiezioni e le
evidenze di test occupano a loro volta spazio e non va presentato come un
ulteriore risparmio netto dell'intero workspace.

Per ripristinare la directory usare `Expand-Archive` sullo ZIP con destinazione
`output/home-commit-package/`, verificando prima che tale destinazione sia nuova.
La precedente copia `output/pages-optimization-2026-11-08/site/` è stata
conservata perché uno script di verifica la usa ancora come percorso predefinito.
La cronologia Git non è stata riscritta; nessun commit, push o deploy eseguito.
