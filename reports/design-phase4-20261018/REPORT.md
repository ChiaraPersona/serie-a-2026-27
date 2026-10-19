# Armonizzazione grafica — Fase 4

## Risultato e ambito

Rifinitura locale delle pagine sul design system esistente. Nessun nuovo
contenitore, nessuna modifica al DOM o ai renderer, nessuna dipendenza.
Larghezza massima, temi, glass, colori squadra, navbar e footer conservati.

Le intestazioni e la rimozione dei sottotitoli erano già presenti nella
baseline: non sono state implementate nuovamente. Anche la rimozione delle
fotografie dei calciatori è stata preservata integralmente.

## 1. File modificati

| File | Motivo |
| --- | --- |
| `css/team.css` | Rifinitura circoscritta alla directory Squadre e alla distanza fra titoli interni e contenuto nelle schede squadra. |
| `css/player-statistics.css` | Griglia dei due controlli del comparatore, distanza fra i pannelli e comportamento sui telefoni stretti. |
| `css/component-system.css` | Corretta la spaziatura nella regola già esistente delle sezioni aperte dell’indice Letture. Nessun nuovo override globale. |
| `css/reading-detail.css` | Ridotte soltanto le distanze esterne delle sezioni e fra intestazioni interne e contenuto degli approfondimenti universali. |
| `css/matches.css` | Alleggerito il solo pannello esterno del tabellone Coppa Italia. |
| `css/champions.css` | Alleggerito il solo contenitore esterno del calendario principale Champions. |
| `css/betting.css` | Allineata alla griglia l’introduzione interna dell’archivio Schedine. Intestazione principale intatta. |
| 31 shell HTML | Esclusivamente aggiornamento degli hash nei collegamenti CSS tramite `applyStyleLinks()`. Contenuto, struttura, script e versioni JavaScript preservati. |
| Questa directory | Baseline, screenshot completi, strumenti ripetibili e risultati dei controlli. |

`css/readings-index.css` è identico alla baseline: la rifinitura dell’archivio
è confluita nella regola già presente nel modulo condiviso, evitando una
duplicazione e mantenendo invariato il caricamento dinamico dell’indice.

## 2. Interventi pagina per pagina

| Pagina | Problema osservato e soluzione |
| --- | --- |
| Home | Hero, calendario laterale e classifica già equilibrati. Nessuna modifica: altezza del contenuto desktop identica, 2572 px. |
| Squadre | Card desktop da 300 px con spazio verticale abbondante intorno ai loghi. Altezza 280 px solo nella directory desktop, gap 16 px e margine finale 24 px. Glass, loghi e flip invariati; il contenuto dei 20 retro-card entra correttamente. Mobile mantiene l’altezza automatica. |
| Schede squadra | Distanza fra alcune intestazioni interne e contenuto superiore alle altre sezioni. Margine generale portato a 16 px; quelli già a 16 px restano invariati. Campo, coordinate, rosa, sezioni e comparatore intatti. |
| Giocatori | “Visualizza” e “Periodo” occupavano righe distanti; il contenitore dei controlli manteneva colonne vuote dopo lo spostamento dei campi ricerca nei profili. Due controlli affiancati nello stesso ordine DOM/tab, poi impilati fino a 600 px per leggibilità. Distanza dal pannello precedente ridotta da 64 a 32 px. Tabelle e dimensioni dei controlli compatti intatte. |
| Indice Letture | Margine inferiore e padding dei pannelli aperti si sommavano, soprattutto fra archivio e giornate future. La regola esistente usa padding superiore 16 px, inferiore zero e margine finale 24 px. Card glass, colori squadra e righe dell’archivio invariati. |
| Approfondimenti Serie A e Champions | Spazio fra sezioni di 52 px e ulteriori margini dei titoli interni. Spaziatura esterna 32 px desktop / 24 px mobile; distanza titolo-contenuto 16 px. Nessun riordino o cambiamento dei dati e dei componenti statistici. |
| Coppa Italia | Il pannello esterno aggiungeva bordo, glass, ombra e padding alle superfici dei singoli turni. Reso aperto il solo contenitore esterno. Conservati overflow del contenitore, navigazione turni, accordion, collegamenti, card e trattamento speciale della finale. |
| Champions League | Il calendario completo aggiungeva un’altra grande superficie alle card delle partite e ai gruppi archivio. Rimosso il trattamento esterno; margine superiore 32 px. Conservati tema notte, hero, directory loghi, riepilogo punti, filtri e card colorate. |
| Schedine | Introduzione interna rientrata di 8 px rispetto alle card. Tolto il rientro e portato il gap a 24 px. Card, flip, dimensioni, effetti e workspace della giornata restano invariati. Nessuna modifica all’H1. |

### Effetti misurati a 1440 px

| Contenuto principale | Prima | Dopo |
| --- | ---: | ---: |
| Home | 2572 | 2572 |
| Squadre | 1830 | 1698 |
| Scheda Inter | 4040 | 4032 |
| Giocatori | 2369 | 2287 |
| Indice Letture | 2280 | 2230 |
| Lettura Serie A | 5732 | 5552 |
| Coppa Italia | 4156 | 4102 |
| Champions principale | 4240 | 4172 |
| Lettura Champions | 4711 | 4531 |
| Schedina giornata 7 | 1093 | 1093 |
| Archivio Schedine | 1275 | 1275 |
| Scheda AEK Athens | 4791 | 4791 |

Altezze in pixel del contenuto principale, a parità di testi e dati. Non è
stata applicata una riduzione percentuale uniforme: le differenze derivano
soltanto dalle cause locali indicate sopra.

## 3. Screenshot completi prima/dopo

