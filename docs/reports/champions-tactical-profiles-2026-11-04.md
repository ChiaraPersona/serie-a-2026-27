# Profili tattici descrittivi Champions — 4 novembre 2026

Rimossi i due paragrafi arbitrali richiesti dalla presentazione pubblica. `statisticsSample`, `sampleNote`, `historyNote`, le fonti e i limiti restano integralmente negli archivi interni. Il renderer non mostra più le due note nel campione storico e nella tabella delle ultime cinque gare. Aggiornata la versione della catena di moduli per evitare il riuso della vecchia UI in cache.

La precedente sezione tattica leggeva essenzialmente i 20 profili Serie A; per molte squadre Champions mancavano quindi possesso, tiri e gol nel pannello, anche in presenza di dati già verificati. Il nuovo recupero è esclusivamente descrittivo: non introduce valutazioni inventate di pressing, baricentro, transizioni o vulnerabilità.

`scripts/build-champions-tactical-profiles.cjs` ricostruisce 1.922 osservazioni dagli archivi ESPN/FotMob e dai referti canonici Champions, controllando identità e date degli snapshot. Gli archivi vengono solo letti. Nessuna identità/data incongruente è stata rilevata; i record non verificabili non ricevono dati inventati. Le osservazioni duplicate fra archivio e referto vengono riconciliate per squadra, competizione e data, dando priorità al referto canonico.

La proiezione contiene tutte le 36 squadre e le 144 fixture del calendario. Per MD4 sono disponibili per ogni squadra le tre gare Champions precedenti. Possesso, passaggi, produzione e concessione di tiri, SOT, gol, corner, cross e lanci lunghi hanno denominatori separati; le medie dei passaggi sono ponderate sui tentativi effettivi. I campioni stagionali di campionato restano espandibili e separati. I moduli della fixture conservano lo stato ufficiale/probabile. Le direzioni d'attacco mantengono il campione storico 2025/26: 30 squadre coperte, sei N/D. Non vengono ricavate percentuali da un'etichetta tattica.

Output pubblico leggero: `data/generated/champions-tactical-profiles-2026-27.json`. Evidenze con URL, file, timestamp e SHA256: `data/normalized/champions-tactical-evidence-2026-27.json`, escluso dal pacchetto Pages. La pagina non mostra fonti o provider. Nessuna modifica a motori, formule, quote, selezioni o liquidazioni.

Controlli superati: `scripts/test-champions-tactical-profiles.cjs`; `scripts/test-referee-dashboard.mjs` (524 pannelli); `scripts/check-referee-layout-cache.cjs` (Serie A e Porto–Napoli con vecchio modulo simulato); `scripts/check-champions-md04-referees-browser.cjs` (36 casi desktop/mobile sulle 18 Letture, due profili tattici per fixture, valori esatti, testi rimossi, overflow ed errori JavaScript); `scripts/test-package-pages.cjs`. Il pacchetto resta sotto il budget di 950 MB.

Build limitato alle shell Champions/Schedina e aggiornamento dei riferimenti della shell Lettura. Nessun commit, push o deploy.
