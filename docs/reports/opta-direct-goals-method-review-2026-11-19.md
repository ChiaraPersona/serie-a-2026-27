# Revisione metodologica: prova Opta → gol diretti

Revisione del 19 novembre 2026. Ambito: prova isolata richiesta dall'utente,
senza modifica alle Letture operative, selezioni, quote o pesi dei motori esistenti.
Questo documento valuta il disegno sperimentale; non certifica accuratezza o
approvazione statistica di un modello nuovo.

## Esito della revisione prima del fitting

Il candidato a tre parametri è una prima prova ragionevole e riproducibile:

```
g = (rating_casa - rating_trasferta) / 10
log(lambda_casa) = mu + vantaggio_casa/2 + beta*g
log(lambda_trasferta) = mu - vantaggio_casa/2 - beta*g
beta >= 0
```

Le due intensità derivano direttamente dal rating e possono generare una
distribuzione congiunta dei punteggi. Non si devono aggiungere bonus campionato,
scegliere i parametri per ottenere più gol del Barcellona, né modificare la prova
dopo aver osservato il risultato del test. La calibrazione 1X2 già presente
usa un'altra famiglia di probabilità e non determina da sola il livello dei gol.
Fonti del comportamento attuale: [adapter Opta](../../scripts/champions/opta-result-policy.cjs)
e [documentazione della Lettura operativa](../champions-opta-reading.md).

Il candidato impone un vincolo forte, da dichiarare: il prodotto
`lambda_casa * lambda_trasferta = exp(2*mu)` è costante. Il divario di forza
sposta i gol in modo simmetrico sul logaritmo, mentre il totale atteso cresce
come `2*exp(mu)*cosh(vantaggio_casa/2 + beta*g)`. Non distingue attacco e difesa
di due club con lo stesso rating. Queste sono conseguenze algebriche della
formula proposta, non fatti misurati sul calcio.

L'indipendenza Poisson comporta anche varianza uguale alla media per ciascun
lato e un tasso di pareggio vincolato alle due intensità. Overdispersione,
correlazione e anomalia dei punteggi bassi possono essere diagnosticate, ma
l'aggiunta di nuove correzioni richiederebbe un protocollo successivo; non una
scelta opportunistica sul medesimo test.

## Campione verificato e cutoff

