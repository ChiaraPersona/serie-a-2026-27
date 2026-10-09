# Serie A 2026/27 — Fase 5D: audit tecnico dei mercati giocatore DUO

Data audit: 2026-10-09  
Ambito: **esclusivamente diagnostico**. Nessuna probabilità DUO è stata calcolata o aggiunta al prodotto.

## Esito sintetico

- Ricostruiti **553/553** esiti: **336** SOT DUO e **217** tiri totali DUO.
- Stato originario Fase 5B.1: **397** con identità+titolare riconciliate; **156** senza crosswalk affidabile.
- Nei 156: **150 esiti / 69 providerPlayerId** hanno un crosswalk locale esatto e verificabile; di questi **13** esiti riguardano titolari probabili, **117** riserve e **20** stato formazione ignoto. Le corrispondenze approssimative non sono state promosse.
- Classificazione finale: **D1 0 · D2 0 · D3 410 · D4 143**.
- Aggiungibili in sicurezza oggi: **0**. Esiti che richiedono un nuovo modello DUO: **410**. Gli altri **143** restano non eleggibili per identità/titolarità/policy.
- Catalogo Schedina invariato: **383 totali / 367 valutate / 16 NOT_MODELLED**.

| Classe | Esiti | Interpretazione |
| --- | --- | --- |
| D1 | 0 | Contratto DUO identico già valutato canonicamente |
| D2 | 0 | Derivazione esatta da distribuzioni già validate |
| D3 | 410 | Identità+titolare+quota riconciliati; serve nuovo modello DUO |
| D4 | 143 | Identità/titolarità/policy non eleggibile |

## 1. Riconciliazione dei 553 esiti

Il JSON diagnostico **output/reports/serie-a-md06-phase-5d-duo-audit-2026-10-09.json** contiene, per ogni **providerSelectionId**: partita, ID evento/mercato/esito/giocatore provider, identità canonica, nome, squadra, ruolo, stato e fonte formazione, timestamp, soglia, quota, stato mercato, audit raw→normalizzato, capacità V2, motivi D1-D4 e flag di autorizzabilità.

Controlli: **553 ID unici**, **553/553** riconciliazioni raw→normalizzato esatte, quote numeriche e mercati/esiti aperti, soglie coerenti, **0** duplicati nel catalogo corrente. La firma deterministica delle sole decisioni è **e940c3ef2bb87c8467220cd8968aae1caf8e198e77faf0a6c425dfb2ad1dc712**.

## 2. Semantica commerciale verificata

Fonte primaria: [Regole calcio Sisal](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf).

### Regole esplicitamente documentate

- Il DUO singolo somma il giocatore nominato e **chi lo sostituisce direttamente**; se non viene sostituito conta solo il nominato.
- Se il nominato non partecipa, l'esito è rimborsato; anche un ingresso breve costituisce partecipazione.
- Tiri totali: goal, tiri nello specchio, fuori e legni. SOT DUO in questo perimetro: goal, conclusioni che entrerebbero e pali/traverse.
- Le varianti analizzate sono **INCL. T.S.**, quindi includono gli eventuali supplementari.

### Semantica strutturata

- Codici **28507** (tiri totali) e **28506** (SOT con pali/traverse), un **providerPlayerId** nominato, soglia e quota per riga.
- Le 553 varianti riportano **SOMMA ... E SUO SOST. INCL. T.S.**; i link V2 esistenti marcano **replacementIncluded=true**.

### Non confermato — nessun settlement inventato

- Non è stata trovata una clausola esplicita che stabilisca se, quando il sostituto diretto viene poi sostituito, entri anche il giocatore successivo. Le catene multiple restano **RULE_UNVERIFIED**.
- Non è stata trovata una clausola separata sul minuto di recupero. Il dataset MD1-MD5 conserva solo il minuto intero 0-90 e non il componente **+N**.
- Questi limiti rendono il mercato **non autorizzabile oggi**, anche se il nucleo del contratto è documentato.

## 3. Stato dei 156 crosswalk mancanti

Sono stati riusati soltanto collegamenti locali fixture-scoped già presenti e deterministici: match esatto o token+iniziale univoco con punteggio del matcher >=96. Mononimi/fuzzy, pareggi e mismatch di iniziale restano non definitivi. La policy titolari non è cambiata.

