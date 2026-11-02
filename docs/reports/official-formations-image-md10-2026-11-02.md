# Sassuolo–Fiorentina: moduli dall'immagine e verifica MD10

Aggiornamento locale del 2 novembre 2026. L'immagine inviata dall'utente sostituisce il precedente testo ambiguo: entrambe le squadre in 4-3-3. Conservata l'evidenza interna in `data/sources/official-lineup-evidence/sassuolo-fiorentina-2026-27-md-10/formations-user.png`.

Ordine tattico corretto per il renderer condiviso: Sassuolo, da destra a sinistra, Walukiewicz–Candé–Idzes–Doig; Sulemana–Matic–Adzic; Berardi–Esposito–Laurienté. Fiorentina: Jiménez–Dragusin–Viery–João Mário; Ndour–Fagioli–Brescianini; Mastantuono–Pellegrino–Njie. Ruoli e ruoli di reparto sono input della sola fixture, ricavati dalla disposizione dell'immagine, senza modificare le anagrafiche o le formule. Eliminata l'indicazione dei reparti da confermare.

Ricalcolata esclusivamente Sassuolo–Fiorentina tramite builder e criteri esistenti, applicata la policy ufficiale e rigenerate Lettura/Schedina. Nessun cambiamento alle altre fixture. Ripetuto il build dopo un errore transitorio Windows di scrittura della proiezione; la seconda rigenerazione ha disabilitato nuove acquisizioni prospettiche intermedie. Ricerca prospettica separata dai mercati operativi. Quote, contratti, soglie e modificatori mantenuti invariati; probabilità, quota equa ed EV DUO null/N/D. Nessuna liquidazione modificata.

Verifica su tutte le nove partite fornite nella chat: 18 moduli ufficiali e 198 titolari coerenti fra fonte canonica, registro per fixture e proiezioni UI. Le altre otto avevano già i moduli ufficiali corretti e non richiedevano un nuovo ricalcolo. Evidenza `output/sassuolo-fiorentina-md10-image/all-official-formations-audit.json`.

Superati test dedicati dei moduli, ufficiali, proiezioni, Schedina MD10 (202 esiti pubblici quotati nella giornata), deduplica contratti, policy ufficiali/MyCombo, BetSelection, salvataggi e diff check. Browser desktop/mobile 1440/390 px: 22 nomi ufficiali, moduli ufficiali, esclusioni, nessun overflow o errore JavaScript. Backup compresso, report e screenshot in `output/sassuolo-fiorentina-md10-image/`.

Le modifiche concorrenti di importazione quote/probabili Champions sono preservate. Nessun commit, push o deploy.
