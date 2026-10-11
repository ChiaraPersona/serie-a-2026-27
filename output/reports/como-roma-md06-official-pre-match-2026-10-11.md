# Como–Roma — analisi prepartita con formazioni ufficiali

**Serie A 2026/27, giornata 6 — 11 ottobre 2026, ore 12:30**  
**Cut-off informativo:** prima del calcio d’inizio.  
**Motore:** Prediction Engine Serie A V2 4.13.0; Player Market V2.  
**Tipo di elaborazione:** report isolato. Nessun dato, pronostico, schedina o file di produzione è stato sostituito.

## 1. Formazioni ufficiali utilizzate

**Como, 4-2-3-1 — Cesc Fàbregas**  
Butez; Yan Couto, Trevoh Chalobah, Jacobo Ramón, Kaiki; Máximo Perrone, Lucas Da Cunha; Assane Diao, Nico Paz, Maxence Caqueret; Anastasios Douvikas.

Interpretazione posizionale usata: Couto terzino destro; Chalobah–Ramón coppia centrale; Kaiki terzino sinistro; Perrone–Da Cunha doppio mediano; Diao ala destra; Paz trequartista centrale; Caqueret ala/trequartista sinistro; Douvikas centravanti.

**Roma, 3-4-1-2 — Gian Piero Gasperini**  
Gollini; Gianluca Mancini, Evan Ndicka, Mario Hermoso; Nahuel Molina, Manu Koné, Marten de Roon, Wesley; Lorenzo Pellegrini; Paulo Dybala, Donyell Malen.

Interpretazione posizionale usata: Mancini–Ndicka–Hermoso linea a tre; Molina e Wesley quinti; Koné–De Roon coppia centrale; Pellegrini tra le linee; Dybala seconda punta/libero di abbassarsi; Malen riferimento più avanzato.

I 22 nomi sono stati risolti nel repository; il Player Market V2 modella i 20 giocatori di movimento. I portieri sono esclusi dai mercati tiri del modello.

## 2. Previsione collettiva

| Voce | Como | Roma |
|---|---:|---:|
| Tiri attesi | **16,30** | **12,14** |
| Intervallo tiri p20–p80 | 11,7–20,3 | 7,62–16,25 |
| Tiri in porta attesi | **5,50** | **4,60** |
| Intervallo SOT p20–p80 | 3,0–8,1 | 1,1–7,6 |
| xG attesi | **1,61** | **1,22** |
| Corner attesi | 5,4 | 4,6 |
| Canali di produzione | sinistra 13,9% · centro 72,2% · destra 13,9% | sinistra 23,2% · centro 22,7% · destra 54,1% |

**Esito finale:** Como 46,4% · pareggio 24,6% · Roma 29,0%. La quota equa puramente modellistica è 2,15–4,07–3,45. Il modello vede quindi il Como favorito, ma non con un margine da esito “solido”.

**Volume partita:** 28,4 tiri e 10,1 SOT complessivi; intervalli indipendenti p20–p80 rispettivamente 22–35 e 7–14. La fascia gol dominante resta 2–3 reti, ma non raggiunge la maggioranza assoluta.

**Possesso e territorio:** non è disponibile una previsione percentuale calibrata del possesso della singola partita. I valori 61,6% Como e 56,2% Roma presenti negli input sono profili storici separati, non quote di possesso sommabili e non vengono presentati come previsione. Il proxy territoriale è più favorevole al Como (0,868 contro 0,496), ma resta una feature interna di matchup.

### Lettura tattica

- Il Como concentra il 72,2% del volume previsto nel canale centrale. Paz e Douvikas sono i terminali principali; la presenza di Caqueret a sinistra non sposta il baricentro del modello verso l’ampiezza.
- La Roma sviluppa soprattutto a destra (54,1%), quindi la catena Mancini–Molina e le ricezioni di Dybala/Malen sul centro-destra sono la via più plausibile. Il lato Kaiki–Caqueret è il punto da proteggere per il Como.
- Il Como concede storicamente poco volume interno nel campione di sede (input 7,32 tiri avversari), ma il segnale corrente di vulnerabilità sui tiri è attivo e produce solo una correzione marginale alla Roma (+0,31%): è un campanello, non un cambio di scenario.
- La Roma ha concesso 11,4 tiri a gara nel campione di sede usato dal matchup; il vantaggio del Como è soprattutto nel corridoio centrale. La correzione avversaria negativa sul Como è registrata come segnale non pienamente attivo, quindi non va sovrainterpretata.
- L’undici ufficiale assegna gran parte del volume del Como a Paz, Douvikas e Diao; per la Roma la coppia Malen–Dybala assorbe oltre metà dei tiri di squadra.