Il dataset disponibile contiene **136 gare** dal 22 febbraio 2024 al 21 gennaio
2026. I rating storici appartengono a una raccolta indipendente, con lag ammesso
di 2–7 giorni prima della partita; il fuso dei timestamp non è documentato e la
pubblicazione del provider non è certificata. Il codice seleziona il primo
timestamp della data e un risultato di regolamento `score90` intero non negativo.
Fonti primarie interne: [dataset delle coppie](../../data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz),
[builder del join](../../scripts/research/prepare-opta-historical-pairs.py),
[copertura](../../data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-pair-coverage.json)
e [audit dell'archivio](../../data/analysis/champions/opta-historical-feasibility-2026-11-18/archive-content-audit.json).

Conteggi controllati leggendo il dataset con un parser, senza riscriverlo:

| Split | Periodo | Gare | Intervallo del divario rating casa−trasferta | Gare con divario assoluto ≥10 |
|---|---|---:|---:|---:|
| Addestramento | Prima del 1 gennaio 2025 | 57 | −19,6 … +15,6 | 6 |
| Validazione | 1 gennaio–30 giugno 2025 | 42 | −9,6 … +14,2 | 1 |
| Test | Dal 1 luglio 2025; gare effettive 17 settembre 2025–21 gennaio 2026 | 37 | −15,4 … +9,5 | 5 |

Lo split coincide con il [protocollo della calibrazione 1X2](../../data/analysis/champions/opta-calibration-2026-11-18/protocol.json).
Lo storico comprende Champions, Europa League e Conference League; non è un
campione casuale di tutti gli incontri europei. L'audit ha selezionato le
identità di 35 partecipanti della coorte corrente ed escluso molte partite per
club non mappati o rating mancanti. La performance sulla coorte non prova la
trasferibilità a tutti i club o a tutte le coppe.

## Scelta e confronti ammessi

Prima del fit devono essere fissati formula, vincolo `beta>=0`, valori di
regolarizzazione `[0.1, 1, 10]`, trattamento degli intercetti e metrica di
selezione. Se l'obiettivo è `somma NLL + lambda*||theta||²/2`, la L2 su tutti i
parametri regolarizza anche `mu` verso 0 (un gol per lato a campo neutro) e il
vantaggio casa verso 0. Usare una maschera diversa è possibile, ma va dichiarato
prima della selezione; non è equivalente. Il codice esistente della
[calibrazione 1X2](../../scripts/research/calibrate-opta-1x2.py) esplicita il
precedente uso di somma della NLL e penalità su tutti i parametri.

La regolarizzazione va scelta sulle 42 gare di validazione mediante NLL
congiunta dei punteggi, poi rifittata una sola volta sulle 99 gare precedenti al
1 luglio 2025. Le 37 gare successive non devono influire su fitting, scelta
della regolarizzazione o scelta della formula. Il contributo `log(y!)` deve
essere incluso nella NLL riportata, rendendo confrontabili i punteggi assoluti.

Sono confronti riproducibili:

- Per gol e punteggi: il candidato contro due tassi Poisson costanti casa/trasferta,
  stimati soltanto sulle 99 gare precedenti al test. Riportare NLL congiunta,
  MAE dei gol e bias; il miglioramento su questo riferimento semplice non
  dimostra un vantaggio sul motore operativo.
- Per 1X2: probabilità derivate dalla Poisson candidata contro la calibrazione
  Opta **base** congelata, sulle stesse 37 gare. Riportare log loss, Brier e
  accuratezza, oltre alla frequenza stimata dei pareggi. Le
  [previsioni 1X2 archiviate](../../data/analysis/champions/opta-calibration-2026-11-18/results.json)
  non contengono la correzione xGOT della Lettura operativa: non chiamare questo
  riferimento «intera Lettura corrente».

Non è giustificato dichiarare un backtest del modello gol operativo corrente
senza ricostruire i suoi input effettivamente disponibili prima di ogni gara.
Il fatto che il codice attuale possa essere eseguito oggi sul passato non prova
che le sue fonti fossero disponibili allora.

Per l'incertezza, le differenze vanno calcolate sulle stesse gare e ricampionate
per data, conservando insieme le gare dello stesso giorno. Un intervallo con
37 gare e pochi cluster resta descrittivo. Il test era già stato osservato
nella ricerca 1X2 del 18 novembre: è uno split temporale per questa formula
nuova, ma non una nuova evidenza completamente vergine dell'intero processo di
ricerca. Non basare una promozione automatica sul suo solo esito.

Il calcolo delle probabilità 1X2 richiede supporto adattivo o controllo esplicito
della massa di coda. Una griglia 0–7 rinormalizzata può troncare le code e
alterare probabilità e momenti quando una media aumenta. Le intensità complete
restano le medie Poisson: non sostituirle con medie di una matrice troncata
senza quantificarne l'errore.

## Applicazione illustrativa a Sabah–Barcellona

L'identità **corrente** del Sabah FK azero è risolta nella
[fonte operativa Opta](../../data/sources/champions-opta-club-ratings-2026-27.json),
ma lo storico di fitting resta privo del Sabah. Sono due condizioni diverse:
il recupero di un'identità corrente non crea retroattivamente uno storico
prepartita verificato.

I rating correnti 83,2843602567 e 97,5947952844 danno un divario casa−trasferta
di −14,3104350277 punti. È entro il range dell'addestramento, quindi non va
descritto come extrapolazione numerica fuori intervallo. Tuttavia solo **7 delle
99 gare di train+validazione** hanno divario assoluto almeno 10: la coda è poco
coperta e il Sabah è un club non osservato nel fit. Inoltre il test finisce a
gennaio 2026, mentre il caso illustrativo usa uno snapshot di novembre 2026.
Una nuova stima elevata del Barcellona sarebbe un output esplorativo, non una
conferma di maggiore precisione.

Gol attesi e 1X2 del candidato devono provenire dalla stessa distribuzione
Poisson. Non presentare gol diretti nuovi accanto alle probabilità 1X2
operative invariate come se fossero un modello congiunto coerente. Questi sono
gol **previsti dal modello**, non xG o xGOT osservati attribuiti a un provider.

## Condizione per interpretare il risultato

La prova può rispondere a «quale quantità di gol suggerisce una relazione
semplice appresa tra rating e risultati?» e mostrare se il legame produce un
confronto più plausibile. Non può, da sola, autorizzare una promozione in
produzione o dimostrare un aumento di precisione dell'intera Lettura, dei tiri,
dei corner, dei cartellini, dei contratti DUO o del rendimento economico.

## Verifica conclusiva del risultato

Il [protocollo della prova](../../data/analysis/champions/opta-direct-goals-2026-11-19/protocol.json)
recepisce i punti precedenti: L2 su tutti i tre parametri, scelta solo sulla
validazione, refit sulle 99 gare precedenti, NLL completa, bootstrap appaiato per
data e assenza di promozione operativa. Ho controllato il
[codice Python](../../scripts/research/calibrate-opta-goals.py) e ricalcolato
indipendentemente in Node, leggendo il dataset storico originale e i parametri
congelati, le intensità delle 37 gare, le probabilità con supporto 0–79 per lato,
le NLL, i MAE, la scelta sulla validazione e il gradiente dell'obiettivo sulle
99 gare di refit. Le differenze dei numeri riportati sono inferiori a `1e-10`;
i componenti del gradiente penalizzato sono inferiori a `2e-15` in valore
assoluto. Non risultano errori bloccanti in formula, fitting o confronto.
Gli output verificati sono in [results.json](../../data/analysis/champions/opta-direct-goals-2026-11-19/results.json).

| Metrica sulle stesse 37 gare | Gol diretti Opta | Riferimento |
|---|---:|---:|
| NLL congiunta del punteggio | 3,097926 | 3,224881, tassi H/A costanti |
| MAE dei gol per squadra | 0,974504 | 1,072891, tassi H/A costanti |
| Log loss 1X2 | 0,914735 | 0,903041, calibrazione Opta base congelata |
| Esiti 1X2 corretti | 22/37 | 22/37, calibrazione Opta base congelata |

Gli intervalli bootstrap descrittivi riportati dal runner, su 17 date, sono
`[-0,246954; -0,009935]` per la differenza di NLL punteggio contro i tassi
costanti e `[-0,046294; +0,069325]` per la differenza di log loss 1X2 contro
la calibrazione Opta base. Il primo risultato favorisce il candidato rispetto
a quel riferimento semplice in questa coorte; il secondo non risolve una
differenza di qualità 1X2. Non trasformare queste due osservazioni in una
dimostrazione di maggiore precisione del motore operativo completo.

Per Sabah–Barcellona il modello diretto produce **1,125975–2,388733 gol attesi**
e **65,3224%** di vittoria del Barcellona; l'operativo attuale è
**1,42–2,04** e **55,4201%**. Sono due previsioni descrittive della stessa gara
futura, non due prestazioni misurate. La prova risponde all'ipotesi iniziale
spostando più gol verso il Barcellona, ma tale spostamento da solo non ne prova
la correttezza. Il miglioramento sui tassi costanti **non prova un miglioramento
rispetto al modello gol attuale**, che non è stato sottoposto qui a un confronto
storico equo con input prepartita. Nessuna raccomandazione automatica di
attivazione discende da questa revisione.
