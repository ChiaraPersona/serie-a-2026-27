(() => {
  const root = document.getElementById("team-squad-app");
  if (!root) return;

  const base = document.body.dataset.depth === "team" ? "../" : "";
  const release = "20260824-team-page-portrait-v6-rodrigo-mora";
  const defaultPlayerPhoto = `${base}assets/images/players/player-placeholder.png`;
  const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const contrastInk = color => {
    const hex = String(color || "").replace("#", "");
    const value = hex.length === 3 ? hex.split("").map(char => char + char).join("") : hex;
    if (!/^[0-9a-f]{6}$/i.test(value)) return "#fff";
    const channels = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255).map(channel => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > .42 ? "#0b1320" : "#fff";
  };
  const value = (input, suffix = "") => input === null || input === undefined || input === "" ? "N/D" : `${esc(input)}${suffix}`;
  const pct = input => value(input, "%");
  const initials = name => String(name).split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const matchStatusLabels = { scheduled: "Programmata", live: "In corso", finished: "Conclusa", postponed: "Rinviata" };
  const dateOnly = input => {
    if (!input) return null;
    const [year, month, day] = String(input).slice(0, 10).split("-");
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  };
  root.addEventListener("error", event => {
    const image = event.target;
    if (!image?.matches?.("img[data-player-photo]") || image.getAttribute("src") === defaultPlayerPhoto) return;
    image.setAttribute("src", defaultPlayerPhoto);
    image.classList.add("is-fallback");
    if (image.getAttribute("alt")) image.setAttribute("alt", `Foto non disponibile per ${image.dataset.playerName || "il calciatore"}`);
  }, true);
  const searchKey = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
  const cards = stats => {
    const values = [stats?.yellowCards, stats?.secondYellowCards, stats?.straightRedCards];
    return values.every(item => item === null || item === undefined) ? null : values.reduce((total, item) => total + (item ?? 0), 0);
  };
  const metric = (player, key) => {
    if (key === "age") return player.age;
    if (key === "marketValue") return player.marketValue?.amountEur;
    if (key === "cards") return cards(player.previousSeason?.totals);
    const per90Fields = { goalsPer90: "goals", assistsPer90: "assists", shotsPer90: "shots", shotsOnTargetPer90: "shotsOnTarget", cardsPer90: "cards", foulsCommittedPer90: "foulsCommitted", foulsWonPer90: "foulsWon" };
    if (per90Fields[key]) return player.previousSeason?.totals?.per90?.[per90Fields[key]];
    return player.previousSeason?.totals?.[key];
  };
  const roleOrder = { Portiere: 0, Difensore: 1, Centrocampista: 2, Attaccante: 3 };
  const roleAbbreviations = {
    Portiere: "POR", Difensore: "DC", "Difensore centrale": "DC", "Difensore centrale destro": "DC", "Difensore centrale sinistro": "DC",
    "Terzino destro": "TD", "Terzino sinistro": "TS",
    Centrocampista: "CC", "Centrocampista centrale": "CC", "Centrocampista centrale destro": "CC", "Centrocampista centrale sinistro": "CC",
    Mediano: "CDC", "Mediano / regista": "CDC", "Esterno destro": "ED", "Esterno sinistro": "ES",
    Trequartista: "COC", "Trequartista destro": "COC", "Trequartista sinistro": "COC", "Trequartista / ala": "COC", Regista: "COC",
    Attaccante: "ATT", "Seconda punta": "ATT", Centravanti: "ATT", "Ala destra": "AD", "Ala sinistra": "AS"
  };
  const displayRole = player => {
    const roles = Array.isArray(player.detailedRoles) && player.detailedRoles.length ? player.detailedRoles : [player.detailedRole || player.role];
    return [...new Set(roles.map(role => roleAbbreviations[role] || role).filter(Boolean))].join(" / ") || "N/D";
  };
  const compareByRole = (left, right) =>
    (roleOrder[left.role] ?? 99) - (roleOrder[right.role] ?? 99) ||
    String(left.detailedRole || left.role).localeCompare(String(right.detailedRole || right.role), "it") ||
    left.name.localeCompare(right.name, "it");

  const signed = number => `${number > 0 ? "+" : ""}${number}`;
  const objectiveStatus = (team, dataset, standings) => {
    const profile = dataset.teams.find(item => item.teamId === team.id);
    const row = standings.map((item, index) => ({ ...item, position: index + 1 })).find(item => item.team === team.id);
    if (!profile || !row || !window.ObjectiveMetrics) return "";
    const metrics = window.ObjectiveMetrics.calculateObjectiveMetrics(profile, row, row.played || 0);
    const metricCard = (label, display, numeric = null, tone = "") =>
      `<div class="objective-metric ${tone}"><span>${label}</span><strong>${display}</strong>${numeric === null ? "" : `<i class="metric-track" aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, numeric))}%"></b></i>`}</div>`;
    return `<section class="detail-section team-objective-section" aria-labelledby="team-objective-heading"><header class="objective-section-head"><div><p class="eyebrow">Stagione 2026/27</p><h2 id="team-objective-heading">Stato degli obiettivi</h2></div><p>La situazione viene ricalcolata in base ai risultati conclusi ed è un indicatore di contesto, non un pronostico.</p></header><article class="objective-card"><header><span class="team-objective-team">${esc(team.name)}</span><span>${metrics.status === "preseason" ? "Valori iniziali" : "Stagione in corso"}</span></header><div class="objective-title"><small>Obiettivo iniziale</small><h3>${esc(profile.primaryObjective)}</h3><p>Secondario: ${esc(profile.secondaryObjective)} · posizione obiettivo ${profile.targetPosition}ª</p></div><div class="objective-metrics">${metricCard("Progresso obiettivo", `${metrics.objectiveProgress}%`, metrics.objectiveProgress)}${metricCard("Rendimento sulle attese", signed(metrics.seasonOverperformance), null, metrics.seasonOverperformance > 0 ? "positive" : metrics.seasonOverperformance < 0 ? "negative" : "")}${metricCard("Motivazione", `${metrics.motivationCurrent}/100`, metrics.motivationCurrent)}${metricCard("Pressione", `${metrics.pressureCurrent}/100`, metrics.pressureCurrent)}${metricCard("Urgenza punti", `${metrics.urgency}/100`, metrics.urgency, metrics.urgency >= 80 ? "urgent" : "")}</div></article><p class="objective-method">A inizio stagione progresso e scostamento restano neutrali; dopo ogni giornata il calcolo considera posizione, punti, proiezione a 38 gare e distanza dall'obiettivo.</p></section>`;
  };

  const tacticalProfileSection = (team, dataset) => {
    const profile = dataset?.profiles?.find(item => item.teamId === team.id);
    if (!profile) return "";
    const metric = (label, content) => `<div><span>${label}</span><strong>${content}</strong></div>`;
    const traits = (title, items, emptyNote) => `<article class="team-style-traits"><h3>${title}</h3>${items.length ? `<ul>${items.map(item => `<li><span>${esc(item.label)}</span>${item.level ? `<small>${esc(item.level)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="muted">${emptyNote}</p>`}</article>`;
    const goalTypes = profile.goalTypes?.length
      ? `<div class="team-style-goals">${profile.goalTypes.map(item => `<div><span>${esc(item.type)}</span><strong>${value(item.goals)}</strong><small>${value(item.sharePct, "%")}</small></div>`).join("")}</div>`
      : '<p class="muted">Composizione dei gol: N/D nella pagina WhoScored disponibile.</p>';
    const leaderList = (title, items) => `<article><h4>${title}</h4>${items?.length ? `<ol>${items.map(item => `<li><span>${esc(item.player)}</span><strong>${value(item.value)}</strong></li>`).join("")}</ol>` : '<p class="muted">N/D</p>'}</article>`;
    return `<section class="detail-section team-style-section" aria-labelledby="team-style-heading"><header class="team-style-heading"><div><p class="eyebrow">Baseline tattica storica · ${esc(profile.competition)} 2025/26</p><h2 id="team-style-heading">Stile di gioco</h2></div></header>${profile.notes?.length ? `<aside class="competition-warning"><strong>Limiti del campione</strong><p>${profile.notes.map(esc).join(" ")}</p></aside>` : ""}<div class="team-style-metrics">${metric("Partite", value(profile.summary.appearances))}${metric("Gol / gara", value(profile.derived.goalsPerGame))}${metric("Tiri / gara", value(profile.summary.shotsPerGame))}${metric("Possesso", pct(profile.summary.possessionPct))}${metric("Passaggi riusciti", pct(profile.summary.passSuccessPct))}${metric("Duelli aerei", value(profile.summary.aerialWonPerGame))}${metric("Gialli / gara", value(profile.derived.yellowCardsPerGame))}${metric("Modulo più usato", profile.formation.code ? `${esc(profile.formation.code)} · ${value(profile.formation.appearances)} gare` : "N/D")}</div><div class="team-style-trait-grid">${traits("Punti di forza", profile.strengths || [], "Punti di forza non esposti dal provider.")}${traits("Debolezze", profile.weaknesses || [], "Debolezze non esposte dal provider.")}${traits("Comportamenti ricorrenti", profile.playingStyle || [], "Stile non esposto dal provider.")}</div><div class="team-style-lower"><article><h3>Origine dei gol</h3>${goalTypes}</article><article><h3>Leader statistici</h3><div class="team-style-leaders">${leaderList("Gol", profile.leaders?.goals)}${leaderList("Assist", profile.leaders?.assists)}${leaderList("Rating", profile.leaders?.rating)}</div></article></div><p class="objective-method">Uso previsto: fattore contestuale per le letture, da ricalibrare con forma 2026/27, assenze, allenatore, arbitro e quote. <a href="${esc(profile.source.url)}" target="_blank" rel="noreferrer">WhoScored</a>.</p></section>`;
  };

  const probableLineupSection = (team, teamSummary) => {
    const lineup = team.probableLineup;
    if (!lineup?.players?.length) return "";
    const shape = lineup.formation.split("-").map(Number);
    const units = [1, ...shape];
    let offset = 0;
    const rows = units.map((size, unitIndex) => {
      const players = lineup.players.slice(offset, offset + size).reverse();
      offset += size;
      return `<div class="probable-lineup-row probable-lineup-unit-${unitIndex}" style="--lineup-count:${size}">${players.map(lineupName => `<article class="probable-lineup-player"><strong>${esc(lineupName)}</strong></article>`).join("")}</div>`;
    }).reverse().join("");
    const [primary = "#0e2a69", secondary = "#07152f"] = teamSummary?.colors || [];
    const official = lineup.status === "official";
    const sourceLink = lineup.source?.url ? `<a href="${esc(lineup.source.url)}" target="_blank" rel="noreferrer">${esc(lineup.source.provider || "Fonte")}</a>` : esc(lineup.source?.provider || "Fonte non disponibile");
    const title = official ? "Formazione ufficiale" : "Probabile formazione";
    const substitutes = official && lineup.substitutes?.length ? `<p class="probable-lineup-substitutes"><strong>A disposizione:</strong> ${lineup.substitutes.map(esc).join(", ")}</p>` : "";
    return `<section class="detail-section team-probable-lineup" aria-labelledby="probable-lineup-heading" style="--lineup-primary:${esc(primary)};--lineup-secondary:${esc(secondary)};--lineup-head-ink:${contrastInk(secondary)}"><header class="probable-lineup-heading"><div><p class="eyebrow">Serie A 2026/27 · ${official ? "1ª giornata" : "proiezione prima giornata"}</p><h2 id="probable-lineup-heading">${title}</h2></div>${official ? "" : "<span>Visualizzazione sperimentale</span>"}</header><div class="probable-lineup-board"><header class="probable-lineup-board-head"><img src="${esc(team.logo)}" alt=""><div><small>${official ? "XI ufficiale" : "Probabile XI"}</small><h3>${esc(team.name)}</h3></div><strong>${esc(lineup.formation)}</strong></header><div class="probable-lineup-pitch" aria-label="${title} ${esc(team.name)} con modulo ${esc(lineup.formation)}"><span class="pitch-centre-line" aria-hidden="true"></span><span class="pitch-centre-circle" aria-hidden="true"></span><span class="pitch-box pitch-box-top" aria-hidden="true"></span><span class="pitch-box pitch-box-bottom" aria-hidden="true"></span>${rows}</div><footer><div><p>${official ? `Formazione ufficiale ${esc(lineup.fixtureLabel||team.name)}` : "Proiezione editoriale, non distinta ufficiale"}</p>${substitutes}</div>${sourceLink}</footer></div></section>`;
  };

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
  const teamNavigation = (team, teams) => {
    const currentIndex = teams.findIndex(item => item.id === team.id);
    const previous = teams[(currentIndex - 1 + teams.length) % teams.length];
    const next = teams[(currentIndex + 1) % teams.length];
    return `<header class="subpage-header team-page-navigation"><a class="team-page-navigation-all" href="${base}statistiche-squadre.html">← Tutte le squadre</a><nav aria-label="Navigazione tra le squadre"><a href="${base}statistiche-squadra/${esc(previous.id)}.html" aria-label="Squadra precedente: ${esc(previous.name)}"><span>← Squadra precedente</span><strong>${esc(previous.name)}</strong></a><a href="${base}statistiche-squadra/${esc(next.id)}.html" aria-label="Squadra successiva: ${esc(next.name)}"><span>Squadra successiva →</span><strong>${esc(next.name)}</strong></a></nav></header>`;
  };

  const scheduleLabel = match => {
    if (!match.date) return "Data da definire";
    return `${dateOnly(match.date)} · ${match.kickoff || "orario da definire"}${match.dateStatus === "provisional" ? " · programmazione provvisoria UEFA" : ""}`;
  };

  const calendarTeam = (team, currentTeamId) => `<span class="team-calendar-club${team.id === currentTeamId ? " is-current" : ""}"><img src="${base}assets/images/teams/monochrome/${esc(team.id)}-black.svg" alt="" loading="lazy"><span>${esc(team.name)}</span></span>`;

  function teamFixtureRow(match, teams, currentTeamId) {
    const home = teams.find(team => team.id === match.homeTeam);
    const away = teams.find(team => team.id === match.awayTeam);
    if (!home || !away) return "";
    const opponentId = match.homeTeam === currentTeamId ? match.awayTeam : match.homeTeam;
    const venue = match.homeTeam === currentTeamId ? "Casa" : "Trasferta";
    const score = match.score ? `${match.score.home} – ${match.score.away}` : "VS";
    return `<article class="team-calendar-row"><div class="team-calendar-round"><strong>${match.matchday}</strong><span>Giornata</span></div><div class="team-calendar-when"><strong>${scheduleLabel(match)}</strong><span class="status ${esc(match.status)}">${esc(matchStatusLabels[match.status] || match.status)}</span></div><span class="status venue-status">${venue}</span><div class="team-calendar-match">${calendarTeam(home, currentTeamId)}<strong class="team-calendar-score">${esc(score)}</strong>${calendarTeam(away, currentTeamId)}</div><div class="team-calendar-actions"><a href="${base}lettura.html?match=${esc(match.id)}">Lettura</a><a href="${base}statistiche-squadra/${esc(opponentId)}.html">Avversaria</a></div></article>`;
  }

  const teamFixtures = (team, matches) => matches
    .filter(match => match.competition === "serie-a" && match.season === "2026-27" && (match.homeTeam === team.id || match.awayTeam === team.id))
    .sort((left, right) => left.matchday - right.matchday);

  function personalCalendar(team, teams, matches) {
    const fixtures = teamFixtures(team, matches);
    return `<section class="detail-section team-personal-calendar" aria-labelledby="team-calendar-heading"><header class="team-schedule-head"><div><p class="eyebrow">Serie A 2026/27</p><h2 id="team-calendar-heading">Calendario di ${esc(team.name)}</h2><p class="muted">${fixtures.length} giornate disponibili nel menu.</p></div><a class="button" href="${base}calendario.html">Calendario completo</a></header><div class="team-calendar-picker"><label for="team-calendar-select"><span>Scegli la giornata</span><select id="team-calendar-select">${fixtures.map(match => `<option value="${esc(match.id)}">Giornata ${match.matchday} · ${scheduleLabel(match)}</option>`).join("")}</select></label><div id="team-calendar-selection" aria-live="polite">${fixtures[0] ? teamFixtureRow(fixtures[0], teams, team.id) : '<p class="muted">Calendario non disponibile.</p>'}</div></div></section>`;
  }

  async function load(path) {
    const response = await fetch(`${base}${path}?v=${release}`);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  const filters = () => `<div class="squad-controls"><label>Ricerca<input id="player-search" type="search" placeholder="Nome calciatore"></label><label>Ruolo<select id="role-filter"><option value="">Tutti</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select></label><label>Stato<select id="status-filter"><option value="">Tutti</option><option>confermato</option><option>nuovo acquisto</option><option>prestito</option><option>rientro dal prestito</option><option>primavera</option><option>da verificare</option></select></label><label>Ordina<select id="player-sort"><option value="role">Ruolo</option><option value="marketValue">Valore di mercato</option><option value="appearances">Presenze</option><option value="minutes">Minuti</option><option value="goals">Gol totali</option><option value="goalsPer90">Gol / 90</option><option value="assists">Assist totali</option><option value="assistsPer90">Assist / 90</option><option value="shots">Tiri totali</option><option value="shotsPer90">Tiri totali / 90</option><option value="shotsOnTarget">Tiri nello specchio</option><option value="shotsOnTargetPer90">Tiri nello specchio / 90</option><option value="cards">Cartellini totali</option><option value="cardsPer90">Cartellini / 90</option><option value="foulsCommitted">Falli commessi totali</option><option value="foulsCommittedPer90">Falli commessi / 90</option><option value="foulsWon">Falli subiti totali</option><option value="foulsWonPer90">Falli subiti / 90</option><option value="age">Età</option></select></label></div>`;

  const primaryEntry = player => player.previousSeason?.entries?.find(item => item.competitionType === "domestic-league") || player.previousSeason?.entries?.[0] || {};
  const leaderboardValue = (entry, key) => key === "cards" ? cards(entry) : entry?.[key];
  const leaderboardStats = [
    { key: "appearances", label: "Presenze" }, { key: "minutes", label: "Minuti" },
    { key: "goals", label: "Gol", per90: true }, { key: "assists", label: "Assist", per90: true },
    { key: "shots", label: "Tiri totali", per90: true }, { key: "shotsOnTarget", label: "Tiri nello specchio", per90: true },
    { key: "cards", label: "Cartellini", per90: true }, { key: "foulsCommitted", label: "Falli commessi", per90: true },
    { key: "foulsWon", label: "Falli subiti", per90: true }
  ];

  const per90Rate = (total, minutes) => typeof total === "number" && typeof minutes === "number" && minutes > 0 ? Math.round((total * 90 / minutes) * 100) / 100 : null;

  function previousSquadLeaderboardRows(players) {
    return players.map(player => {
      const entry = primaryEntry(player);
      return {
        player,
        linked: true,
        totals: Object.fromEntries(leaderboardStats.map(stat => [stat.key, leaderboardValue(entry, stat.key)])),
        per90: entry.per90 || {}
      };
    });
  }

  function currentSquadLeaderboardRows(team, matches) {
    const squadById = new Map(team.squad.map(player => [player.id, player]));
    const rows = new Map();
    const ensure = (playerId, playerName) => {
      if (!rows.has(playerId)) {
        rows.set(playerId, {
          player: squadById.get(playerId) || { id: playerId, name: playerName },
          appearances: 0,
          minutes: 0,
          minutesCoverage: 0,
          sums: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 },
          coverage: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 },
          cards: 0
        });
      }
      return rows.get(playerId);
    };
    const finishedMatches = teamFixtures(team, matches).filter(match => match.status === "finished" && match.score);
    for (const match of finishedMatches) {
      const side = match.homeTeam === team.id ? "home" : "away";
      for (const matchPlayer of match.playerStats?.[side] || []) {
        if (!matchPlayer.playerId) continue;
        const row = ensure(matchPlayer.playerId, matchPlayer.player);
        row.appearances += 1;
        if (typeof matchPlayer.minutes === "number") {
          row.minutes += matchPlayer.minutes;
          row.minutesCoverage += 1;
        }
        for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
          if (typeof matchPlayer[field] !== "number") continue;
          row.sums[field] += matchPlayer[field];
          row.coverage[field] += 1;
        }
      }
      for (const booking of match.bookings || []) {
        if (booking.team !== team.id || !booking.playerId) continue;
        ensure(booking.playerId, booking.player).cards += 1;
      }
    }
    return [...rows.values()].map(row => {
      const minutes = row.appearances > 0 && row.minutesCoverage === row.appearances ? row.minutes : null;
      const totals = {
        appearances: row.appearances || null,
        minutes,
        goals: row.appearances > 0 && row.coverage.goals === row.appearances ? row.sums.goals : null,
        assists: row.appearances > 0 && row.coverage.assists === row.appearances ? row.sums.assists : null,
        shots: row.appearances > 0 && row.coverage.shots === row.appearances ? row.sums.shots : null,
        shotsOnTarget: row.appearances > 0 && row.coverage.shotsOnTarget === row.appearances ? row.sums.shotsOnTarget : null,
        cards: row.cards,
        foulsCommitted: row.appearances > 0 && row.coverage.foulsCommitted === row.appearances ? row.sums.foulsCommitted : null,
        foulsWon: row.appearances > 0 && row.coverage.foulsWon === row.appearances ? row.sums.foulsWon : null
      };
      return {
        player: row.player,
        linked: squadById.has(row.player.id),
        totals,
        per90: Object.fromEntries(leaderboardStats.map(stat => [stat.key, per90Rate(totals[stat.key], minutes)]))
      };
    });
  }

  function squadLeaderboardSection(rows, teamName, season) {
    const cardsHtml = leaderboardStats.map(stat => {
      const leaders = rows.map(row => ({ player: row.player, linked: row.linked, total: row.totals[stat.key], rate: row.per90?.[stat.key] }))
        .filter(item => item.total !== null && item.total !== undefined)
        .sort((left, right) => right.total - left.total || (right.rate ?? -1) - (left.rate ?? -1) || left.player.name.localeCompare(right.player.name, "it"))
        .slice(0, 3);
      return `<article class="squad-leader-card"><header><h4>${esc(stat.label)}</h4><span>${stat.per90 ? "Totale · /90" : "Totale"}</span></header>${leaders.length ? `<ol>${leaders.map((item, index) => `<li><span class="leader-rank">${index + 1}</span>${item.linked ? `<button class="leader-player" type="button" data-player-id="${esc(item.player.id)}">${esc(item.player.name)}</button>` : `<span class="leader-player leader-player-unlinked">${esc(item.player.name)}<small>Scheda N/D</small></span>`}<strong>${value(item.total)}${stat.per90 ? `<small>${value(item.rate)} /90</small>` : ""}</strong></li>`).join("")}</ol>` : `<p class="muted">Dati non disponibili</p>`}</article>`;
    }).join("");
    const current = season === "2026/27";
    const description = current
      ? "Classifica sulle partite concluse e sui soli campi giocatore disponibili. Le metriche non coperte restano N/D."
      : "Classifica basata sui valori totali. Dove previsto, accanto al totale è indicata anche la media ogni 90 minuti.";
    const titleId = `squad-leaders-title-${season.replace("/", "-")}`;
    return `<details class="squad-leaders squad-leaders-period" aria-labelledby="${titleId}"><summary class="squad-leaders-summary"><span class="squad-leaders-heading"><span><span class="eyebrow">Top 3 per statistica</span><strong id="${titleId}">I migliori di ${esc(teamName)} nel ${season}</strong></span><span>${current ? "Stagione in corso" : "Archivio"}</span></span></summary><div class="squad-leaders-content"><p>${description}</p><div class="squad-leader-grid">${cardsHtml}</div></div></details>`;
  }

  function squadLeaderboards(team, matches) {
    const currentRows = currentSquadLeaderboardRows(team, matches);
    const previousRows = previousSquadLeaderboardRows(team.squad);
    return `<div id="squad-leaderboards" class="squad-leaderboards">${squadLeaderboardSection(currentRows, team.name, "2026/27")}${squadLeaderboardSection(previousRows, team.name, "2025/26")}</div>`;
  }

  function squadTable(players) {
    if (!players.length) return `<div class="data-warning"><strong>Nessun calciatore corrisponde ai filtri</strong><p>Modifica ricerca, ruolo o stato per visualizzare di nuovo la rosa.</p></div>`;
    const statColumns = Array.from({ length: 14 }, () => '<col class="squad-col-stat">').join("");
    return `<p class="squad-count" aria-live="polite">${players.length} calciator${players.length === 1 ? "e" : "i"}</p><div class="table-wrap squad-table-wrap" role="region" aria-label="Statistiche calciatori; scorri orizzontalmente e verticalmente" tabindex="0"><table class="squad-table"><colgroup><col class="squad-col-player"><col class="squad-col-role"><col class="squad-col-market"><col class="squad-col-played"><col class="squad-col-minutes">${statColumns}</colgroup><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">Ruolo</th><th rowspan="2">Valore mercato</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">Tiri nello specchio</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${players.map(player => {
      const entry = primaryEntry(player);
      const avatar = `<img class="mini-avatar${player.photo ? "" : " is-fallback"}" src="${esc(player.photo || defaultPlayerPhoto)}" data-player-photo data-fallback="${esc(defaultPlayerPhoto)}" alt="" loading="lazy" decoding="async">`;
      return `<tr data-player-id="${esc(player.id)}"><td><button class="player-open" type="button" data-player-id="${esc(player.id)}">${avatar}<span><strong>${esc(player.name)}</strong><small>${value(player.shirtNumber)} · ${value(player.nationality)}</small></span></button></td><td>${value(displayRole(player))}</td><td>${player.marketValue ? `<a class="market-value" href="${esc(player.marketValue.sourceUrl)}" target="_blank" rel="noreferrer">${value(player.marketValue.label)}</a>` : "N/D"}</td><td>${value(entry.appearances)}</td><td>${value(entry.minutes)}</td><td>${value(entry.goals)}</td><td>${value(entry.per90?.goals)}</td><td>${value(entry.assists)}</td><td>${value(entry.per90?.assists)}</td><td>${value(entry.shots)}</td><td>${value(entry.per90?.shots)}</td><td>${value(entry.shotsOnTarget)}</td><td>${value(entry.per90?.shotsOnTarget)}</td><td>${value(cards(entry))}</td><td>${value(entry.per90?.cards)}</td><td>${value(entry.foulsCommitted)}</td><td>${value(entry.per90?.foulsCommitted)}</td><td>${value(entry.foulsWon)}</td><td>${value(entry.per90?.foulsWon)}</td></tr>`;
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
    const portrait = `<figure class="player-portrait-wrap"><img class="player-portrait${player.photo ? "" : " is-fallback"}" src="${esc(player.photo || defaultPlayerPhoto)}" data-player-photo data-player-name="${esc(player.name)}" data-fallback="${esc(defaultPlayerPhoto)}" alt="${player.photo ? `Foto di ${esc(player.name)}` : `Foto non disponibile per ${esc(player.name)}`}" decoding="async"></figure>`;
    const sourceList = (player.sources || []).map(source => `<li><strong>${esc(source.provider)}</strong> · ${esc(source.scope)} · ${esc(source.retrievedAt)}${source.url ? ` · <a href="${esc(source.url)}" target="_blank" rel="noreferrer">fonte</a>` : ""}</li>`).join("");
    return `<button class="player-detail-close" type="button" aria-label="Chiudi dettaglio">×</button><div class="player-profile-head">${portrait}<div><span class="status-badge">${value(player.status)}</span><h2>${esc(player.name)}</h2><p>${value(displayRole(player))} · ${value(player.nationality)} · maglia ${value(player.shirtNumber)}</p><p class="quality-${esc(player.dataQuality?.status || "unavailable")}">Dati ${value(player.dataQuality?.status)} · ${value(player.dataQuality?.note)}</p></div></div><div class="player-bio-grid"><div><span>Nascita</span><strong>${value(player.dateOfBirth)} · ${value(player.age, " anni")}</strong></div><div><span>Luogo</span><strong>${value(player.birthplace)}</strong></div><div><span>Altezza / peso</span><strong>${value(player.heightCm, " cm")} · ${value(player.weightKg, " kg")}</strong></div><div><span>Piede</span><strong>${value(player.preferredFoot)}</strong></div><div><span>Nel club dal</span><strong>${value(player.atMilanSince)}</strong></div><div><span>Arrivo</span><strong>${value(player.arrivalDate)}</strong></div><div><span>Club attuale</span><strong>${value(player.currentTeam)}</strong></div><div><span>Club precedente</span><strong>${value(player.previousTeam)} · ${value(player.previousCompetition)}</strong></div></div>${entries.length > 1 ? `<label class="competition-selector">Squadra / competizione<select id="player-entry-select">${entries.map((entry, index) => `<option value="${index}">${esc(entry.team)} · ${esc(entry.competition)}</option>`).join("")}</select></label>` : ""}<div id="player-entry-detail">${entryDetail(player, 0)}</div><section><h3>Qualità e fonti</h3><p>${player.dataQuality?.uncertainAssociation ? "Associazione giocatore-provider da verificare." : "Associazione giocatore-provider verificata."} Metodo: ${value(player.dataQuality?.associationMethod)}.</p><ul class="source-list">${sourceList}</ul></section>`;
  }
  const marketValuePanel = player => `<div class="player-market-panel"><span>Valore di mercato</span><strong>${value(player.marketValue?.label)}</strong><small>${player.marketValue ? `${esc(player.marketValue.provider)} · aggiornato ${esc(player.marketValue.retrievedAt)}` : "Dato non disponibile"}</small></div>`;

  function teamSeasonStatsBlock(stats) {
    const noMatches = stats.results.played === 0 ? '<p class="team-season-empty">Nessuna partita conclusa: i totali sono a zero e le medie restano N/D.</p>' : "";
    return `<details class="detail-section team-season-section" data-team-season="${esc(stats.season)}"><summary class="team-season-summary"><span class="team-season-heading"><span><span class="eyebrow">${esc(stats.competition)}</span><strong>Statistiche ${esc(stats.season)}</strong></span><span>${value(stats.results.played)} partite concluse</span></span></summary><div class="team-season-content">${noMatches}<div class="team-season-group"><h3>Risultati</h3>${statGrid(stats.results, ["played", "won", "drawn", "lost", "points", "pointsPerGame", "goalsFor", "goalsAgainst", "goalDifference", "cleanSheets", "failedToScore", "winPercentage", "drawPercentage", "lossPercentage"])}</div><div class="team-season-group"><h3>Disciplina</h3>${statGrid(stats.discipline, ["foulsCommitted", "foulsCommittedPerGame", "foulsWon", "foulsWonPerGame", "yellowCards", "yellowCardsPerGame", "secondYellowCards", "straightRedCards", "dismissals", "penaltiesConceded", "penaltiesWon", "disciplineIndex"])}</div><div class="team-season-group"><h3>Casa e trasferta</h3><div class="split-grid"><article><h4>Casa</h4>${statGrid(stats.homeAway.home, ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "yellowCards"])}</article><article><h4>Trasferta</h4>${statGrid(stats.homeAway.away, ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "yellowCards"])}</article></div></div></div></details>`;
  }

  function teamTotalStatsBlock(stats, promoted) {
    const mixedCompetitionNote = promoted ? '<p class="team-season-empty">Il totale comprende Serie B 2025/26 e Serie A 2026/27: è un riepilogo numerico, non un confronto diretto di rendimento.</p>' : "";
    return `<details class="detail-section team-total-section" data-team-season="total"><summary class="team-season-summary"><span class="team-season-heading"><span><span class="eyebrow">Riepilogo complessivo</span><strong>Totale 2025/26 + 2026/27</strong></span><span>${esc(stats.competition)}</span></span></summary><div class="team-season-content">${mixedCompetitionNote}<div class="team-season-group"><h3>Risultati complessivi</h3>${statGrid(stats.results, ["played", "won", "drawn", "lost", "points", "pointsPerGame", "goalsFor", "goalsAgainst", "goalDifference", "cleanSheets", "failedToScore", "winPercentage", "drawPercentage", "lossPercentage"])}</div><div class="team-season-group"><h3>Disciplina complessiva</h3>${statGrid(stats.discipline, ["foulsCommitted", "foulsCommittedPerGame", "foulsWon", "foulsWonPerGame", "yellowCards", "yellowCardsPerGame", "secondYellowCards", "straightRedCards", "dismissals", "penaltiesConceded", "penaltiesWon", "disciplineIndex"])}</div></div></details>`;
  }

  function teamPage(team, objectiveDataset, standings, teams, matches, teamStyleProfiles) {
    const currentStats = team.teamStats.seasons?.["2026/27"];
    const previousStats = team.teamStats.seasons?.["2025/26"] || team.teamStats;
    const combinedStats = team.teamStats.total;
    const statsSections = `${currentStats ? teamSeasonStatsBlock(currentStats) : ""}${teamSeasonStatsBlock(previousStats)}${combinedStats ? teamTotalStatsBlock(combinedStats, team.previousSeason.promoted) : ""}`;
    const quality = team.squad.reduce((summary, player) => {
      const key = player.dataQuality?.status || "unavailable";
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    root.innerHTML = `${teamNavigation(team, teams)}<section class="team-detail-hero"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"><div><h1>${esc(team.officialName)}</h1><p>${esc(team.shortName)} · Città ${value(team.city)} · Stadio ${value(team.stadium)} · Allenatore ${value(team.coach)}</p></div></section>${team.previousSeason.promoted ? `<aside class="competition-warning"><strong>Statistiche di provenienza: Serie B 2025/26.</strong> Non sono confrontate direttamente con i valori grezzi di Serie A.</aside>` : ""}${statsSections}<section class="detail-section"><h2>Rosa 2026/27</h2><p class="roster-summary">${team.squad.length} calciatori · ${quality.complete || 0} schede complete · ${quality.partial || 0} parziali · ${quality.unavailable || 0} non disponibili. Seleziona un nome per il dettaglio.</p>${filters()}<div id="squad-results">${squadTable(team.squad)}</div>${squadLeaderboards(team, matches)}</section><dialog id="player-detail" class="player-detail"><div id="player-detail-content"></div></dialog>`;
    root.querySelector(".team-detail-hero")?.insertAdjacentHTML("afterend", personalCalendar(team, teams, matches));
    root.querySelector(".team-detail-hero")?.insertAdjacentHTML("afterend", objectiveStatus(team, objectiveDataset, standings));
    root.querySelector(".team-objective-section")?.insertAdjacentHTML("afterend", probableLineupSection(team, teams.find(item => item.id === team.id)));
    root.querySelector(".team-probable-lineup")?.insertAdjacentHTML("afterend", tacticalProfileSection(team, teamStyleProfiles));
    root.querySelector(".team-detail-hero div")?.insertAdjacentHTML("beforeend", `<p><strong>Modulo preferito:</strong> ${value(team.preferredFormation)}</p>`);
    const calendarSelect = document.getElementById("team-calendar-select");
    calendarSelect?.addEventListener("change", () => {
      const selectedMatch = teamFixtures(team, matches).find(match => match.id === calendarSelect.value);
      document.getElementById("team-calendar-selection").innerHTML = selectedMatch ? teamFixtureRow(selectedMatch, teams, team.id) : '<p class="muted">Partita non disponibile.</p>';
    });

    const dialog = document.getElementById("player-detail");
    const showPlayer = playerId => {
      const player = team.squad.find(item => item.id === playerId);
      if (!player) return;
      document.getElementById("player-detail-content").innerHTML = playerDetail(player);
      document.querySelector("#player-detail-content .player-profile-head")?.insertAdjacentHTML("afterend", marketValuePanel(player));
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
    document.getElementById("squad-leaderboards").addEventListener("click", event => {
      const button = event.target.closest("button.leader-player");
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
      if (!teamId) throw new Error("Squadra non specificata");
      const [team, objectiveDataset, teams, matches, teamStyleProfiles] = await Promise.all([
        load(`data/teams/${teamId}.json`),
        load("data/team-objectives.json"),
        load("data/normalized/teams.json"),
        load("data/normalized/matches.json"),
        load("data/normalized/team-style-profiles.json")
      ]);
      teamPage(team, objectiveDataset, calculateStandings(teams, matches), teams, matches, teamStyleProfiles);
    } catch (error) {
      root.innerHTML = `<div class="data-warning"><strong>Errore di caricamento</strong><p>${esc(error.message)}. Apri il sito tramite server locale, non con file://.</p></div>`;
    }
  })();
})();
