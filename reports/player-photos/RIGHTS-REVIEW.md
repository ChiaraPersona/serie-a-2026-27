# Recupero delle fotografie bloccate

Esaminate tutte le **167 fotografie inizialmente bloccate**. Recuperati 157 casi: 134 file esistenti verificati, 22 sostituzioni verificate (19 originali e 3 miniature ufficiali) e 1 duplicato conservato solo in archivio. Restano 10 casi bloccati.

Copertura delle rose correnti: **151/533 (28.33%)**, rispetto a 28/533 (5,25%); **+123 schede** con foto pubblicabile. 382 schede mantengono il segnaposto: 380 senza una foto locale associata e 2 con foto ancora bloccata. 45 foto storiche e un duplicato verificati restano soltanto nell’archivio tecnico.

## Cause dei blocchi

La tabella usa una causa principale esclusiva per non contare più volte lo stesso file; le cause sovrapposte per ogni file sono conservate in rights-audit.json.

| Causa principale | Iniziali | Rimanenti |
|---|---:|---:|
| File locale non collegato all’originale verificato | 142 | 0 |
| Licenza non verificata | 5 | 1 |
| Conflitti anagrafici | 4 | 1 |
| Identificativi Wikidata non confermati | 4 | 0 |
| Fotografie non associate | 10 | 8 |
| Altri problemi | 2 | 0 |

## Prove utilizzate

- Le miniature recuperate sono legate al file Commons con richieste HTTPS HEAD: ETag Swift MD5 forte, byte, percorso del file e versione temporale coincidono. SHA256 lega la verifica al file locale. Nessuna approvazione per somiglianza visiva. Evidenze: recovery/thumbnail-binding.json. Implementazione ufficiale del digest: https://doc.wikimedia.org/mediawiki-core/1.45.0/php/SwiftFileBackend_8php_source.html .
- Per le miniature divergenti è stata acquisita una copia dell’originale identificato dall’API, con SHA1 e lunghezza esatti. Per tre originali non accessibili (HTTP 429) sono state acquisite le miniature ufficiali correnti, diverse dalle copie precedenti e verificate con ETag, byte e origine. Tutti i file precedenti restano nei percorsi iniziali. Il registro recovery/replacements.json riporta hash, percorso precedente, nuovo percorso, licenza e data. Gli originali riutilizzati non vengono riscaricati.
- Identità basata su P18, P180 del file o appartenenza alla categoria esatta dichiarata da P373; collegamento al roster tramite ID Wikidata/Transfermarkt/ESPN, mai tramite nomi approssimativi. Le associazioni fotografiche aggiuntive sono in data/sources/team-pages/player-photo-associations.json.
- Licenze CC controllate individualmente. Per le dichiarazioni public-domain sono conservati revisione del file, autore, liberatoria e, per i tre file Flickr, la dichiarazione PDM sulla pagina originale e la revisione Flickr archiviata. Le attribuzioni restano accessibili nell’interfaccia esistente.

## Casi che richiedono intervento manuale

- **assets/images/players/milan/santiago-gimenez.png**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **assets/images/players/wikimedia/bologna/federico-ravaglia.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **alex-valle**: LICENSE_NOT_VERIFIED.
- **assets/images/players/wikimedia/inter/davide-frattesi.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **assets/images/players/wikimedia/juventus/lois-openda.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **pietro-terracciano**: CANONICAL_WIKIDATA_ID_NOT_CONFIRMED, BIRTH_DATE_CONFLICT.
- **assets/images/players/wikimedia/parma/adrian-benedyczak.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **assets/images/players/wikimedia/roma/angelino.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **assets/images/players/wikimedia/roma/tommaso-baldanzi.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, NO_LIVE_FILE_METADATA, LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL, LICENSE_NOT_VERIFIED, AUTHOR_NOT_VERIFIED, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.
- **assets/images/players/wikimedia/udinese/simone-pafundi.jpg**: NO_CANONICAL_ID_REFERENCE, NO_ARCHIVED_SOURCE_RECORD, FILE_NOT_LINKED_TO_VERIFIED_SUBJECT.

## Discordanze anagrafiche conservate

