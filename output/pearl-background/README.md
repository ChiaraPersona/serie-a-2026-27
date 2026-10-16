# Sfondo generale bianco perla — 16 ottobre 2026

## File sorgente modificati
- css/page-background.css: unica definizione del fondo generale, condivisa da Serie A, Coppa Italia, Champions League e viste dinamiche. Base #F8F7F4, quattro grandi gradienti radiali asimmetrici con avorio #F5F1EB, ghiaccio #EAF3F5, grigio perla #E9ECEB e bianco #FFFFFF in trasparenza. Livelli fissi, senza ripetizione o animazioni. Disattivati soltanto i precedenti veli decorativi del body e il motivo puntinato Champions.
- css/styles.css: import del nuovo modulo dopo gli stili delle competizioni, per sostituire gli override del solo sfondo.

Nessuna modifica a dimensioni, larghezza massima, spaziature, font, colori dei testi, navbar, gradienti delle card, bordi, ombre, dati o logica JavaScript. Le trasparenze esistenti mostrano naturalmente il nuovo fondo.

## Verifiche
45 confronti prima/dopo, ciascuno con caricamento completo: nove viste a 1440, 901, 768, 390 e 320px.

Viste: homepage; statistiche squadre; Inter; Lettura Frosinone-Sassuolo MD7; Schedina MD7; Coppa Italia; Champions League; AEK Athens; Lettura Champions MD2.

Esito: nessun overflow orizzontale del documento; nessun errore JavaScript rilevato; identica altezza delle pagine e geometria di main/navbar/footer; identici stili campionati di componenti, testi, tabelle e card. Il nuovo sfondo calcolato e identico su tutte le viste. Nessun testo chiaro rilevato direttamente sul fondo privo di una superficie propria nelle viste Champions controllate.

Screenshot dei template statistiche squadre e Champions a 1440 e 390px, sia in cima sia a meta pagina: continuita del fondo senza giunzioni o ripetizioni. report.json contiene le misure e gli esiti di ciascun confronto; before/ conserva il CSS esatto precedente.

node scripts/test-css-modules.js: superato, entry point 957 byte. git diff --check: superato.

Nessun commit, push o deploy eseguito.