## 3. Tiri e tiri in porta individuali

Le percentuali sono probabilità del singolo calciatore condizionate alla titolarità ufficiale e ai minuti attesi. “Aff.” indica stabilità tiri/SOT; `N/D` significa che il Player Market V2 non produce quel dato.

### Como

| Giocatore | Ruolo effettivo | Min | xTiri | xSOT | 1+ | 2+ | 3+ | 4+ | 1+ SOT | 2+ SOT | Aff. |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Jean Butez | Portiere | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | escluso dal modello tiri |
| Yan Couto | Terzino destro | 81,3 | 0,95 | 0,40 | 61,3% | 24,6% | 7,1% | 1,6% | 33,0% | 6,2% | media/media |
| Trevoh Chalobah | Centrale destro | 79,7 | 0,62 | 0,22 | 46,2% | 12,8% | 2,5% | 0,4% | 19,8% | 2,1% | alta/media |
| Jacobo Ramón | Centrale sinistro | 89,3 | 1,17 | 0,35 | 69,0% | 32,6% | 11,4% | 3,1% | 29,5% | 4,9% | media/media |
| Kaiki | Terzino sinistro | 55,1 | 0,97 | 0,29 | 62,1% | 25,3% | 7,5% | 1,7% | 25,2% | 3,5% | bassa/bassa |
| Máximo Perrone | Mediano | 65,9 | 0,76 | 0,21 | 53,2% | 17,7% | 4,2% | 0,8% | 18,9% | 1,9% | bassa/bassa |
| Lucas Da Cunha | Mediano sinistro | 69,4 | 1,38 | 0,34 | 74,8% | 40,1% | 16,2% | 5,1% | 28,8% | 4,6% | media/bassa |
| Assane Diao | Ala destra | 70,7 | 2,19 | 0,72 | 88,8% | 64,3% | 37,5% | 17,9% | 51,3% | 16,3% | alta/alta |
| Nico Paz | Trequartista | 83,1 | 4,89 | 1,48 | 99,2% | 95,6% | 86,6% | 71,9% | 77,2% | 43,6% | media/media |
| Maxence Caqueret | Ala/trequartista sinistro | 45,7 | 0,61 | 0,15 | 45,7% | 12,5% | 2,4% | 0,4% | 13,9% | 1,0% | bassa/bassa |
| Anastasios Douvikas | Centravanti | 69,6 | 2,76 | 1,34 | 93,7% | 76,2% | 52,1% | 29,9% | 73,8% | 38,7% | media/media |

### Roma

| Giocatore | Ruolo effettivo | Min | xTiri | xSOT | 1+ | 2+ | 3+ | 4+ | 1+ SOT | 2+ SOT | Aff. |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Pierluigi Gollini | Portiere | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | escluso dal modello tiri |
| Gianluca Mancini | Braccetto destro | 79,4 | 0,69 | 0,29 | 49,8% | 15,2% | 3,3% | 0,5% | 25,2% | 3,5% | media/media |
| Evan Ndicka | Centrale | 60,0 | 0,55 | 0,13 | 42,3% | 10,6% | 1,8% | 0,2% | 12,2% | 0,8% | alta/bassa |
| Mario Hermoso | Braccetto sinistro | 82,8 | 0,68 | 0,24 | 49,3% | 14,9% | 3,2% | 0,5% | 21,3% | 2,5% | media/alta |
| Nahuel Molina | Quinto destro | 60,7 | 0,69 | 0,21 | 49,8% | 15,2% | 3,3% | 0,5% | 18,9% | 1,9% | media/media |
| Manu Koné | Centrale sinistro | 71,6 | 0,91 | 0,31 | 59,8% | 23,1% | 6,4% | 1,4% | 26,7% | 3,9% | bassa/bassa |
| Marten de Roon | Centrale destro | 44,1 | 0,37 | 0,11 | 30,9% | 5,4% | 0,6% | 0,1% | 10,4% | 0,6% | bassa/bassa |
| Wesley | Quinto sinistro | 74,9 | 0,72 | 0,29 | 51,3% | 16,3% | 3,7% | 0,6% | 25,2% | 3,5% | alta/bassa |
| Lorenzo Pellegrini | Trequartista | 71,6 | 1,37 | 0,50 | 74,6% | 39,8% | 15,9% | 5,0% | 39,4% | 9,0% | bassa/bassa* |
| Paulo Dybala | Seconda punta | 80,1 | 2,85 | 0,99 | 94,2% | 77,7% | 54,2% | 31,9% | 62,8% | 26,1% | media/media |
| Donyell Malen | Punta | 70,9 | 3,30 | 1,54 | 96,3% | 84,1% | 64,1% | 42,0% | 78,6% | 45,6% | alta/media |