| providerPlayerId | Etichetta Sisal | Esiti | Esito verifica | playerId candidato | Formazione | Classificazione esiti |
| --- | --- | --- | --- | --- | --- | --- |
| 622893 | ADDAI J. | 2 | ACCEPTED_DETERMINISTIC | jayden-addai | reserve | D4 |
| 1050946 | BAKOLA D. | 2 | ACCEPTED_DETERMINISTIC | darryl-bakola | reserve | D4 |
| 362914 | BALERDI L. | 2 | ACCEPTED_DETERMINISTIC | leonardo-balerdi | reserve | D4 |
| 443777 | BOWIE T. | 2 | NOT_ACCEPTED | N/D | unknown | D4 |
| 803719 | CAMARDA F. | 2 | ACCEPTED_DETERMINISTIC | francesco-camarda | reserve | D4 |
| 600048 | CANDE FALI | 2 | ACCEPTED_DETERMINISTIC | fali-cande | unknown | D4 |
| 267489 | CAQUERET M. | 2 | ACCEPTED_DETERMINISTIC | maxence-caqueret | reserve | D4 |
| 539147 | CARBONI F. | 2 | ACCEPTED_DETERMINISTIC | franco-carboni | reserve | D4 |
| 367229 | CARLOS AUGUSTO | 2 | ACCEPTED_DETERMINISTIC | carlos-augusto | reserve | D4 |
| 576591 | CASTRO S. | 2 | ACCEPTED_DETERMINISTIC | santiago-castro | reserve | D4 |
| 732288 | CISSE A. | 2 | ACCEPTED_DETERMINISTIC | alphadjo-cisse | reserve | D4 |
| 1076960 | CREMASCHI B. | 2 | ACCEPTED_DETERMINISTIC | benjamin-cremaschi | reserve | D4 |
| 54150 | CRISTANTE B. | 2 | ACCEPTED_DETERMINISTIC | bryan-cristante | unknown | D4 |
| 941288 | DE MARTIS T. | 2 | ACCEPTED_DETERMINISTIC | thomas-de-martis | reserve | D4 |
| 1076961 | DIALLO O. | 2 | ACCEPTED_DETERMINISTIC | ousmane-diallo | reserve | D4 |
| 601924 | DOMINGUEZ B. | 2 | ACCEPTED_DETERMINISTIC | benjamin-dominguez | reserve | D4 |
| 288121 | DOSSENA A. | 2 | ACCEPTED_DETERMINISTIC | alberto-dossena | unknown | D4 |
| 1076962 | DROBNIC D. | 2 | ACCEPTED_DETERMINISTIC | dominik-drobnic | reserve | D4 |
| 87903 | ELMAS E. | 6 | ACCEPTED_DETERMINISTIC | eljif-elmas | reserve | D4 |
| 1076963 | ELPHEGE N. | 2 | ACCEPTED_DETERMINISTIC | nesta-elphege | reserve | D4 |
| 628912 | ESPOSITO P. | 1 | ACCEPTED_DETERMINISTIC | pio-esposito | reserve | D4 |
| 92318 | ESTUPINAN P. | 2 | ACCEPTED_DETERMINISTIC | pervis-estupinan | reserve | D4 |
| 633815 | FABBIAN G. | 2 | ACCEPTED_DETERMINISTIC | giovanni-fabbian | reserve | D4 |
| 541586 | FEDDE L. | 2 | ACCEPTED_DETERMINISTIC | fedde-leysen | probable-starter | D3 |
| 544929 | FRIGAN M. | 2 | ACCEPTED_DETERMINISTIC | matija-frigan | reserve | D4 |
| 244675 | GABBIA M. | 2 | ACCEPTED_DETERMINISTIC | matteo-gabbia | reserve | D4 |
| 633833 | GHILARDI D. | 2 | ACCEPTED_DETERMINISTIC | daniele-ghilardi | reserve | D4 |
| 432193 | GHION A. | 2 | ACCEPTED_DETERMINISTIC | andrea-ghion | unknown | D4 |
| 54153 | GOLDANIGA E. | 2 | ACCEPTED_DETERMINISTIC | edoardo-goldaniga | reserve | D4 |
| 337341 | GONCALVES PEDRO | 5 | ACCEPTED_DETERMINISTIC | goncalves-p | probable-starter | D3 |
| 608588 | HUTCHINSON O. | 1 | ACCEPTED_DETERMINISTIC | omari-hutchinson | reserve | D4 |
| 520140 | JASHARI A. | 2 | ACCEPTED_DETERMINISTIC | ardon-jashari | reserve | D4 |
| 731688 | KAIKI | 2 | NOT_ACCEPTED | kaiki | unknown | D4 |
| 1068607 | KAMBWALA W. | 2 | ACCEPTED_DETERMINISTIC | willy-kambwala | reserve | D4 |
| 244677 | KEAN M. | 5 | ACCEPTED_DETERMINISTIC | kean | reserve | D4 |
| 48010 | KEMPF M. | 2 | ACCEPTED_DETERMINISTIC | marc-oliver-kempf | reserve | D4 |
| 1076965 | KONATE A. | 2 | ACCEPTED_DETERMINISTIC | abdou-salam-konate | unknown | D4 |
| 530627 | KOULIERAKIS K. | 2 | ACCEPTED_DETERMINISTIC | konstantinos-koulierakis | reserve | D4 |
| 1064884 | LAHDO A. | 2 | ACCEPTED_DETERMINISTIC | adrian-lahdo | unknown | D4 |
| 628913 | LIPANI L. | 2 | ACCEPTED_DETERMINISTIC | luca-lipani | reserve | D4 |
| 12190 | LOFTUS-CHEEK R. | 2 | ACCEPTED_DETERMINISTIC | ruben-loftus-cheek | reserve | D4 |
| 1082622 | LONTANI S. | 2 | ACCEPTED_DETERMINISTIC | simone-lontani | reserve | D4 |
| 486538 | LUIS HENRIQUE | 2 | ACCEPTED_DETERMINISTIC | luis-henrique | reserve | D4 |
| 1067827 | LULLI E. | 2 | ACCEPTED_DETERMINISTIC | emanuele-lulli | reserve | D4 |
| 65671 | MARTINEZ L. | 2 | ACCEPTED_DETERMINISTIC | lautaro-martinez | reserve | D4 |
| 112188 | MILLA L. | 2 | ACCEPTED_DETERMINISTIC | luis-milla | reserve | D4 |
| 531034 | MUSAH Y. | 2 | ACCEPTED_DETERMINISTIC | yunus-musah | reserve | D4 |
| 428271 | NDIAYE N. | 2 | NOT_ACCEPTED | N/D | unknown | D4 |
| 1051878 | OBRADOR R. | 2 | ACCEPTED_DETERMINISTIC | rafel-obrador | reserve | D4 |
| 460528 | ODENTHAL CAS | 2 | ACCEPTED_DETERMINISTIC | cas-odenthal | reserve | D4 |
| 622536 | ORDONEZ C. | 2 | ACCEPTED_DETERMINISTIC | christian-ordonez | reserve | D4 |
| 30764 | PAVARD B. | 2 | ACCEPTED_DETERMINISTIC | benjamin-pavard | reserve | D4 |
| 55271 | PIERINI N. | 2 | ACCEPTED_DETERMINISTIC | nicholas-pierini | unknown | D4 |
| 735402 | PISILLI N. | 2 | ACCEPTED_DETERMINISTIC | niccolo-pisilli | reserve | D4 |
| 420957 | RENSCH D. | 2 | ACCEPTED_DETERMINISTIC | devyne-rensch | reserve | D4 |
| 366151 | RICCI SAMUELE | 2 | ACCEPTED_DETERMINISTIC | samuele-ricci | reserve | D4 |
| 732652 | RODRIGO MORA | 2 | ACCEPTED_DETERMINISTIC | rodrigo-mora | reserve | D4 |
| 1064889 | RODRIGUEZ JESUS | 2 | ACCEPTED_DETERMINISTIC | jesus-rodriguez | reserve | D4 |
| 480327 | SARR PAPE | 6 | ACCEPTED_DETERMINISTIC | sarr-p | probable-starter | D3 |
| 419958 | SMOLCIC I. | 2 | ACCEPTED_DETERMINISTIC | ivan-smolcic | reserve | D4 |
| 585082 | SOULE M. | 2 | ACCEPTED_DETERMINISTIC | matias-soule | reserve | D4 |
| 387980 | SPENCE D. | 2 | ACCEPTED_DETERMINISTIC | djed-spence | reserve | D4 |
| 74800 | STANKOVIC A. | 2 | ACCEPTED_DETERMINISTIC | aleksandar-stankovic | reserve | D4 |
| 12898 | STONES J. | 2 | ACCEPTED_DETERMINISTIC | john-stones | unknown | D4 |
| 645331 | SULEMANA I. | 2 | ACCEPTED_DETERMINISTIC | sulemana-i | reserve | D4 |
| 520000 | TERRACCIANO F. | 2 | ACCEPTED_DETERMINISTIC | filippo-terracciano | reserve | D4 |
| 157148 | TOMORI F. | 2 | ACCEPTED_DETERMINISTIC | fikayo-tomori | reserve | D4 |
| 401004 | VALENTI L. | 2 | ACCEPTED_DETERMINISTIC | lautaro-valenti | reserve | D4 |
| 465347 | VAN DER BREMPT I. | 2 | ACCEPTED_DETERMINISTIC | ignace-van-der-brempt | reserve | D4 |
| 596730 | VOLPATO C. | 2 | ACCEPTED_DETERMINISTIC | cristian-volpato | unknown | D4 |
| 312405 | WALUKIEWICZ S. | 2 | ACCEPTED_DETERMINISTIC | sebastian-walukiewicz | unknown | D4 |
| 54318 | ZIELINSKI P. | 2 | ACCEPTED_DETERMINISTIC | piotr-zielinski | reserve | D4 |

