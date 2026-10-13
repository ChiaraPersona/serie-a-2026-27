# Champions League 2026/27 — Fase 9 historical recovery & identity resolution

Data audit: **2026-10-13**  
Gate finale: **PARTIAL**

## 1. Identità

- Casi `exact-name-only` riesaminati: **37**.
- Risolti con UEFA ID + nome + club + data di nascita + nazionalità: **37**.
- Ancora incerti tra i 37: **0**.
- Mika Medina: **resolved_verified_alias** → Mika Mármol Medina; risoluzione soltanto nell'audit, nessuna modifica automatica al registro di produzione.

| squadra | identità richiesta | UEFA ID | data nascita | nazionalità | stato | confidenza |
|---|---|---:|---|---|---|---|
| Real Madrid | Javi Navarro | 250201421 | 25/1/2007 | Spain | resolved_verified | high |
| Real Madrid | Diego Villalba | 250206694 | 16/2/2008 | Spain | resolved_verified | high |
| Real Madrid | Gabriel Valero | 250213264 | 03/8/2007 | Spain | resolved_verified | high |
| Fenerbahçe | Yasir Caklı | 250222125 | 30/1/2009 | Türkiye | resolved_verified | high |
| Fenerbahçe | Çağan Sarıdikmen | 250222120 | 30/1/2009 | Türkiye | resolved_verified | high |
| Fenerbahçe | Bedirhan Korkmaz | 250222123 | 19/9/2009 | Türkiye | resolved_verified | high |
| Fenerbahçe | Güner Ekici | 250222124 | 01/1/2009 | Türkiye | resolved_verified | high |
| Fenerbahçe | Emirhan Ateş | 250207773 | 16/1/2009 | Türkiye | resolved_verified | high |
| Bodø/Glimt | Matias Jaiteh | 250213119 | 10/1/2008 | Norway | resolved_verified | high |
| Bodø/Glimt | Mathias Blix Olsen | 250213088 | 20/7/2007 | Norway | resolved_verified | high |
| Bodø/Glimt | Kasper Solhaug | 250213132 | 03/5/2007 | Norway | resolved_verified | high |
| Feyenoord | Tim Haksteeg | 250183766 | 19/6/2006 | Netherlands | resolved_verified | high |
| Feyenoord | Marleyson Cruz | 250189848 | 16/2/2006 | Netherlands | resolved_verified | high |
| Feyenoord | Matthew Mparaganda | 250199589 | 12/2/2008 | Netherlands | resolved_verified | high |
| Feyenoord | Dani Slory | 250200576 | 23/11/2008 | Netherlands | resolved_verified | high |
| Feyenoord | Boaz Plantinga | 250216077 | 07/1/2009 | Netherlands | resolved_verified | high |
| Feyenoord | Nick De Koning | 250200556 | 01/2/2007 | Netherlands | resolved_verified | high |
| Feyenoord | Kevin Khan | 250199588 | 30/5/2008 | Canada | resolved_verified | high |
| Feyenoord | Luca Dahl Tomasson | 250218024 | 19/6/2008 | Denmark | resolved_verified | high |
| Feyenoord | Kelvin Neijenhuis | 250190224 | 10/2/2008 | Netherlands | resolved_verified | high |
| Galatasaray | Aleksei Batrakov | 250224345 | 09/6/2005 | Russia | resolved_verified | high |
| LASK | Christof Katzmayr | 250206921 | 10/5/2008 | Austria | resolved_verified | high |
| LASK | Joao Victor Tornich | 250223204 | 06/11/2002 | Brazil | resolved_verified | high |
| Porto | Martim Cunha | 250185409 | 28/2/2007 | Portugal | resolved_verified | high |
| Porto | Mateus Mide | 250204916 | 10/5/2008 | Portugal | resolved_verified | high |
| Sabah | Erivaldo Almeida | 250221486 | 15/1/2000 | Brazil | resolved_verified | high |
| Sabah | Aleksey Isaev | 250129032 | 09/11/1995 | Azerbaijan | resolved_verified | high |
| Sabah | Jafar Mukhtarov | 250221231 | 22/2/2005 | Azerbaijan | resolved_verified | high |
| Sabah | Shahin Ibrahimov | 250202772 | 30/7/2007 | Azerbaijan | resolved_verified | high |
| Slavia Praha | Emmanuel Ayaosi | 250223128 | 28/10/2004 | Nigeria | resolved_verified | high |
| Slavia Praha | Adonija Ouanda | 250223132 | 30/4/2005 | Canada | resolved_verified | high |
| Shakhtar Donetsk | Gabriel Carvalho | 250224147 | 17/8/2007 | Brazil | resolved_verified | high |
| Slovan Bratislava | Aleksandar Popović | 250089413 | 27/9/1999 | Serbia | resolved_verified | high |
| Stuttgart | Tom Walz | 250218212 | 24/1/2009 | Germany | resolved_verified | high |
| Stuttgart | Lucas Nagel | 250224503 | 17/3/2009 | Germany | resolved_verified | high |
| Villarreal | Yakiv Kinareikin | 250175645 | 22/10/2003 | Ukraine | resolved_verified | high |
| Villarreal | Nizar El Jmili | 250224969 | 30/11/2004 | Spain | resolved_verified | high |

