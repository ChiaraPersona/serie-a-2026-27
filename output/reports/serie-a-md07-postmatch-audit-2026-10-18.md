# Audit post-partita MD7 — 18 ottobre 2026

Ambito corretto: soltanto le quattro gare della settima giornata gia concluse. Nessun esito attribuito alle altre sei fixture.

| Partita | Finale | Verdi | Rossi | VOID | Puntato | Ritorno | Netto |
|---|---:|---:|---:|---:|---:|---:|---:|
| Frosinone–Sassuolo | 4–2 | 22 | 0 | 0 | 22,00 € | 28,57 € | +6,57 € |
| Venezia–Napoli | 1–0 | 12 | 7 | 0 | 19,00 € | 18,10 € | −0,90 € |
| Bologna–Inter | 1–3 | 13 | 7 | 0 | 20,00 € | 21,09 € | +1,09 € |
| Roma–Genoa | 2–0 | 9 | 6 | 1 | 16,00 € | 13,57 € | −2,43 € |
| Totale | | 56 | 20 | 1 | 77,00 € | 81,33 € | +4,33 € |

ROI simulato +5,62%; nessun grigio tra i 77 mercati esaminati. VOID rimborsato. Applicate le regole del motore esistente, incluso sostituto e pali/traverse secondo il contratto salvato. Snapshot Git prima del kickoff: tutti i 77 contratti e relative quote coincidono con quelli attualmente pubblicati; dettagli nel JSON. Nessuna previsione rigenerata e nessuna quota modificata.

I risultati finali sono confermati dalle pagine Lega Serie A registrate nei file interni; le statistiche dettagliate sono acquisite tramite il parser e importatore StatMuse gia presenti. La verifica statistica non certifica una liquidazione Sisal.

Corretto un passaggio nel servizio dati: il filtro titolari veniva applicato anche ai referti, eliminando contributi dei sostituti e alterando la verifica DUO nel browser. Il referto completo ora raggiunge il verificatore esistente. Nessuna modifica a formule, pesi, criteri di ammissione, quote, design o filtro delle selezioni operative. I dati di tutte le fixture estranee sono identici al baseline.

Esiti e importi sono aggiornati automaticamente nelle righe e sul retro della card della settima giornata dal renderer esistente. Test MD7, policy titolari (zero rimozioni), build, controllo browser a 1440 e 390 px e verifica card superati. Browser: 56 verdi, 20 rossi, 1 VOID, nessun overflow o errore; MyCombo aggiunta/ricaricamento/rimozione verificati. Nessun commit, push o deploy.