Nota: candidati locali come **NDIAYE N.**→Abdoulaye Ndiaye o **BOWIE T.**→Kieron Bowie non sono accettati perché l'iniziale non coincide. Un nome simile non basta.

## 4. Capacità attuali dell'Engine V2

Per i giocatori coperti sono disponibili minuti attesi, probabilità editoriale di titolarità, rischio di sostituzione **categoriale**, tiri/SOT attesi, marginali Poisson per soglia, ruolo e fattori matchup. **likelyReplacement** è nullo nell'intero snapshot operativo e non esistono probabilità/tempistiche di sostituzione o una distribuzione completa DUO serializzata.

Mancano: distribuzione dell'identità del subentrante, tempi di cambio, volume condizionale del sostituto, catene successive, stato DNP/rimborso, legni a livello giocatore e pesi congiunti degli scenari. Le probabilità individuali sono conservate soltanto come diagnostica: **mai usate come probabilità DUO**.

## 5. Disponibilità storica delle sostituzioni

MD1-MD5: **50** partite concluse, **50** con copertura dichiarata completa, **1590** righe giocatore, **1100** titolari, **490** sostituzioni con ID out/in espliciti. Tiri, SOT standard e minuti sono presenti in **1590/1590/1590** righe; legni giocatore in **0**.