\* Per Pellegrini il livello tecnico serializzato è `unknown/unknown`: nel report è prudenzialmente trattato come affidabilità bassa, perché manca il campione corrente nel profilo usato dal motore.

### Riconciliazione

- Como: somma giocatori **16,30 tiri e 5,50 SOT**, identica ai target squadra.
- Roma: somma giocatori **12,13 tiri e 4,61 SOT**, scarto di arrotondamento di 0,01 rispetto a 12,14 e 4,60.

## 4. Matchup individuali decisivi

1. **Paz tra le linee contro il centro della difesa Roma.** È il fulcro: 4,89 tiri, 1,48 SOT, 95,6% di 2+ tiri. Il dato beneficia del canale centrale dominante del Como, ma l’ampiezza dell’intervallo squadra impedisce di trattare le soglie più alte come certe.
2. **Douvikas contro Ndicka e i due braccetti.** Il centravanti ha 2,76 tiri e 1,34 SOT attesi. Il rischio maggiore non è il volume per minuto, ma l’uscita prevista intorno al 70°.
3. **Diao contro il lato Hermoso–Wesley.** Il canale destro pesa solo 13,9% nel totale Como, ma il profilo individuale è stabile: 64,3% per 2+ tiri.
4. **Malen e Dybala contro il blocco centrale Como.** La Roma ha meno volume complessivo, ma concentra 6,15 tiri e 2,53 SOT sui due attaccanti. Malen è più verticale; Dybala conserva più minuti e libertà tra le linee.
5. **Catena destra Roma contro Kaiki–Caqueret.** Il 54,1% del volume giallorosso passa da destra. Molina non ha però un volume individuale elevato; il vantaggio territoriale dovrebbe tradursi soprattutto in servizio verso Dybala/Malen, non necessariamente in tiri del quinto.
6. **Ramón sulle palle inattive.** Il suo 69,0% di 1+ tiro è la miglior traccia tra i difensori, ma senza una quota singola compatibile resta un outsider analitico.

## 5. Principali possibili subentranti

Non viene prodotta una tabella numerica dei subentranti: nell’input ufficiale fornito non sono incluse le panchine e il motore non identifica per questo match sostituti probabili (`likelyReplacement: null`). Usare le vecchie probabili formazioni o assegnare minuti da titolare sarebbe contrario al vincolo di non inventare dati. I mercati Sisal “giocatore + eventuale sostituto” sono quindi trattati solo secondo il loro contratto bookmaker, senza costruire una probabilità DUO artificiale.

## 6. Quote disponibili e valore

Le quote sono quelle degli snapshot Sisal nel repository, acquisiti prima del calcio d’inizio; non sono una verifica live. I mercati esito/gol sono ricalcolati dall’esecuzione isolata con XI ufficiale. I mercati discreti tiri/SOT/corner provengono invece dal modello statistico validato e congelato: sono compatibili col match, ma non sono stati rifittati sulla formazione ufficiale.

