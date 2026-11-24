# Galatasaray–Aston Villa: candidati ammoniti sui titolari ufficiali

Il generatore delle ipotesi ammoniti consultava soltanto gli undici storici e la Lettura non caricava il relativo dataset in presenza degli undici della gara. Ora il generatore dà precedenza ai due undici ufficiali della fixture, con join esatti per ID canonico e controllo della data di acquisizione. Il renderer carica il ranking ufficiale anche in presenza delle proiezioni individuali. Nessun cambiamento al motore, ai pesi o alle approvazioni.

Ricalcolata soltanto `ucl-2026-27-md05-02`, tramite build sito con `--booking-fixtures ucl-2026-27-md05-02`. I 17 ranking estranei sono identici a HEAD. João Gomes 65, Mario Lemina 59, Davinson Sánchez 58, John McGinn 53 e Boubacar Kamara 52: indici comparativi su 100, non probabilità. Cash e Sallai non entrano nel nuovo ranking.

Daniel Siebert risulta designato. Il profilo arbitrale MD5 è esplicitamente non utilizzabile per previsione: non viene promosso nel modello. Fattore arbitrale neutro, indicato come tale nel pannello; nessuna dicitura «arbitro da designare» o titolarità da riconfermare per la gara ufficiale. Probabilità calibrate e primo ammonito restano null; nessuna selezione operativa aggiunta.

Verifiche: test `test-champions-booking-hypotheses.cjs` prima rosso e poi verde per gli undici ufficiali, cutoff e non mutazione degli input; suite MD5 e schedina personale superate; browser mirato `check-champions-booking-hypotheses.cjs --edge --fixture ucl-2026-27-md05-02` a 1440 e 390 px, cinque nomi, testo ufficiale, arbitro, colori e assenza di overflow/errori. Confronto integrale: dataset individuali MD5 e catalogo operativo identici a HEAD. Evidenze in `output/champions-booking-hypotheses/`.