## 2. Discrepanze UEFA / registro interno

Totale: **33**. Errori reali confermati: **0**; l'assenza di un timestamp storico UEFA impedisce di trasformare i delta List A in errori certi.

| classificazione | casi |
|---|---:|
| uefa_list_b_registration_after_or_missing_from_frozen_registry | 26 |
| uefa_list_a_registry_delta_timing_unresolved | 5 |
| transfer_then_uefa_list_a_registration | 1 |
| verified_alias_internal_identity_gap | 1 |

La voce Mika Mármol è una lacuna di alias/identificatori rispetto a Mika Medina; Joey Veerman è un trasferimento cronologicamente coerente. Le 26 List B sono delta di registrazione rispetto allo snapshot interno congelato del 7 settembre. Le restanti List A restano temporalmente ambigue tra registrazione successiva e omissione iniziale.

## 3. Recupero storico e cronologia

| misura | valore |
|---|---:|
| Referti MD1 nuovi | 12 |
| Partite già complete in Fase 8 | 6 |
| Partite con actual disponibili | 18/18 |
| Referti nuovi con tiri/SOT riconciliati | 12/12 |
| Versioni Git del forecast originale | 11 |
| Ricostruzioni retroattive usate | 0 |

I forecast ammessi sono esclusivamente snapshot generati e committati prima del kickoff. I referti recuperati il 2026-10-13 sono esiti post-partita e non vengono mai trattati come input prepartita. Le statistiche current-season raccolte dopo MD1 restano escluse dai baseline B/C storici.

## 4. Dataset di valutazione

| partizione | osservazioni | uso |
|---|---:|---|
| training | 0 | non creata; nessun refit autorizzato |
| calibration | 0 | finestra indipendente assente |
| test cronologicamente valido | 94 | metriche descrittive baseline A |
| incompleto | 7 | escluso dalle metriche |
| actual oltre top-5 senza forecast originale | 422 | non valutabile |

Partite con almeno un'osservazione valida: **18/18**. Gli artefatti Git serializzano sempre soltanto top-5 tiri e top-5 SOT: copertura forecast originale oltre top-5 **0**. Sono stati conservati gli actual oltre top-5, ma non sono state inventate previsioni retroattive.

## 5. Metriche valide

| metrica | n | MAE | RMSE | bias |
|---|---:|---:|---:|---:|
| tiri | 94 | 1,428 | 1,831 | 0,145 |
| SOT | 94 | 0,837 | 1,032 | 0,071 |

Bias = predetto − osservato. Brier: **NON CALCOLATO**. Confronti paired A/B/C: **NON ESEGUITI**. Mancano probabilità originali verificabili e previsioni B/C cronologicamente ammissibili sulle stesse osservazioni.

## 6. Blocchi residui

1. Una sola giornata costituisce il test cronologico.
2. Nessun forecast originale oltre l'unione top-5 tiri/top-5 SOT è stato serializzato.
3. Nessuna finestra indipendente di training/calibrazione/test per B/C.
4. Nessuna probabilità evento originale verificabile per Brier.
5. Le cinque discrepanze List A non Veerman/non Mika non hanno un timestamp storico UEFA che separi registrazione tardiva da omissione del registro.

## 7. Protezioni

- File protetti Fase 8 mutati: **0**.
- Raw protetti Fase 8 mutati: **0**.
- Motore, formule, coefficienti, Serie A V2, MD6, HTML/UI: **invariati**.
- Commit, push, deploy: **non eseguiti**.

## 8. Gate finale

**PARTIAL**

La valutazione descrittiva è ora estesa alle osservazioni originali recuperabili, ma il gate non può essere READY per una calibrazione attendibile: resta una sola finestra test e il forecast originale è top-5-only.

Fase minima successiva proposta: **Freeze complete pre-match forecasts for every eligible player before MD2/MD3, including model/version/timestamp and original probabilities where the model genuinely emits them; after outcomes, form one calibration window and at least one later untouched test window.**
