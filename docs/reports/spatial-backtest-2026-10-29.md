# Backtest territoriale Serie A — 29 ottobre 2026

Esperimento retrospettivo isolato, configurazione spatial-shape-pilot-v1. Nessuna modifica ai motori, ai pronostici, alle quote o alle selezioni pubblicate. Nessuna liquidazione o stima di rendimento certificato.

## Protocollo

Il modello di partenza usa i gol attesi prepartita conservati negli archivi: snapshot MD6 firmati e verificati tramite hash, oppure archivi con timestamp precedente al calcio d'inizio e contratto temporale valido. La versione corrente rigenerata dopo la gara è scartata. Gli archivi con solo timestamp non sono equiparati agli snapshot immutabili.

Le coordinate vengono ricostruite dai referti attuali; la loro disponibilità e versione originarie prima di ogni gara non sono provate. Il cutoff esclude la giornata bersaglio e tutte le gare con data uguale o successiva alla prima data della giornata o alla data di generazione della previsione, scegliendo il limite più prudente. Un ritardo nello scaricamento o una revisione successiva resta una limitazione della ricerca.

La variante usa soltanto tiri localizzati senza rigori e autogol, in sei zone. Gli xG individuali restano N/D. Le conversioni storiche per zona sono frequenze gol/tiri, non xG. Si regrediscono quote dei tiri e conversioni verso il campione di lega con 20 tiri equivalenti. L'incrocio attacco/difesa produce una distribuzione proporzionale a quota-attacco × quota-concessioni / quota-lega; il rapporto tra conversione attesa di questo incrocio e quella della sola distribuzione offensiva dà il segnale logaritmico, limitato a ±log(1,25). Questo isola la forma territoriale dal semplice numero dei tiri.

Due modelli sperimentali moltiplicano lambda per exp(alpha + beta × segnale). Il controllo di calibrazione ha beta=0; la variante stima beta insieme ad alpha. Stima Poisson con offset lambda originario, ridge 1 per entrambi i coefficienti, alpha limitato a ±0,25 e beta a ±1. Parametri e soglie sono una policy sperimentale fissa, senza ricerca di configurazioni sul test.

Sviluppo MD6–7 (16 gare), coefficienti poi congelati; test MD8–9 (18 gare). La seconda analisi rolling aggiorna i coefficienti soltanto con gare di giornate precedenti e concluse prima del cutoff di ciascuna previsione.

La log loss dei gol è la log loss congiunta Poisson senza troncamento; la MAE è media per squadra. I mercati 1X2, Over 2,5 e Goal usano per tutti i modelli la stessa funzione scoreMatrix 0–7 già usata dal motore. Le medie lambda archiviate sono arrotondate: una piccola differenza dalle probabilità percentuali pubblicate è possibile. L'effetto aggiuntivo delle zone va confrontato soprattutto con il controllo di calibrazione, oltre che con il modello originario.

## Test a coefficienti congelati

Valori inferiori indicano errori minori. Tutti i modelli sono valutati sulle stesse fixture.

| Modello | Gare | Log loss gol | Log loss 1X2 | Log loss Over 2,5 | Log loss Goal | MAE gol/squadra |
|---|---:|---:|---:|---:|---:|---:|
| baseline | 18 | 3.523382 | 0.830046 | 0.686350 | 0.678540 | 1.156111 |
| calibration | 18 | 3.398695 | 0.810420 | 0.717190 | 0.689738 | 1.131263 |
| spatial | 18 | 3.401116 | 0.809401 | 0.729538 | 0.698654 | 1.134905 |

Delta della variante rispetto al modello originario: {"goalLogLoss":-0.12226582126929397,"outcomeLogLoss":-0.02064473399665201,"over25LogLoss":0.043187814896990195,"bttsLogLoss":0.02011359131972068}.

Delta rispetto alla sola calibrazione: {"goalLogLoss":0.0024212268945396076,"outcomeLogLoss":-0.0010184377332038697,"over25LogLoss":0.012348297202328995,"bttsLogLoss":0.008915913208987214}. Un delta negativo indica un miglioramento.