| Mercato | P modello | Quota | Quota equa | EV centrale | EV prudente | Affidabilità/lettura |
|---|---:|---:|---:|---:|---:|---|
| Como vincente | 46,4% | 2,50 | 2,15 | +16,1% | −0,5% | media, fragile |
| 1X | 71,0% | 1,48 | 1,41 | +5,1% | −3,7% | media, probabile ma non robusto |
| 12 | 75,4% | 1,30 | 1,33 | −2,0% | −4,1% | media, alta probabilità senza valore |
| Over 1,5 gol | 77,4% | 1,18 | 1,29 | −8,7% | −14,8% | media, senza valore |
| Under 3,5 gol | 68,5% | 1,42 | 1,46 | −2,7% | −11,6% | media, senza valore |
| Roma non segna | 29,5% | 3,80 | 3,39 | +12,2% | −0,7% | media, fragile |
| Como più tiri | 64,85% | 1,50 | 1,54 | −2,72% | −7,90% | media, modello discreto validato |
| Como più SOT | 57,12% | 1,72 | 1,75 | −1,75% | −5,70% | media, modello discreto validato |
| Como Over 5,5 corner | 40,94% | 2,60 | 2,44 | +6,44% | +1,24% | media, PASS holdout |
| Como Over 6,5 corner | 29,89% | 3,60 | 3,35 | +7,60% | +0,40% | media, PASS holdout |
| Como Over 7,5 corner | 21,07% | 5,50 | 4,75 | +15,88% | +4,88% | media, PASS holdout; alta varianza |
| Multigoal partita 1–4 | 78,5% | 1,22 | 1,33 | −8,1% | N/D | bassa, gruppo B2 |

Il gate canonico non produce **nessuna raccomandazione primaria o secondaria**: gli apparenti edge su Como vincente, 1X e Roma non segna diventano negativi o quasi nulli con la probabilità prudente. I corner Como sono gli unici esempi qui riportati con EV prudente positivo, ma la quota potrebbe non essere più disponibile.

### Mercati giocatore Sisal DUO

| Contratto bookmaker | Quota | Riferimento individuale con XI ufficiale | Quota equa DUO | EV DUO |
|---|---:|---:|---:|---:|
| Nico Paz + sostituto 3+ tiri | 1,20 | Paz 86,6% | N/D | N/D |
| Malen + sostituto 3+ tiri | 1,16 | Malen 64,1% | N/D | N/D |
| Diao + sostituto 2+ tiri | 1,47 | Diao 64,3% | N/D | N/D |
| Dybala + sostituto 3+ tiri | 1,57 | Dybala 54,2% | N/D | N/D |
| Douvikas + sostituto 3+ tiri | 1,65 | Douvikas 52,1% | N/D | N/D |
| Dybala + sostituto 1+ SOT, pali/traverse inclusi | 1,47 | Dybala 62,8% | N/D | N/D |
| Diao + sostituto 1+ SOT, pali/traverse inclusi | 1,65 | Diao 51,3% | N/D | N/D |
| Malen + sostituto 2+ SOT, pali/traverse inclusi | 1,75 | Malen 45,6% | N/D | N/D |
| Nico Paz + sostituto 2+ SOT, pali/traverse inclusi | 2,00 | Paz 43,6% | N/D | N/D |
| Douvikas + sostituto 2+ SOT, pali/traverse inclusi | 2,40 | Douvikas 38,7% | N/D | N/D |

Le percentuali della terza colonna sono riferimenti sul solo titolare e **non** sono applicate al contratto DUO. Per i mercati SOT, inoltre, Sisal include pali e traverse mentre il target individuale V2 è il tiro nello specchio: ciò impedisce quota equa ed EV comparabili.

## 7. Pronostici solidi

Ordinati per probabilità del singolo evento; “solido” descrive la probabilità, non la convenienza della quota.

1. **Nico Paz 2+ tiri — 95,6%, quota equa individuale 1,05.** Volume centrale molto alto e 83,1 minuti attesi. Non è presente una quota singola compatibile; il DUO disponibile è su 3+.
2. **Assane Diao 1+ tiro — 88,8%, quota equa 1,13.** Profilo tiri/SOT con stabilità alta; nessuna quota singola compatibile nello snapshot.
3. **Donyell Malen 2+ tiri — 84,1%, quota equa 1,19.** È il terminale principale della Roma. La quota 1,16 disponibile riguarda il DUO 3+, non questo evento.
4. **Donyell Malen 1+ SOT — 78,6%, quota equa 1,27.** Buona probabilità, ma stabilità SOT solo media e assenza di mercato singolo equivalente.
5. **Douvikas 1+ SOT — 73,8%, quota equa 1,36.** Matchup centrale favorevole; rischio minutaggio medio.