Aprire `confronto.html`: 24 coppie, 12 rotte a 1440 e 390 px, ciascuna con
pagina completa e immagini apribili alla risoluzione originale. Sono presenti
anche catture del primo viewport con prefisso `before-viewport` / `after-viewport`.

Ordine delle rotte negli screenshot:

0. Home.
1. Squadre.
2. Scheda Inter.
3. Giocatori.
4. Indice Letture.
5. Lettura Atalanta–Venezia.
6. Coppa Italia.
7. Champions League.
8. Lettura Lens–Sporting CP.
9. Schedina giornata 7.
10. Archivio Schedine.
11. Scheda AEK Athens.

La baseline è stata acquisita prima delle modifiche, con tutte le Fasi 0–3
già applicate. Screenshot intermedi e JSON per ogni intervento sono conservati
nella stessa directory.

## 4. Verifiche responsive e funzionali

| Verifica | Risultato |
| --- | --- |
| Matrice responsive finale | 12 rotte × 6 larghezze: 1440, 1050, 901, 768, 390 e 320 px. 72 confronti prima/dopo superati. |
| Metodo progressivo | Dopo ogni intervento verificata la pagina interessata a desktop e mobile; la rifinitura finale del comparatore è stata ricontrollata alle sei larghezze. |
| Overflow documento | Assente in tutte le 72 viste finali. Scroll interno delle tabelle conservato. |
| Testi e struttura | Identici testo completo del contenuto principale, numero di sezioni, tabelle e controlli. |
| Identità e dati visibili | Identici tutti i collegamenti, testi delle tabelle, sorgenti delle immagini e dataset/posizioni inline dei giocatori in campo. |
| Integrità sorgenti | SHA-256 invariati per tutti i 9.114 file dati e tutti i 44 file JavaScript. Nessun renderer modificato. |
| Intestazioni protette | `css/site-layout.css`, token, utility, renderer delle intestazioni e relativo comportamento invariati rispetto alla baseline. |
| Cache CSS | Aggiornati solo gli hash CSS delle 31 shell; trasformazione idempotente. Nessuna rigenerazione di dati o previsioni. |
| Primo rendering | 6 casi superati con applicazione bloccata: temi Serie A/Champions, dettagli e fallback legacy; verificati CSS e pixel dello sfondo. |
| Navbar | Menu mobile aperto/chiuso correttamente nei due temi, collegamenti preservati. |
| Giocatori | Filtro nome, cambio modalità del comparatore, tabella scorrevole e intestazioni sticky superati. |
| Tastiera | Focus visibile, attivazione filtro e scorrimento tabella superati. Controlli compatti ancora a 32 px. |
| Squadre | Verificati contenimento del testo nei 20 retro-card desktop e focus da tastiera. |
| Letture | Filtri titolari/panchina e pannello personale superati nelle due competizioni; archivio apribile/richiudibile; fallback legacy controllati. |
| Coppa | Accordion dei turni apribile/richiudibile. |
| Champions | Selezione giornata, squadra e reset funzionanti, indicazione dinamica aggiornata nel calendario. |
| Wrapping Giocatori | Correzione locale a 320 px ancora efficace; larghezza documento 320 px. |
| Test CSS | `node scripts/test-css-modules.js`: superato, entry point 994 byte. |
| Store | `node scripts/test-personal-betslip.mjs`: superato, inclusa persistenza. |
| Contratto selezioni | `node scripts/test-betting-selection-contract.js`: superato; 6 Schedina, 137 MyCombo e 137 prediction legs verificate. |
| Diff | `git diff --check`: superato. |

Risultati ripetibili: `before.json`, `after.json`, `focused.json`,
`keyboard-store.json`, `integrity.json`, `edits.json` e gli script di questa
directory. `finalize.cjs` verifica i file protetti e aggiorna soltanto le
versioni CSS delle shell correnti; `verify.cjs after` confronta le 72 viste.

## 5. Lavori concorrenti e aree intenzionalmente invariate

Il repository conteneva già modifiche alle intestazioni e alle relative
shell HTML. Sono state fotografate nella baseline e preservate. Prima di ogni
scrittura CSS è stato verificato l’hash rispetto alla baseline o all’ultima
modifica di questa fase; prima di aggiornare le shell è stato verificato che
nessun contenuto diverso dai parametri di versione CSS fosse cambiato.
Non sono emersi conflitti che richiedessero di sospendere una pagina.

Intenzionalmente invariati: Home completa, intestazioni principali,
sottotitoli già rimossi, navbar/footer, palette, foto calciatori già eliminate,
card partita e loro colori, griglie/filtri statistici e tabelle, coordinate
dei campi, rosa, ordine delle sezioni, profilo arbitrale, scheda Champions,
workspace Schedina, selezioni personali, MyCombo, Preferiti e policy pubblica
delle fonti. Le card Squadre conservano il proprio stile e differiscono
soltanto per altezza desktop e distanza nella griglia della directory.

Nessun `npm run build`, builder di dati o previsioni. Nessun commit, push o deploy.

## 6. Regressioni e limiti

Non sono state rilevate regressioni nelle verifiche eseguite. Rimane il limite
già documentato nella fase precedente: nelle due Letture operative usate dal
test non sono presenti righe selezionabili per ripetere in UI l’intero
trasferimento di una nuova selezione Lettura → Schedina. Non sono stati
creati dati artificiali; la persistenza dello store supera il test dedicato.

Le 20 schede Serie A condividono il medesimo selettore locale del titolo
interno; la verifica visiva completa di questa fase usa Inter come
rappresentante. Le altre schede non sono state nuovamente fotografate tutte.

La Fase 4 termina qui, senza avvio di ulteriori interventi.