- goncalo-ramos: foto VERIFIED; identità fotografica confermata tramite più identificativi indipendenti. La data di nascita nel database non è stata modificata.
- luka-modric: foto VERIFIED; identità fotografica confermata tramite più identificativi indipendenti. La data di nascita nel database non è stata modificata.
- mario-gila: foto VERIFIED; identità fotografica confermata tramite più identificativi indipendenti. La data di nascita nel database non è stata modificata.
- mike-maignan: foto VERIFIED; identità fotografica confermata tramite più identificativi indipendenti. La data di nascita nel database non è stata modificata.
- pietro-terracciano: foto BLOCKED; identità fotografica non risolta. La data di nascita nel database non è stata modificata.

## Esito per ciascun caso iniziale

| File o ID | Esito | Percorso selezionato |
|---|---|---|
| assets/images/players/milan/santiago-gimenez.png | BLOCKED | assets/images/players/milan/santiago-gimenez.png |
| charles-de-ketelaere | RECOVERED | assets/images/players/wikimedia/atalanta/charles-de-ketelaere.jpg |
| davide-zappacosta | RECOVERED | assets/images/players/wikimedia/atalanta/davide-zappacosta.jpg |
| francesco-rossi | RECOVERED | assets/images/players/wikimedia/atalanta/francesco-rossi.jpg |
| gianluca-gaetano | RECOVERED | assets/images/players/wikimedia/atalanta/gianluca-gaetano.png |
| gianluca-scamacca | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/ffcb042386e794b7e3a7723dc587c1a1121e5d2b.jpg |
| isak-hien | RECOVERED | assets/images/players/wikimedia/atalanta/isak-hien.jpg |
| kamaldeen-sulemana | RECOVERED | assets/images/players/wikimedia/atalanta/kamaldeen-sulemana.jpg |
| marco-carnesecchi | RECOVERED | assets/images/players/wikimedia/atalanta/marco-carnesecchi.jpg |
| marco-sportiello | RECOVERED | assets/images/players/wikimedia/atalanta/marco-sportiello.jpg |
| marten-de-roon | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/75768f37787ac14256938ef20cd8d701adbdba7b.jpg |
| mitchel-bakker | RECOVERED | assets/images/players/wikimedia/atalanta/mitchel-bakker.jpg |
| nicola-zalewski | RECOVERED | assets/images/players/wikimedia/atalanta/nicola-zalewski.jpg |
| odilon-kossounou | RECOVERED | assets/images/players/wikimedia/atalanta/odilon-kossounou.jpg |
| raoul-bellanova | RECOVERED | assets/images/players/wikimedia/atalanta/raoul-bellanova.jpg |
| sead-kolasinac | RECOVERED | assets/images/players/wikimedia/atalanta/sead-kolasinac.jpg |
| emil-holm | RECOVERED | assets/images/players/wikimedia/bologna/emil-holm.jpg |
| federico-bernardeschi | RECOVERED | assets/images/players/wikimedia/bologna/federico-bernardeschi.jpg |
| assets/images/players/wikimedia/bologna/federico-ravaglia.jpg | BLOCKED | assets/images/players/wikimedia/bologna/federico-ravaglia.jpg |
| jens-odgaard | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/89133597189dc4e595372c888e8a31e38417daab.jpg |
| jesper-karlsson | RECOVERED | assets/images/players/wikimedia/bologna/jesper-karlsson.jpg |
| jhon-lucumi | RECOVERED | assets/images/players/wikimedia/bologna/jhon-lucumi.jpg |
| juan-miranda | RECOVERED | assets/images/players/wikimedia/bologna/juan-miranda.jpg |
| lewis-ferguson | RECOVERED | assets/images/players/wikimedia/bologna/lewis-ferguson.jpg |
| nadir-zortea | RECOVERED | assets/images/players/wikimedia/bologna/nadir-zortea.jpg |
| nikola-moro | RECOVERED | assets/images/players/wikimedia/bologna/nikola-moro.jpg |
| riccardo-orsolini | RECOVERED | assets/images/players/wikimedia/bologna/riccardo-orsolini.jpg |
| thijs-dallinga | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/187b35d6e3c463e154cee6a28a9cea309cce7b02.jpg |
| tommaso-pobega | RECOVERED | assets/images/players/wikimedia/bologna/tommaso-pobega.jpg |
| torbj-rn-heggem | RECOVERED | assets/images/players/wikimedia/bologna/torbj-rn-heggem.jpg |
| gabriele-zappa | RECOVERED | assets/images/players/wikimedia/cagliari/gabriele-zappa.jpg |
| harry-winks | RECOVERED | assets/images/players/wikimedia/cagliari/harry-winks.jpg |
| matteo-prati | RECOVERED | assets/images/players/wikimedia/cagliari/matteo-prati.jpg |
| michel-adopo | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/2d4ca32460c2e7434cd2e9352c944ecd3f76f314.png |
| raphael-kofler | RECOVERED | assets/images/players/wikimedia/cagliari/raphael-kofler.jpg |
| sebastiano-esposito | RECOVERED | assets/images/players/wikimedia/cagliari/sebastiano-esposito.jpg |
| yerry-mina | RECOVERED | assets/images/players/wikimedia/cagliari/yerry-mina.jpg |
| alex-valle | BLOCKED | assets/images/players/wikimedia/como/alex-valle.jpg |
| alvaro-morata | RECOVERED | assets/images/players/wikimedia/como/alvaro-morata.jpg |
| anastasios-douvikas | RECOVERED | assets/images/players/wikimedia/como/anastasios-douvikas.jpg |
| assane-diao | RECOVERED | assets/images/players/wikimedia/como/assane-diao.jpg |
| emil-audero | RECOVERED | assets/images/players/wikimedia/como/emil-audero.png |
| jean-butez | RECOVERED | assets/images/players/wikimedia/como/jean-butez.jpg |
| luca-mazzitelli | RECOVERED | assets/images/players/wikimedia/como/luca-mazzitelli.jpg |
| marc-oliver-kempf | RECOVERED | assets/images/players/wikimedia/como/marc-oliver-kempf.jpg |
| marlon-mustapha | RECOVERED | assets/images/players/wikimedia/como/marlon-mustapha.jpg |
| martin-baturina | RECOVERED | assets/images/players/wikimedia/como/martin-baturina.jpg |
| matthias-braunoder | RECOVERED | assets/images/players/wikimedia/como/matthias-braunoder.jpg |
| mauro-vigorito | RECOVERED | assets/images/players/wikimedia/como/mauro-vigorito.jpg |
| maxence-caqueret | RECOVERED | assets/images/players/wikimedia/como/maxence-caqueret.jpg |
| maximo-perrone | RECOVERED | assets/images/players/wikimedia/como/maximo-perrone.jpg |
| nico-paz | RECOVERED | assets/images/players/wikimedia/como/nico-paz.jpg |
| nicolas-kuhn | RECOVERED | assets/images/players/wikimedia/como/nicolas-kuhn.jpg |
| stefan-posch | RECOVERED | assets/images/players/wikimedia/como/stefan-posch.jpg |
| alex-jimenez | RECOVERED | assets/images/players/wikimedia/fiorentina/alex-jimenez.png |
| christ-inao-oulai | RECOVERED | assets/images/players/wikimedia/fiorentina/christ-inao-oulai.jpg |
| david-de-gea | RECOVERED | assets/images/players/wikimedia/fiorentina/david-de-gea.jpg |
| marco-brescianini | RECOVERED | assets/images/players/wikimedia/fiorentina/marco-brescianini.jpg |
| oliver-christensen | RECOVERED | assets/images/players/wikimedia/fiorentina/oliver-christensen.jpg |
| rolando-mandragora | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/140bd1d8788a6281d7561b41fbf1de528491f7bd.png |
| simon-sohm | VERIFIED_DUPLICATE_ARCHIVE | assets/images/players/wikimedia/fiorentina/simon-sohm.jpg |
| anouar-el-azzouzi | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/c41f1a17b03d4745c75c2977417a958e58fe9db6.jpg |
| anthony-oyono | RECOVERED | assets/images/players/wikimedia/frosinone/anthony-oyono.jpg |
| kevin-akpoguma | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/d7f5b2cb0bb2ce2b9eeed6aac80f3cf5c0edced8.jpg |
| sebastiano-desplanches | RECOVERED | assets/images/players/wikimedia/frosinone/sebastiano-desplanches.jpg |
| alessandro-vogliacco | RECOVERED | assets/images/players/wikimedia/genoa/alessandro-vogliacco.jpg |
| alessandro-bastoni | RECOVERED | assets/images/players/wikimedia/inter/alessandro-bastoni.jpg |
| andy-diouf | RECOVERED | assets/images/players/wikimedia/inter/andy-diouf.jpg |
| ange-yoan-bonny | RECOVERED | assets/images/players/wikimedia/inter/ange-yoan-bonny.jpg |
| benjamin-pavard | RECOVERED | assets/images/players/wikimedia/inter/benjamin-pavard.jpg |
| assets/images/players/wikimedia/inter/davide-frattesi.jpg | BLOCKED | assets/images/players/wikimedia/inter/davide-frattesi.jpg |
| federico-dimarco | RECOVERED | assets/images/players/wikimedia/inter/federico-dimarco.jpg |
| hakan-calhanoglu | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/29a98571a70b6d6337ecbc63ad00cdb8ff3197d0.jpg |
| henrikh-mkhitaryan | RECOVERED | assets/images/players/wikimedia/inter/henrikh-mkhitaryan.jpg |
| john-stones | RECOVERED | assets/images/players/wikimedia/inter/john-stones.jpg |
| kristjan-asllani | RECOVERED | assets/images/players/wikimedia/inter/kristjan-asllani.jpg |
| lautaro-martinez | RECOVERED | assets/images/players/wikimedia/inter/lautaro-martinez.jpg |
| luis-henrique | RECOVERED | assets/images/players/wikimedia/inter/luis-henrique.jpg |
| manuel-akanji | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/24986a8406ed69a842cfb99fe80a7539e5389ce7.jpg |
| marcus-thuram | RECOVERED | assets/images/players/wikimedia/inter/marcus-thuram.jpg |
| nicolo-barella | RECOVERED | assets/images/players/wikimedia/inter/nicolo-barella.jpg |
| yann-bisseck | RECOVERED | assets/images/players/wikimedia/inter/yann-bisseck.jpg |
| arthur | RECOVERED | assets/images/players/wikimedia/juventus/arthur.jpg |
| bremer | RECOVERED | assets/images/players/wikimedia/juventus/bremer.jpg |
| carlo-pinsoglio | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/72721a9512ef1916deaefcf5230cf80534ba37c5.jpg |
| douglas-luiz | RECOVERED | assets/images/players/wikimedia/juventus/douglas-luiz.jpg |
| edon-zhegrova | RECOVERED | assets/images/players/wikimedia/juventus/edon-zhegrova.jpg |
| francisco-conceicao | RECOVERED | assets/images/players/wikimedia/juventus/francisco-conceicao.jpg |
| jeremie-boga | RECOVERED | assets/images/players/wikimedia/juventus/jeremie-boga.jpg |
| jonathan-david | RECOVERED | assets/images/players/wikimedia/juventus/jonathan-david.jpg |
| kerim-alajbegovic | RECOVERED | assets/images/players/wikimedia/juventus/kerim-alajbegovic.jpg |
| khephren-thuram | RECOVERED | assets/images/players/wikimedia/juventus/khephren-thuram.jpg |
| assets/images/players/wikimedia/juventus/lois-openda.jpg | BLOCKED | assets/images/players/wikimedia/juventus/lois-openda.jpg |
| mattia-perin | RECOVERED | assets/images/players/wikimedia/juventus/mattia-perin.jpg |
| michele-di-gregorio | RECOVERED | assets/images/players/wikimedia/juventus/michele-di-gregorio.jpg |
| pierre-kalulu | RECOVERED | assets/images/players/wikimedia/juventus/pierre-kalulu.jpg |
| randal-kolo-muani | RECOVERED | assets/images/players/wikimedia/juventus/randal-kolo-muani.jpg |
| teun-koopmeiners | RECOVERED | assets/images/players/wikimedia/juventus/teun-koopmeiners.jpg |
| weston-mckennie | RECOVERED | assets/images/players/wikimedia/juventus/weston-mckennie.jpg |
| alessio-romagnoli | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/c57f149052fb3468d776829ae5e866bafb407409.png |
| alfonso-pedraza | RECOVERED | assets/images/players/wikimedia/lazio/alfonso-pedraza.jpg |
| boulaye-dia | RECOVERED | assets/images/players/wikimedia/lazio/boulaye-dia.jpg |
| danilho-doekhi | RECOVERED | assets/images/players/wikimedia/lazio/danilho-doekhi.jpg |
| luca-pellegrini | RECOVERED | assets/images/players/wikimedia/lazio/luca-pellegrini.jpg |
| nicolo-rovella | RECOVERED | assets/images/players/wikimedia/lazio/nicolo-rovella.jpg |
| samuel-gigot | RECOVERED | assets/images/players/wikimedia/lazio/samuel-gigot.jpg |
| lameck-banda | RECOVERED | assets/images/players/wikimedia/lecce/lameck-banda.jpg |
| willem-geubbels | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/b5cca018883a2415ffc86f5fe8e24e2a089cccd8.jpg |
| wladimiro-falcone | RECOVERED | assets/images/players/wikimedia/lecce/wladimiro-falcone.jpg |
| adrien-rabiot | RECOVERED | assets/images/players/wikimedia/milan/adrien-rabiot.jpg |
| alexis-saelemaekers | RECOVERED | assets/images/players/wikimedia/milan/alexis-saelemaekers.jpg |
| christian-pulisic | RECOVERED | assets/images/players/wikimedia/milan/christian-pulisic.jpg |
| christopher-nkunku | RECOVERED | assets/images/players/wikimedia/milan/christopher-nkunku.jpg |
| fikayo-tomori | RECOVERED | assets/images/players/wikimedia/milan/fikayo-tomori.jpg |
| goncalo-ramos | RECOVERED | assets/images/players/wikimedia/milan/goncalo-ramos.jpg |
| luka-modric | RECOVERED | assets/images/players/wikimedia/milan/luka-modric.jpg |
| mario-gila | RECOVERED | assets/images/players/wikimedia/milan/mario-gila.png |
| matteo-gabbia | RECOVERED | assets/images/players/wikimedia/milan/matteo-gabbia.jpg |
| mike-maignan | RECOVERED | assets/images/players/wikimedia/milan/mike-maignan.jpg |
| pervis-estupinan | RECOVERED | assets/images/players/wikimedia/milan/pervis-estupinan.jpg |
| pietro-terracciano | BLOCKED | assets/images/players/wikimedia/milan/pietro-terracciano.jpg |
| rafael-leao | RECOVERED | assets/images/players/wikimedia/milan/rafael-leao.jpg |
| samuele-ricci | RECOVERED | assets/images/players/wikimedia/milan/samuele-ricci.jpg |
| strahinja-pavlovic | RECOVERED | assets/images/players/wikimedia/milan/strahinja-pavlovic.jpg |
| andrea-colpani | RECOVERED | assets/images/players/wikimedia/monza/andrea-colpani.jpg |
| matteo-pessina | RECOVERED | assets/images/players/wikimedia/monza/matteo-pessina.jpg |
| patrick-cutrone | RECOVERED | assets/images/players/wikimedia/monza/patrick-cutrone.png |
| billy-gilmour | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/5c37103ace116c80c5809fe0e24d7ca263b3a0a4.jpg |
| frank-anguissa | RECOVERED | assets/images/players/wikimedia/napoli/frank-anguissa.jpg |
| giovanni-di-lorenzo | RECOVERED | assets/images/players/wikimedia/napoli/giovanni-di-lorenzo.jpg |
| lorenzo-lucca | RECOVERED | assets/images/players/wikimedia/napoli/lorenzo-lucca.jpg |
| stanislav-lobotka | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/97fe0e85d839ca0a2ed49251b8a5492c975ac2e6.jpg |
| abdoulaye-ndiaye | RECOVERED | assets/images/players/wikimedia/parma/abdoulaye-ndiaye.png |
| assets/images/players/wikimedia/parma/adrian-benedyczak.jpg | BLOCKED | assets/images/players/wikimedia/parma/adrian-benedyczak.jpg |
| alessandro-circati | RECOVERED | assets/images/players/wikimedia/parma/alessandro-circati.jpg |
| benjamin-cremaschi | RECOVERED | assets/images/players/wikimedia/parma/benjamin-cremaschi.jpg |
| anass-salah-eddine | RECOVERED | assets/images/players/wikimedia/roma/anass-salah-eddine.jpg |
| assets/images/players/wikimedia/roma/angelino.jpg | BLOCKED | assets/images/players/wikimedia/roma/angelino.jpg |
| daniele-ghilardi | RECOVERED | assets/images/players/wikimedia/roma/daniele-ghilardi.jpg |
| devyne-rensch | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/f8acf3b372f2b8d6e08d64361a9bb10d31f8bfef.jpg |
| donyell-malen | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/e0f409ee30fdf835296e6a7bbc1e0152718880e3.jpg |
| evan-ndicka | RECOVERED | assets/images/players/wikimedia/roma/evan-ndicka.jpg |
| konstantinos-koulierakis | REPLACED_WITH_VERIFIED_DERIVATIVE | assets/images/players/verified-derivatives/9287040cd894baf64d07613afafbc25ee6c94b8eb021a96b343cf2e6f6aee756.jpg |
| lorenzo-pellegrini | RECOVERED | assets/images/players/wikimedia/roma/lorenzo-pellegrini.jpg |
| matias-soule | RECOVERED | assets/images/players/wikimedia/roma/matias-soule.jpg |
| mile-svilar | RECOVERED | assets/images/players/wikimedia/roma/mile-svilar.jpg |
| neil-el-aynaoui | RECOVERED | assets/images/players/wikimedia/roma/neil-el-aynaoui.jpg |
| robinio-vaz | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/6b780f6fcd3f11e813b4df5fd1bebcfd7e70a97d.png |
| santiago-castro | RECOVERED | assets/images/players/wikimedia/roma/santiago-castro.jpg |
| assets/images/players/wikimedia/roma/tommaso-baldanzi.jpg | BLOCKED | assets/images/players/wikimedia/roma/tommaso-baldanzi.jpg |
| cristian-volpato | RECOVERED | assets/images/players/wikimedia/sassuolo/cristian-volpato.jpg |
| kristian-thorstvedt | RECOVERED | assets/images/players/wikimedia/sassuolo/kristian-thorstvedt.jpg |
| cesare-casadei | RECOVERED | assets/images/players/wikimedia/torino/cesare-casadei.jpg |
| duvan-zapata | RECOVERED | assets/images/players/wikimedia/torino/duvan-zapata.jpg |
| gvidas-gineitis | RECOVERED | assets/images/players/wikimedia/torino/gvidas-gineitis.jpg |
| kian-fitz-jim | RECOVERED | assets/images/players/wikimedia/torino/kian-fitz-jim.jpg |
| marcus-holmgren-pedersen | RECOVERED | assets/images/players/wikimedia/torino/marcus-holmgren-pedersen.jpg |
| pietro-pellegri | RECOVERED | assets/images/players/wikimedia/torino/pietro-pellegri.jpg |
| saul-coco | REPLACED_WITH_VERIFIED_ORIGINAL | assets/images/players/verified-originals/5cc0aebe3d761178aff1ead1eb09dd1e07312573.jpg |
| kingsley-ehizibue | REPLACED_WITH_VERIFIED_DERIVATIVE | assets/images/players/verified-derivatives/bf5a7c90d15137b7a779b851382c2c1707197d984de05957aaf802157e498366.jpg |
| nicolo-zaniolo | RECOVERED | assets/images/players/wikimedia/udinese/nicolo-zaniolo.jpg |
| assets/images/players/wikimedia/udinese/simone-pafundi.jpg | BLOCKED | assets/images/players/wikimedia/udinese/simone-pafundi.jpg |
| unai-gomez | RECOVERED | assets/images/players/wikimedia/udinese/unai-gomez.jpg |
| akor-adams | RECOVERED | assets/images/players/wikimedia/venezia/akor-adams.jpg |
| gianluca-busio | REPLACED_WITH_VERIFIED_DERIVATIVE | assets/images/players/verified-derivatives/3561de7d4dbefe920d3480df602654242952df2b281066aa2458d2b852c3d3d4.jpg |
| john-yeboah | RECOVERED | assets/images/players/wikimedia/venezia/john-yeboah.jpg |
| lion-lauberbach | RECOVERED | assets/images/players/wikimedia/venezia/lion-lauberbach.jpg |

I file sostituiti restano nell’archivio con stato SUPERSEDED_ARCHIVE_ONLY e non sono pubblicati. Non sono inclusi tra i casi ancora privi di una soluzione fotografica: il loro originale verificato è indicato nella stessa riga. Il duplicato di Simon Sohm è conservato e non incrementa il numero delle schede coperte. Le foto storiche non vengono inserite nelle rose correnti.

Nessuna modifica a statistiche, rose, previsioni, JavaScript di interfaccia, CSS o grafica; nessuna cancellazione di fotografie, commit, push o deploy. Verifiche riproducibili con scripts/test-player-photo-registry.mjs e scripts/check-player-photos-browser.cjs; esiti e schermate in browser.json. Integrità dei file precedenti e del progetto in recovery/integrity.json.