## 8. Pronostici intermedi e outsider

### Intermedi

1. **Paulo Dybala 2+ tiri — 77,7%, quota equa 1,29.** Buona continuità di minuti e ruolo libero; il volume squadra Roma è però inferiore a quello del Como.
2. **Douvikas 2+ tiri — 76,2%, quota equa 1,31.** Profilo favorevole, con rischio di sostituzione attorno al 70°.
3. **1X — 71,0%, quota 1,48, equa 1,41.** EV centrale +5,1% ma prudente −3,7%: leggibile, non qualificato dal gate.
4. **Como Over 5,5 corner — 40,94%, quota 2,60, equa 2,44.** È il miglior compromesso fra soglia e EV prudente positivo (+1,24%) nel modello corner; disponibilità attuale non verificata.

### Outsider

1. **Nico Paz 4+ tiri — 71,9%, quota equa individuale 1,39.** La probabilità è alta, ma la soglia è volatile e non esiste una quota singola compatibile nel catalogo.
2. **Jacobo Ramón 1+ tiro — 69,0%, quota equa 1,45.** Miglior outsider difensivo, soprattutto su piazzato; nessuna quota disponibile nel repository.
3. **Yan Couto 1+ tiro — 61,3%, quota equa 1,63.** Matchup di fascia e minuti buoni; volume atteso sotto un tiro e quindi varianza elevata.
4. **Como Over 7,5 corner — 21,07%, quota 5,50, equa 4,75.** EV centrale +15,88% e prudente +4,88%; resta un evento raro e ad alta varianza.
5. **Roma non segna — 29,5%, quota 3,80, equa 3,39.** Edge centrale interessante, ma EV prudente −0,7%: outsider fragile, non selezione robusta.

**Cartellini:** nessun pronostico consigliato. Il motore espone solo intervalli squadra (Como 1–3, centrale 2,1; Roma 0–3, centrale 1,7), mentre la diagnostica del match non considera completa l’evidenza arbitrale e `likelyBooked` è euristico, non una probabilità calibrata.

## 9. Controlli di qualità, limiti e affidabilità

- **Titolari:** 22/22 risolti; 20/20 giocatori di movimento modellati. I portieri restano `N/D` per i mercati tiri.
- **Minuti:** ogni giocatore di movimento è condizionato alla titolarità ufficiale; nessun panchinaro riceve minuti da titolare. Le stime insolitamente basse di Caqueret, De Roon e Kaiki riflettono il prior del motore e aumentano l’incertezza.
- **Riconciliazione:** totali giocatore/squadra coerenti entro 0,01 per arrotondamento.
- **Soglie:** 1+ ≥ 2+ ≥ 3+ ≥ 4+ e 1+ SOT ≥ 2+ SOT per tutti i calciatori.
- **Ruoli:** matchup interpretati con il 4-2-3-1 e il 3-4-1-2 ufficiali; le etichette editoriali hanno corretto i ruoli generici del dataset senza alterare le formule.
- **Cut-off:** target match escluso dagli input; solo gare completate precedenti alla giornata 6. Le quote citate provengono dagli snapshot del 9–10 ottobre, precedenti al calcio d’inizio.
- **Dati mancanti:** forma ufficiale completa 2026/27, indisponibili verificati, panchine ufficiali e meteo affidabile. La diagnostica del modello dichiara incompleta anche la componente arbitrale.
- **Affidabilità complessiva:** **59/100, moderata**; completezza dati 64%. Le proiezioni individuali di volume sono più utili come graduatoria relativa che come promessa puntuale.
- **Decisione economica:** alta probabilità e valore non sono sinonimi. Nessun mercato esito/gol supera il gate prudente; i DUO restano senza probabilità, quota equa ed EV; i corner positivi richiedono verifica live della quota prima di qualunque uso.

### Verdetto sintetico

Scenario centrale: Como con più volume e lieve vantaggio di esito, Roma pericolosa soprattutto sul proprio lato destro e attraverso Malen–Dybala. I profili individuali più forti sono Paz, Malen, Douvikas e Diao. Sul piano delle quote, non emerge una giocata pienamente robusta: il solo gruppo con valore prudente positivo è quello dei corner Como, ma con disponibilità non verificata e varianza crescente sulle soglie alte.
