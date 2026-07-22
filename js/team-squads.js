(() => {
  const root = document.getElementById("team-squad-app");
  if (!root) return;

  const base = document.body.dataset.depth === "team" ? "../" : "";
  const release = "20260722-role-order";
  const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const value = (input, suffix = "") => input === null || input === undefined || input === "" ? "N/D" : `${esc(input)}${suffix}`;
  const pct = input => value(input, "%");
  const initials = name => String(name).split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const searchKey = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
  const cards = stats => {
    const values = [stats?.yellowCards, stats?.secondYellowCards, stats?.straightRedCards];
    return values.every(item => item === null || item === undefined) ? null : values.reduce((total, item) => total + (item ?? 0), 0);
  };
  const metric = (player, key) => {
    if (key === "age") return player.age;
    if (key === "cards") return cards(player.previousSeason?.totals);
    const per90Fields = { goalsPer90: "goals", assistsPer90: "assists", shotsPer90: "shots", shotsOnTargetPer90: "shotsOnTarget", cardsPer90: "cards", foulsCommittedPer90: "foulsCommitted", foulsWonPer90: "foulsWon" };
    if (per90Fields[key]) return player.previousSeason?.totals?.per90?.[per90Fields[key]];
    return player.previousSeason?.totals?.[key];
  };
  const roleOrder = { Portiere: 0, Difensore: 1, Centrocampista: 2, Attaccante: 3 };
  const compareByRole = (left, right) =>
    (roleOrder[left.role] ?? 99) - (roleOrder[right.role] ?? 99) ||
    String(left.detailedRole || left.role).localeCompare(String(right.detailedRole || right.role), "it") ||
    left.name.localeCompare(right.name, "it");

  const labels = {
    played: "Partite", won: "Vittorie", drawn: "Pareggi", lost: "Sconfitte", points: "Punti",
    pointsPerGame: "Punti / partita", goalsFor: "Gol fatti", goalsAgainst: "Gol subiti",
    goalDifference: "Differenza reti", cleanSheets: "Clean sheet", failedToScore: "Gare senza segnare",
    winPercentage: "Vittorie", drawPercentage: "Pareggi", lossPercentage: "Sconfitte",
    foulsCommitted: "Falli commessi", foulsCommittedPerGame: "Falli / partita", foulsWon: "Falli subiti",
    foulsWonPerGame: "Falli subiti / partita", yellowCards: "Gialli", yellowCardsPerGame: "Gialli / partita",
    secondYellowCards: "Doppi gialli", straightRedCards: "Rossi diretti", dismissals: "Espulsioni",
    penaltiesConceded: "Rigori concessi", penaltiesWon: "Rigori ottenuti", disciplineIndex: "Indice disciplinare",
    goalsAgainstPerGame: "Gol subiti / partita", appearances: "Presenze", starts: "Da titolare",
    substituteAppearances: "Da subentrato", minutes: "Minuti", minutesPerAppearance: "Minuti / presenza",
    completeMatches: "Gare complete", substitutedOff: "Sostituzioni", goals: "Gol", assists: "Assist",
    shots: "Tiri totali", shotsOnTarget: "Tiri nello specchio", penaltiesTaken: "Rigori calciati", penaltiesScored: "Rigori segnati",
    offsides: "Fuorigioco", keyPasses: "Passaggi chiave", chancesCreated: "Occasioni create",
    passAccuracy: "Precisione passaggi", crosses: "Cross", tackles: "Contrasti", interceptions: "Intercetti",
    clearances: "Respinte", duels: "Duelli", duelsWon: "Duelli vinti", goalsConceded: "Gol subiti",
    saves: "Parate", savePercentage: "% parate", penaltiesFaced: "Rigori affrontati", penaltiesSaved: "Rigori parati", cards: "Cartellini"
  };

  const statGrid = (object, keys, compact = false) => `<div class="${compact ? "player-stat-grid" : "team-stat-grid"}">${keys.map(key => `<article><span>${labels[key] || key}</span><strong>${key.endsWith("Percentage") || key === "passAccuracy" || key === "savePercentage" ? pct(object?.[key]) : value(object?.[key])}</strong></article>`).join("")}</div>`;
  const nav = `<header class="subpage-header"><a href="${base}statistiche-squadra/index.html">← Tutte le squadre</a><a href="${base}statistiche-squadre.html">Statistiche squadre</a></header>`;

  async function load(path) {
    const response = await fetch(`${base}${path}?v=${release}`);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  function indexPage(data) {
    root.innerHTML = `<section class="team-directory-hero"><p class="eyebrow">Serie A 2026/27</p><h1>Rose e statistiche squadra</h1><p class="lead">20 pagine alimentate da JSON. Campionato 2025/26 sempre indicato, con Serie B separata per le neopromosse.</p></section><section class="team-directory-grid">${data.teams.map(team => {
      const [primary = "#174fa5", secondary = "#081d48"] = team.colors || [];
      return `<a class="team-directory-card" href="${team.id}.html" style="--team-primary:${primary};--team-secondary:${secondary}"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"><div><h2>${esc(team.name)}</h2><p>${team.previousSeason.position ? `${team.previousSeason.position}ª posizione · ${team.previousSeason.points} punti` : "Posizione N/D"}</p><small>Città: ${value(team.city)} · Stadio: ${value(team.stadium)}</small><small>Allenatore: ${value(team.coach)} · Rosa disponibile: ${team.playerCount}</small></div></a>`;
    }).join("")}</section>`;
  }

  const filters = () => `<div class="squad-controls"><label>Ricerca<input id="player-search" type="search" placeholder="Nome calciatore"></label><label>Ruolo<select id="role-filter"><option value="">Tutti</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select></label><label>Stato<select id="status-filter"><option value="">Tutti</option><option>confermato</option><option>nuovo acquisto</option><option>prestito</option><option>rientro dal prestito</option><option>primavera</option><option>da verificare</option></select></label><label>Ordina<select id="player-sort"><option value="role">Ruolo</option><option value="appearances">Presenze</option><option value="minutes">Minuti</option><option value="goals">Gol totali</option><option value="goalsPer90">Gol / 90</option><option value="assists">Assist totali</option><option value="assistsPer90">Assist / 90</option><option value="shots">Tiri totali</option><option value="shotsPer90">Tiri totali / 90</option><option value="shotsOnTarget">Tiri nello specchio</option><option value="shotsOnTargetPer90">Tiri nello specchio / 90</option><option value="cards">Cartellini totali</option><option value="cardsPer90">Cartellini / 90</option><option value="foulsCommitted">Falli commessi totali</option><option value="foulsCommittedPer90">Falli commessi / 90</option><option value="foulsWon">Falli subiti totali</option><option value="foulsWonPer90">Falli subiti / 90</option><option value="age">Età</option></select></label></div>`;

  const primaryEntry = player => player.previousSeason?.entries?.find(item => item.competitionType === "domestic-league") || player.previousSeason?.entries?.[0] || {};
  const leaderboardValue = (entry, key) => key === "cards" ? cards(entry) : entry?.[key];
  const leaderboardStats = [
    { key: "appearances", label: "Presenze" }, { key: "minutes", label: "Minuti" },
    { key: "goals", label: "Gol", per90: true }, { key: "assists", label: "Assist", per90: true },
    { key: "shots", label: "Tiri totali", per90: true }, { key: "shotsOnTarget", label: "Tiri nello specchio", per90: true },
    { key: "cards", label: "Cartellini", per90: true }, { key: "foulsCommitted", label: "Falli commessi", per90: true },
    { key: "foulsWon", label: "Falli subiti", per90: true }
  ];

  function squadLeaderboards(players, teamName) {
    const cardsHtml = leaderboardStats.map(stat => {
      const leaders = players.map(player => {
        const entry = primaryEntry(player);
        return { player, total: leaderboardValue(entry, stat.key), rate: entry.per90?.[stat.key] };
      }).filter(item => item.total !== null && item.total !== undefined)
        .sort((left, right) => right.total - left.total || (right.rate ?? -1) - (left.rate ?? -1) || left.player.name.localeCompare(right.player.name, "it"))
        .slice(0, 3);
      return `<article class="squad-leader-card"><header><h4>${esc(stat.label)}</h4><span>${stat.per90 ? "Totale · /90" : "Totale"}</span></header>${leaders.length ? `<ol>${leaders.map((item, index) => `<li><span class="leader-rank">${index + 1}</span><button class="leader-player" type="button" data-player-id="${esc(item.player.id)}">${esc(item.player.name)}</button><strong>${value(item.total)}${stat.per90 ? `<small>${value(item.rate)} /90</small>` : ""}</strong></li>`).join("")}</ol>` : `<p class="muted">Dati non disponibili</p>`}</article>`;
    }).join("");
    return `<section id="squad-leaders" class="squad-leaders" aria-labelledby="squad-leaders-title"><div class="squad-leaders-heading"><div><p class="eyebrow">Top 3 per statistica</p><h3 id="squad-leaders-title">I migliori di ${esc(teamName)} nel 2025/26</h3></div><p>Classifica basata sui valori totali. Dove previsto, accanto al totale è indicata anche la media ogni 90 minuti.</p></div><div class="squad-leader-grid">${cardsHtml}</div></section>`;
  }

  function squadTable(players) {
    if (!players.length) return `<div class="data-warning"><strong>Nessun calciatore corrisponde ai filtri</strong><p>Modifica ricerca, ruolo o stato per visualizzare di nuovo la rosa.</p></div>`;
    const statColumns = Array.from({ length: 14 }, () => '<col class="squad-col-stat">').join("");
    return `<p class="squad-count" aria-live="polite">${players.length} calciator${players.length === 1 ? "e" : "i"}</p><div class="table-wrap squad-table-wrap" role="region" aria-label="Statistiche calciatori; scorri orizzontalmente e verticalmente" tabindex="0"><table class="squad-table"><colgroup><col class="squad-col-player"><col class="squad-col-role"><col class="squad-col-status"><col class="squad-col-team"><col class="squad-col-competition"><col class="squad-col-played"><col class="squad-col-minutes">${statColumns}</colgroup><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">Ruolo</th><th rowspan="2">Stato</th><th rowspan="2">Squadra 2025/26</th><th rowspan="2">Competizione</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">Tiri nello specchio</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${players.map(player => {
      const entry = primaryEntry(player);
      return `<tr data-player-id="${esc(player.id)}"><td><button class="player-open" type="button" data-player-id="${esc(player.id)}"><span class="mini-avatar">${initials(player.name)}</span><span><strong>${esc(player.name)}</strong><small>${value(player.shirtNumber)} · ${value(player.nationality)}</small></span></button></td><td>${value(player.detailedRole || player.role)}</td><td><span class="status-badge">${value(player.status)}</span></td><td>${value(entry.team)}</td><td>${value(entry.competition)}</td><td>${value(entry.appearances)}</td><td>${value(entry.minutes)}</td><td>${value(entry.goals)}</td><td>${value(entry.per90?.goals)}</td><td>${value(entry.assists)}</td><td>${value(entry.per90?.assists)}</td><td>${value(entry.shots)}</td><td>${value(entry.per90?.shots)}</td><td>${value(entry.shotsOnTarget)}</td><td>${value(entry.per90?.shotsOnTarget)}</td><td>${value(cards(entry))}</td><td>${value(entry.per90?.cards)}</td><td>${value(entry.foulsCommitted)}</td><td>${value(entry.per90?.foulsCommitted)}</td><td>${value(entry.foulsWon)}</td><td>${value(entry.per90?.foulsWon)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function entryDetail(player, entryIndex) {
    const entry = player.previousSeason?.entries?.[entryIndex] || player.previousSeason?.entries?.[0] || {};
    const attacking = ["goals", "assists", "shots", "shotsOnTarget", "penaltiesTaken", "penaltiesScored", "offsides", "keyPasses", "chancesCreated", "passAccuracy", "crosses"];
    const discipline = ["foulsCommitted", "foulsWon", "yellowCards", "secondYellowCards", "straightRedCards"];
    const defending = ["tackles", "interceptions", "clearances", "duels", "duelsWon"];
    const goalkeeping = ["goalsConceded", "cleanSheets", "saves", "savePercentage", "penaltiesFaced", "penaltiesSaved"];
    return `<div class="player-competition-heading"><div><span>Squadra e competizione 2025/26</span><strong>${value(entry.team)} · ${value(entry.competition)}</strong></div><div><span>Fonte statistica</span><strong>${value(entry.source)} · ${value(entry.lastUpdated)}</strong></div></div><section><h3>Impiego</h3>${statGrid(entry, ["appearances", "starts", "substituteAppearances", "minutes", "minutesPerAppearance", "completeMatches", "substitutedOff"], true)}</section><section><h3>Attacco e creazione</h3>${statGrid(entry, attacking, true)}</section><section><h3>Disciplina</h3>${statGrid(entry, discipline, true)}</section><section><h3>Difesa</h3>${statGrid(entry, defending, true)}</section>${player.role === "Portiere" ? `<section><h3>Portiere</h3>${statGrid(entry, goalkeeping, true)}</section>` : ""}<section><h3>Valori per 90 minuti</h3>${statGrid(entry.per90 || {}, ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon", "cards"], true)}</section>`;
  }

  function playerDetail(player) {
    const entries = player.previousSeason?.entries || [];
    const portrait = player.photo ? `<img class="player-portrait" src="${esc(player.photo)}" alt="Foto di ${esc(player.name)}">` : `<div class="player-portrait player-initials" aria-label="Foto non disponibile">${initials(player.name)}</div>`;
    const sourceList = (player.sources || []).map(source => `<li><strong>${esc(source.provider)}</strong> · ${esc(source.scope)} · ${esc(source.retrievedAt)}${source.url ? ` · <a href="${esc(source.url)}" target="_blank" rel="noreferrer">fonte</a>` : ""}</li>`).join("");
    return `<button class="player-detail-close" type="button" aria-label="Chiudi dettaglio">×</button><div class="player-profile-head">${portrait}<div><span class="status-badge">${value(player.status)}</span><h2>${esc(player.name)}</h2><p>${value(player.detailedRole || player.role)} · ${value(player.nationality)} · maglia ${value(player.shirtNumber)}</p><p class="quality-${esc(player.dataQuality?.status || "unavailable")}">Dati ${value(player.dataQuality?.status)} · ${value(player.dataQuality?.note)}</p></div></div><div class="player-bio-grid"><div><span>Nascita</span><strong>${value(player.dateOfBirth)} · ${value(player.age, " anni")}</strong></div><div><span>Luogo</span><strong>${value(player.birthplace)}</strong></div><div><span>Altezza / peso</span><strong>${value(player.heightCm, " cm")} · ${value(player.weightKg, " kg")}</strong></div><div><span>Piede</span><strong>${value(player.preferredFoot)}</strong></div><div><span>Nel club dal</span><strong>${value(player.atMilanSince)}</strong></div><div><span>Arrivo</span><strong>${value(player.arrivalDate)}</strong></div><div><span>Club attuale</span><strong>${value(player.currentTeam)}</strong></div><div><span>Club precedente</span><strong>${value(player.previousTeam)} · ${value(player.previousCompetition)}</strong></div></div>${entries.length > 1 ? `<label class="competition-selector">Squadra / competizione<select id="player-entry-select">${entries.map((entry, index) => `<option value="${index}">${esc(entry.team)} · ${esc(entry.competition)}</option>`).join("")}</select></label>` : ""}<div id="player-entry-detail">${entryDetail(player, 0)}</div><section><h3>Qualità e fonti</h3><p>${player.dataQuality?.uncertainAssociation ? "Associazione giocatore-provider da verificare." : "Associazione giocatore-provider verificata."} Metodo: ${value(player.dataQuality?.associationMethod)}.</p><ul class="source-list">${sourceList}</ul></section>`;
  }

  function teamPage(team) {
    const results = team.teamStats.results;
    const discipline = team.teamStats.discipline;
    const homeAway = team.teamStats.homeAway;
    const quality = team.squad.reduce((summary, player) => {
      const key = player.dataQuality?.status || "unavailable";
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    root.innerHTML = `${nav}<section class="team-detail-hero"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"><div><p class="eyebrow">${esc(team.previousSeason.competition)} 2025/26${team.previousSeason.promoted ? " · neopromossa" : ""}</p><h1>${esc(team.officialName)}</h1><p>${esc(team.shortName)} · Città ${value(team.city)} · Stadio ${value(team.stadium)} · Allenatore ${value(team.coach)}</p><p class="updated">Aggiornato ${esc(team.lastUpdated)}</p></div></section>${team.previousSeason.promoted ? `<aside class="competition-warning"><strong>Statistiche di provenienza: Serie B 2025/26.</strong> Non sono confrontate direttamente con i valori grezzi di Serie A.</aside>` : ""}<section class="detail-section"><h2>Risultati 2025/26</h2>${statGrid(results, ["played", "won", "drawn", "lost", "points", "pointsPerGame", "goalsFor", "goalsAgainst", "goalDifference", "cleanSheets", "failedToScore", "winPercentage", "drawPercentage", "lossPercentage"])}</section><section class="detail-section"><h2>Disciplina</h2>${statGrid(discipline, ["foulsCommitted", "foulsCommittedPerGame", "foulsWon", "foulsWonPerGame", "yellowCards", "yellowCardsPerGame", "secondYellowCards", "straightRedCards", "dismissals", "penaltiesConceded", "penaltiesWon", "disciplineIndex"])}</section><section class="detail-section"><h2>Casa e trasferta</h2><div class="split-grid"><article><h3>Casa</h3>${statGrid(homeAway.home, ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "yellowCards"])}</article><article><h3>Trasferta</h3>${statGrid(homeAway.away, ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "yellowCards"])}</article></div></section><section class="detail-section"><h2>Rosa 2026/27</h2><p class="roster-summary">${team.squad.length} calciatori · ${quality.complete || 0} schede complete · ${quality.partial || 0} parziali · ${quality.unavailable || 0} non disponibili. Seleziona un nome per il dettaglio.</p>${filters()}<div id="squad-results">${squadTable(team.squad)}</div>${squadLeaderboards(team.squad, team.name)}</section><section class="detail-section"><h2>Copertura statistica individuale</h2><p class="muted">Le schede separano squadra e competizione 2025/26, mantengono i campi non esposti come N/D e calcolano i valori per 90 minuti soltanto quando i minuti sono disponibili.</p></section><section class="detail-section"><h2>Fonti</h2><ul class="source-list">${team.sources.map(source => `<li><strong>${esc(source.provider)}</strong> · ${esc(source.scope)} · aggiornamento ${esc(source.retrievedAt)}${source.url ? ` · <a href="${esc(source.url)}" target="_blank" rel="noreferrer">fonte</a>` : ""}</li>`).join("")}</ul></section><dialog id="player-detail" class="player-detail"><div id="player-detail-content"></div></dialog>`;

    const dialog = document.getElementById("player-detail");
    const showPlayer = playerId => {
      const player = team.squad.find(item => item.id === playerId);
      if (!player) return;
      document.getElementById("player-detail-content").innerHTML = playerDetail(player);
      if (!dialog.open) dialog.showModal();
      dialog.querySelector(".player-detail-close").addEventListener("click", () => dialog.close());
      const selector = dialog.querySelector("#player-entry-select");
      if (selector) selector.addEventListener("change", () => {
        dialog.querySelector("#player-entry-detail").innerHTML = entryDetail(player, Number(selector.value));
      });
    };

    const apply = () => {
      const query = searchKey(document.getElementById("player-search").value.trim());
      const role = document.getElementById("role-filter").value;
      const status = document.getElementById("status-filter").value;
      const sort = document.getElementById("player-sort").value;
      const selected = team.squad
        .filter(player => (!query || searchKey(player.name).includes(query)) && (!role || player.role === role) && (!status || player.status === status))
        .sort((left, right) => {
          if (sort === "role") return compareByRole(left, right);
          const leftValue = metric(left, sort);
          const rightValue = metric(right, sort);
          if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? left.name.localeCompare(right.name, "it") : 1;
          if (rightValue === null || rightValue === undefined) return -1;
          return rightValue - leftValue || left.name.localeCompare(right.name, "it");
        });
      document.getElementById("squad-results").innerHTML = squadTable(selected);
    };

    root.querySelectorAll(".squad-controls input, .squad-controls select").forEach(control => control.addEventListener("input", apply));
    document.getElementById("squad-results").addEventListener("click", event => {
      const button = event.target.closest(".player-open");
      if (button) showPlayer(button.dataset.playerId);
    });
    document.getElementById("squad-leaders").addEventListener("click", event => {
      const button = event.target.closest(".leader-player");
      if (button) showPlayer(button.dataset.playerId);
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    apply();
  }

  (async () => {
    try {
      const teamId = document.body.dataset.team;
      if (teamId) teamPage(await load(`data/teams/${teamId}.json`));
      else indexPage(await load("data/teams/index.json"));
    } catch (error) {
      root.innerHTML = `<div class="data-warning"><strong>Errore di caricamento</strong><p>${esc(error.message)}. Apri il sito tramite server locale, non con file://.</p></div>`;
    }
  })();
})();