Coefficienti congelati: calibrazione alpha=0.221386; variante alpha=0.225121, beta=-0.469114.

## Incertezza ed esito

L'intervallo bootstrap per giornata è N/D: disponibili 2 giornate, contro almeno 6 richieste dalla policy sperimentale. L'intervallo esplorativo per singola partita del delta log loss gol rispetto alla calibrazione è [-0.016819830775932187,0.02092497540493003]; non controlla la dipendenza tra gare della stessa squadra e non basta per promuovere la variante.

Esito: RESEARCH_ONLY. I risultati di questo campione non certificano un miglioramento operativo. Nessun cambio automatico dei pesi o delle selezioni.

## Riproduzione ed evidenze

Eseguire node scripts/research/spatial-backtest/run.cjs e node scripts/test-spatial-backtest.cjs. Gli input sono letti senza rigenerarli. protocol.json registra la policy, results.json conserva feature, fixture storiche, baseline selezionate/scartate, training, previsioni, esiti e metriche; input-hashes.json registra gli SHA-256. production-integrity.json controlla che codice pubblico, CSS, pagine, proiezioni, snapshot e archivi operativi non cambino durante il runner.

I dati territoriali conservano le esclusioni documentate nel report reading-spatial-matchup-2026-10-29.md. Le partite bersaglio non sono selezionate in base al risultato o alla disponibilità delle proprie coordinate. Il campione richiede almeno cinque gare storiche territoriali valide per entrambe le squadre. Gli esiti del test non sono stati usati per scegliere segnali, ridge, limiti o soglie. È uno studio retrospettivo, non una preregistrazione né una prova prospettica.

## Campione ed effetto aggiuntivo delle zone

88 gare concluse esaminate: 50 senza una baseline prepartita ammissibile e quattro con storia territoriale insufficiente. Le 34 gare eleggibili comprendono sei baseline MD6 firmate e 28 archivi con timestamp; nessuna delle 18 baseline del test MD8–9 è uno snapshot immutabile firmato. Esclusioni effettive: {"NO_VERIFIED_PREMATCH_BASELINE":50,"INSUFFICIENT_PRIOR_MATCHES":4}.

Il test congelato dà log loss gol 3.523382 per la baseline, 3.398695 per la sola calibrazione e 3.401116 con le zone. La variante territoriale peggiora leggermente rispetto al controllo privo di coordinate: il miglioramento rispetto alla baseline non dimostra un valore aggiunto delle zone. La log loss di Over 2,5 e Goal peggiora anche rispetto alla baseline originaria. I favoriti 1X2 non cambiano: 13 esiti corretti su 18 per tutti i modelli.

Aggiornando cronologicamente il fit, il risultato resta analogo:

| Modello rolling | Gare | Log loss gol | Log loss 1X2 | Log loss Over 2,5 | Log loss Goal |
|---|---:|---:|---:|---:|---:|
| baseline | 18 | 3.523382 | 0.830046 | 0.686350 | 0.678540 |
| calibration | 18 | 3.402830 | 0.810863 | 0.716121 | 0.689790 |
| spatial | 18 | 3.405063 | 0.809958 | 0.728006 | 0.698495 |

La stima beta ha segno negativo nel campione di sviluppo: non conferma l'interpretazione intuitiva di una maggiore conversione dell'incrocio territoriale. Con 16 gare di sviluppo e due giornate di test il segno non è una conclusione generalizzabile. Questo pilota valuta una specifica rappresentazione delle zone e una specifica policy fissa; non prova che ogni possibile uso delle coordinate sia inefficace.

Test eseguiti: riproducibilità integrale; cutoff e classi delle baseline; verifica e alterazione degli hash; contaminazione deliberata dei risultati e delle coordinate della giornata bersaglio; separazione training/test; annidamento del controllo a segnale zero; conservazione degli archivi operativi.
