# Duelli e rischio disciplinare: verifica delle fonti primarie

Data: 24 ottobre 2026. Nota interna di ricerca per il progetto Serie A/Champions. Nessun calcolo, dato operativo, mercato o pagina pubblica modificato. Questa nota valuta le basi metodologiche della proposta; non prova un miglioramento predittivo.

## 1. Il bersaglio deve restare esplicito

La Regola 12 distingue ammonizione ed espulsione e comprende cause diverse: interventi imprudenti, interruzione di azioni promettenti, infrazioni ripetute, proteste, ritardi e altri comportamenti. Anche attaccanti, centrocampisti, portieri, riserve e giocatori sostituiti possono ricevere sanzioni. Una seconda ammonizione determina l'espulsione, ma non coincide semanticamente con un rosso diretto. Le regole del gioco non definiscono automaticamente la liquidazione di un contratto bookmaker. [IFAB, Law 12, 2026/27](https://theifab.com/laws/latest/fouls-and-misconduct/).

**Conseguenza per la proposta:** includere tutti i ruoli, senza dedurre la causa di un cartellino dal ruolo. Un attaccante può essere coinvolto in pressing, ripiegamento o fallo offensivo; il dato deve dimostrare quale meccanismo si sta usando. Un totale di cartellini non permette di stimare separatamente proteste e falli. Il ramo comportamentale rimane non identificato quando manca la classificazione degli eventi.

Il progetto ha già due contratti distinti: `RECORDED_YELLOW` osservazionale e `PLAYER_YELLOW` con contesto di eleggibilità del mercato. Il primo include gialli ordinari registrati anche in contesti panchina/post-partita, quando il feed disciplinare è completo. Un evento isolato `yellowRedCard` non diventa automaticamente un positivo ordinario. Feed incompleto significa `null`, non zero. Non modificare questi contratti durante l'aggiunta di caratteristiche tattiche. Riferimenti locali: [protocollo C0–C4](card-prediction-research-c0-c4.md) e [contratti dei dati disciplinari](card-data-targets-v1.md).

## 2. Tre livelli diversi di evidenza tattica

La documentazione ufficiale `statsbombpy` mostra campi per giocatore, posizione, coordinate, istante, eventi collegati, falli offensivi, tipo di fallo e cartellini associati a falli o comportamenti (`player_id`, `location`, `related_events`, `foul_committed_offensive`, `foul_committed_type`, `foul_committed_card`, `bad_behaviour_card`). Sono esempi della struttura possibile di un feed; non certificano la copertura delle nostre fixture. [StatsBomb/Hudl, statsbombpy](https://github.com/hudl/statsbombpy).

Il repository ufficiale open data contiene eventi e formazioni per le competizioni distribuite e dati 360 soltanto per alcune partite. Non è evidenza della disponibilità di Serie A o Champions 2026/27. Eventuali acquisizioni richiedono controllo di copertura, identità, versione e condizioni d'uso; il repository richiede attribuzione quando si pubblicano analisi basate sui dati. Non è stata effettuata alcuna importazione. [StatsBomb/Hudl Open Data](https://github.com/hudl/open-data).

**Proposta, non fatto osservato:**

| Livello | Che cosa possiamo affermare | Che cosa non segue automaticamente |
|---|---|---|
| Eventi individuali collegati | Due giocatori sono stati coinvolti in un episodio passato verificato | Che si marcheranno per tutta la prossima partita |
| Posizione, modulo e compiti stimati | Esistono uno o più duelli tatticamente compatibili | Frequenza o probabilità numerica del confronto |
| Quote aggregate per canale | La squadra ha distribuito l'attacco tra certe zone nel campione dichiarato | Identità del difendente, marcatura o numero di contatti |

La traduzione tra lato offensivo e lato difensivo va definita esplicitamente, rispettando l'orientamento del campo. Le coordinate disegnate dal renderer della formazione non sono tracking. Coperture, raddoppi, mezzali che scivolano e attaccanti in pressione devono poter produrre una relazione molti-a-molti. Senza evidenza sufficiente, mantenere candidati plausibili e incertezza, senza inventare percentuali o scegliere arbitrariamente il primo nome.

## 3. Come verificare l'utilità del contributo

La documentazione scikit-learn raccomanda di valutare osservazioni future quando esiste dipendenza temporale: mescolare casualmente passato e futuro può produrre una stima inaffidabile della generalizzazione. `TimeSeriesSplit` descrive un addestramento progressivo; nel nostro caso lo split va progettato per partite e timestamp, non applicato ciecamente alle righe dei singoli giocatori. [Cross-validation di serie temporali](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-of-time-series-data).

La calibrazione deve usare dati separati da quelli con cui è stato addestrato il classificatore. Brier score e log loss valutano complessivamente le previsioni probabilistiche: un Brier migliore non dimostra, da solo, una calibrazione migliore. Servono anche curva di calibrazione, distribuzione delle previsioni e numerosità dei gruppi. [Probability calibration](https://scikit-learn.org/stable/modules/calibration.html).

**Applicazione proposta nel protocollo esistente:**

- Conservare una baseline semplice ruolo/storico e la baseline C0–C4 già definita. Il `riskScore` legacy è confrontabile come ranking, non come probabilità dividendo per 100 o 150.
- Confrontare sul medesimo campione prepartita: baseline; baseline + canali; baseline + duelli; baseline + integrazione canali/duelli. Il contributo congiunto deve evitare di premiare due volte la stessa esposizione.
- Congelare prima del kickoff identità, XI probabile/ufficiale, minuti attesi e campioni. Le posizioni, i falli e i minuti effettivi della partita bersaglio servono soltanto per esiti/diagnostica.
- Includere l'intero universo di candidati ricostruibile, non solo i cinque nomi già selezionati. Distinguere titolari, panchina e mancata partecipazione secondo il target.
- Riutilizzare bootstrap per cluster-partita, confronti appaiati, ablation e criteri di maturità del framework; le soglie minime permettono un'analisi, non garantiscono evidenza sufficiente per promuovere il modello.
- Valutare due risultati separati: correttezza/riconoscibilità dei duelli e miglioramento degli esiti disciplinari. Spiegazioni più persuasive non equivalgono a probabilità più accurate.

## 4. Decisione suggerita

Il primo risultato utile è una tabella interna con candidato, uno o più avversari compatibili, tipo di coinvolgimento, canale, evidenze, assenze informative e stato dell'abbinamento. Lo stato "stimato" deve restare distinto da "osservato"; una XI ufficiale conferma i partecipanti, non le marcature. Solo dopo audit della copertura si può stimare e validare un contributo numerico. Il ramo tattico deve poter rimanere descrittivo o neutro quando i dati non permettono una misura sostenibile.

Le specifiche PDF StatsBomb Events v4.0.0 sono state individuate nel repository ufficiale, ma il recupero tramite browser ha restituito un errore sul tipo di contenuto; non sono state usate come evidenza. I campi citati sopra sono verificati nel README ufficiale `statsbombpy` effettivamente aperto.
