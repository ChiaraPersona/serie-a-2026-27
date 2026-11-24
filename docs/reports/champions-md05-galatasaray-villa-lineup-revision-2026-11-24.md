# Galatasaray–Aston Villa: nuovi undici ufficiali

Acquisite le due nuove immagini dell'utente in `data/sources/official-lineup-evidence/champions-md05-galatasaray-villa-revision/`. Aggiornati entrambi gli undici canonici, le copie nella struttura fixture e la rappresentazione MD5 condivisa; le altre gare restano invariate. Identità risolte esclusivamente con ID canonici già registrati.

Galatasaray 4-3-3: Jakobs entra al posto di Deniz Gül. Aston Villa 4-2-3-1: Lindelöf, Mings e João Gomes entrano al posto di Wan-Bissaka, Pau Torres e Goretzka. Nessuna panchina ufficiale fornita: la rosa residua conserva lo stato non confermato.

Eseguito il builder MD5 in modalità ufficiale sulla sola `ucl-2026-27-md05-02`, quindi filtro titolari e build sito. Due selezioni operative di Deniz Gül escluse e conservate in `data/technical-archive/champions-md05/replaced-official-starter-markets-2026-11-24.json`. Dopo il ricalcolo compaiono Lemina sui tiri e McGinn sui tiri in porta, con contratti/quote verificati dal test MD5. Non sono previsioni trasferite da Deniz. Restano nove selezioni DUO suggerite nella gara; probabilità, fair odds ed EV DUO restano null e nessuna approvazione statistica viene aggiunta.

Passano suite MD5, regressione undici ufficiali senza panchina, persistenza schedina personale e verifica mirata dei due contratti reali di Deniz precedentemente salvati: rimossi anche da MyCombo. Confrontati integralmente con HEAD i cataloghi e i pronostici delle altre 17 gare: identici. Browser MD5 verificato a 1440/390 px su tutte le Letture, Schedina e salvataggio selezioni. Evidenze in `output/champions-md05/browser/`.