Le sostituzioni permettono di osservare **3** catene in cui un subentrante esce successivamente, distribuite su **3** partite. Non sono state inferite catene dai minuti. I 1100 slot titolare hanno tiri/SOT standard ricostruibili per titolare + sostituto diretto, ma 3 slot incontrano l'ambiguità della catena e i SOT Sisal con legni non sono ricostruibili.

Stagione precedente: **10** file ESPN raw, **474** righe roster, **95** link di sostituzione espliciti (95 con clock), **0** righe con legni giocatore. È un campione di dieci partite, non un corpus canonico di stagione né una base di settlement DUO.

## 6. Fattibilità del modello DUO

La fattibilità tecnica è condizionata a nuovi dati e a un nuovo modello. La specifica minima è:

1. Stato discreto: DNP/rimborso, nessun cambio, cambio a tempo t con identità del sostituto, eventuale catena successiva secondo regola certificata.
2. Distribuzione temporale del cambio condizionata a giocatore, ruolo, squadra, punteggio/contesto e formazione ufficiale.
3. Intensità tiri/SOT/legni per ciascun occupante dello slot nei minuti assegnati, con dipendenza dal matchup e senza assumere indipendenza non validata.
4. Aggregazione degli scenari con pesi calibrati e distribuzione discreta del conteggio, separata per tiri totali e SOT+legni.
5. Stato di rimborso separato dalla probabilità sportiva e tracciamento della versione delle regole Sisal.

Sottogruppi come “nessun cambio”, tiri totali o coppie sostituto stabili possono ridurre la complessità, ma non sono automaticamente D2: pre-kickoff lo scenario resta incerto e richiede calibrazione.

## 7. Protocollo di validazione prospettica

- Snapshot immutabile prima del kickoff con quota, ID provider, contratto, input, formazione e timestamp; seconda fotografia quando esce l'XI ufficiale senza sovrascrivere la prima.
- Acquisizione post-partita di sostituzioni esplicite (compreso **+N**), catene, tiri, SOT, legni e settlement/void da fonte organizer/OPTA compatibile.
- Brier e log loss per soglia, reliability/ECE e pendenza/intercetta di calibrazione con incertezza clusterizzata per partita/slot.
- Baseline congelate: named-player-only diagnostica, implicita di mercato corretta per margine, modello storico dello slot.
- Cutoff cronologici, nessuna informazione target/futura, holdout temporale indipendente. **Nessun gate PASS** viene fissato sui soli dati retrospettivi MD1-MD5.

## 8. Conclusione operativa

**0 mercati DUO possono essere aggiunti in sicurezza oggi.** I **410 D3** hanno identità, titolarità e quote riconciliate ma richiedono un nuovo modello e una nuova calibrazione; i **143 D4** restano non eleggibili. D1 e D2 sono entrambi zero. Nessuna formula, quota, policy, pagina o voce del catalogo è stata modificata.
