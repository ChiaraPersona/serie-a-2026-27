# Letture archiviate leggere — 15 novembre 2026

Intervento su Serie A e Champions, senza eliminare statistiche, previsioni,
contratti o fonti interne e senza eseguire i motori previsionali.

## Spazio del sito pubblico

La misura precedente era già compattata JSON: non si tratta di un confronto
con gli originali indentati. Sono MB decimali, non MiB.

| Archivi trasformati | File | Prima | Dopo | Risparmio |
|---|---:|---:|---:|---:|
| Serie A | 166 | 185,86 MB | 98,38 MB | 87,48 MB |
| Champions | 27 | 117,66 MB | 52,25 MB | 65,41 MB |
| Totale | 193 | 303,53 MB | 150,64 MB | 152,89 MB |

L'intero pacchetto passa da circa **502,41 MB a 349,52 MB**, circa **30,4% in
meno**. Piccoli aggiornamenti al codice e alle versioni degli asset spiegano
la differenza di pochi KB tra risparmio degli archivi e risparmio netto.

Sommando la rappresentazione gzip dei 193 file, il risparmio è circa 4,30 MB:
2,88 MB per Serie A e 1,41 MB per Champions. È la somma dei file interessati,
non il download iniziale né il risparmio garantito di ogni visita.

Il risparmio riguarda il pacchetto destinato alla pubblicazione. Gli archivi
canonici sul disco e i dati utilizzati per calcolare le giornate future restano
completi: non è stata liberata quella quantità di spazio nel repository locale.

## Rappresentazione e compatibilità

`scripts/reading-archive-scope.cjs` seleziona soltanto fixture concluse o archivi
di giornate interamente concluse. Per Champions sono incluse le giornate
concluse 1–4 quando il nome del dataset permette di identificarle, oltre agli
artefatti derivati MD3. Calendari condivisi e scenari futuri restano normali JSON.

Il packager applica `readings-lossless-v1` solo alla copia pubblica e solo se
riduce sia byte sul disco sia gzip. Le chiavi e i testi ripetuti sono conservati
in dizionari; il browser ricostruisce ogni campo e valore prima di applicare
filtri, rendering e valutazioni. Non si arrotondano numeri e non si rimuovono
selezioni, quote, ID, metadati, N/D o informazioni operative.

La rappresentazione in pubblicazione richiede il decoder condiviso. I lettori
diretti degli endpoint pubblici interessati devono decodificarla; gli strumenti
interni continuano a leggere gli originali canonici senza adattamenti.

## Riutilizzo delle Letture concluse

Il builder delle proiezioni Serie A può riutilizzare la presentazione già
archiviata. Un controllo sui dati correnti ha trovato riutilizzabili 110/110
Letture concluse. Risultato completo, lettura, previsioni originali, contratti e
formazioni ufficiali sono confrontati con gli input canonici: una correzione
invalida il riutilizzo. Le statistiche descrittive del contesto già archiviato
restano quelle della fotografia conservata.

Un aggiornamento con `--matchday N` rigenera esplicitamente la giornata;
`--refresh-archived` forza la rigenerazione delle presentazioni archiviate.
Questi comandi conservano gli effetti del builder esistente: non sono controlli
in sola lettura. La compattazione Champions non ricalcola alcun pronostico.

## Verifiche

- Ricostruzione identica di tutti i 334 file candidati, inclusi quelli lasciati
  normali perché la compattazione non era conveniente.
- Lettore comune degli artefatti e servizio dati verificati con e senza
  deduplicazione: stessi dati Serie A e Champions e stesso filtro titolari.
- Test del riutilizzo con correzioni a risultato, previsioni, formazioni,
  contratti e testo: nessuna correzione viene congelata per errore.
- Confronti browser prima/dopo su MD6/8/11 Serie A e MD2/3/4 Champions a
  1440/390 px, usando JSON compattato e gzip. L'attesa usa il segnale di
  rendering completato, includendo i pannelli caricati successivamente.
- Test del pacchetto, del caricamento Schedina, del registro ufficiale e del
  rendering iniziale. Le formule e gli input statistici restano invariati.

Evidenze locali: `output/reading-archive-light-2026-11-15/before.json`,
`after.json` (dimensioni di tutti i file trasformati) e `browser.json`
(confronti del contenuto, screenshot e byte gzip per visita).
