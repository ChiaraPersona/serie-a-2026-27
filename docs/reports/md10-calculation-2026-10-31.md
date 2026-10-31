# Serie A MD10 — Letture, pronostici e Schedina

Aggiornamento locale del 31 ottobre 2026. Dieci Letture pubblicate, 245 pronostici condivisi, tutti con quota verificata nello snapshot Sisal del 31 ottobre (ultimo evento 09:58:37 UTC). Le formazioni restano probabili: nessun filtro definitivo viene attivato da questo stato. Nessun commit, push o deploy.

Sono riutilizzati motore 4.13.0, modelli statistici e validazione congelata MD6, senza modificare formule, pesi o criteri di ammissione. I nuovi orchestratori MD10 riprendono la catena condivisa MD9. La pagina Schedina e la proiezione dei portafogli ora caricano anche la decima giornata. Nessun numero fisso di esiti per partita e nessuna multipla preconfezionata forzata.

| Fixture | Pronostici condivisi | Quote verificate |
|---|---:|---:|
| bologna-monza-2026-27-md-10 | 22 | 22 |
| udinese-roma-2026-27-md-10 | 21 | 21 |
| milan-inter-2026-27-md-10 | 23 | 23 |
| como-venezia-2026-27-md-10 | 24 | 24 |
| frosinone-torino-2026-27-md-10 | 28 | 28 |
| lazio-cagliari-2026-27-md-10 | 28 | 28 |
| lecce-genoa-2026-27-md-10 | 20 | 20 |
| juventus-napoli-2026-27-md-10 | 26 | 26 |
| sassuolo-fiorentina-2026-27-md-10 | 26 | 26 |
| atalanta-parma-2026-27-md-10 | 27 | 27 |

## Integrità e limiti

- Cutoff prima della MD10; previsioni e Letture delle altre giornate preservate e confrontate con HEAD. Le modifiche concorrenti al referto Fiorentina–Atalanta MD9 e alla presentazione sono state conservate.
- Cataloghi Lettura e Schedina identici. Tutti i contratti verificati contro fixture, provider market/selection ID, variante, soglia e quota.
- 115 mercati tiri giocatore mantengono il contratto DUO (sostituto incluso, pali/traverse dove previsti); probabilità DUO, quota equa ed EV null. Nessuna conversione in un contratto individuale.
- 30 portafogli MyCombo validati con i criteri esistenti. Nessuna modifica ai rendimenti originari o alle liquidazioni.
- Lo snapshot probabili mantiene una mancata associazione per Esteban, Lecce, ID editoriale 7647. Non è stata inventata un'associazione nella fonte e nessuna selezione operativa pubblicata riguarda quel nome; le segnalazioni non risolte restano nel data-audit interno.
- Fonti, URL ed evidenze restano interni; la presentazione pubblica usa la policy condivisa.

## Verifiche eseguite

Superati: test-schedina-md10.mjs (245 esiti, 245 quotati, salvataggi), test-reading-md10.cjs (dati e 20 verifiche browser desktop/mobile), check-schedina-md10.cjs (catalogo, salvataggio/rimozione, sincronizzazione e link dall'indice), test-reading-browser-data.mjs (380 fixture), test-official-starter-policy.cjs (inclusi vecchie MyCombo e rifiuto di aggiunte non ammesse), test-betting-selection-contract.js e test-personal-betslip.mjs.

Eseguiti apply-official-starter-policy.js e build-site.js con --presentation-only, --matchday 10 e scope Lettura/Schedina. I browser sono stati eseguiti fuori dalla sandbox dopo il blocco di avvio Edge nell'ambiente ristretto.

Evidenze: reports/md10-reading-refresh/data-audit.json e browser-audit.json; reports/md10-schedina/data-audit.json e browser-audit.json.
