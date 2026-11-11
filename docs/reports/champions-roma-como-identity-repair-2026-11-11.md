# Collegamenti individuali Roma e Como — 11 novembre 2026

Corretti i mapping espliciti UEFA/ESPN di Evan N’Dicka (250122785 / 242593), Wesley França (250212323 / 332354) e Maxence Caqueret (250101128 / 265912). Identità verificate nei profili canonici `data/teams/roma.json`, `data/teams/como.json` e nel registro UEFA `data/sources/champions-registered-squads-2026-27.json`.

N’Dicka e Wesley erano presenti nelle statistiche con ID `evan-ndicka` e `wesley`, mentre la rosa usava `evan-n-dicka` e `wesley-franca` senza ID ESPN. I mapping sono conservati nella fonte della rosa e rispettati dai builder. Nessuna ricerca approssimativa dei nomi.

Caqueret era presente in `data/sources/champions-observed-performances-2026-27.json` senza playerId canonico. Il replay mirato `scripts/repair-champions-roma-como-identities.cjs` controlla ID ESPN e squadra nel referto originale compresso `data/raw/champions-pilot/espn/summaries/2026-27/uefa.champions/2026-10-22/401915395.json.gz`, associa il playerId e applica le funzioni aggregateEntries/currentAggregate già esistenti. Il totale mostrato è solo Champions: una presenza, 26 minuti stimati, zero tiri/SOT nel campione acquisito; non è uno zero stagionale completo. Fonte del referto: https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event=401915395

I totali domestici esistenti di N’Dicka (367 minuti) e Wesley (432 minuti) sono invariati. Nessuna nuova acquisizione, aggiornamento del cutoff o modifica a formule, quote, selezioni e previsioni. Tutte le squadre diverse da Como nel database individuale sono strutturalmente identiche al commit precedente.

Verifiche: test di regressione dei tre ID prima fallito sul mapping Roma e poi superato; test delle 36 schede superato; verifica browser di Roma e Como a 1280 e 390 px superata per minuti visualizzati e assenza di overflow; controllo sintattico dei builder superato.

Decisioni utente in questa chat: accettate le lacune degli altri giocatori di Inter, Napoli, Roma e Como come fuori dai recuperi prioritari; N/D conservato. Le decisioni non equivalgono a certificazioni di zero presenze.
