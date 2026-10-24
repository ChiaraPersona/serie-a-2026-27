/* INTERNAL, DISPOSABLE PROTOTYPE. Compatibility rules, never card probabilities. */
var TacticalPrototype = (() => {
  const version = 'tactical-compatibility-prototype-v1';
  const phases = {
    defence: 'Difesa organizzata',
    pressing: 'Pressing',
    attack: 'Contesa offensiva'
  };
  const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function position(player) {
    const detail = normal(player.detailedRole), broad = normal(player.role);
    let group = null;
    if (/portiere|goalkeeper|^gk$/.test(detail || broad)) group = 'keeper';
    else if (/terzino/.test(detail)) group = 'fullback';
    else if (/difensore centrale/.test(detail)) group = 'centreback';
    else if (/^ala\b/.test(detail)) group = 'winger';
    else if (/esterno/.test(detail)) group = 'wide';
    else if (/trequartista/.test(detail)) group = 'playmaker';
    else if (/mediano|regista|mezzala|centrocampista centrale/.test(detail)) group = 'midfield';
    else if (/punta|centravanti/.test(detail)) group = 'forward';
    const side = /destro|destra/.test(detail) ? 'right' : /sinistro|sinistra/.test(detail) ? 'left'
      : /centrale|mediano|regista|trequartista|punta|centravanti|portiere/.test(detail) ? 'central' : null;
    return { group, side, detail: player.detailedRole || null, broad: player.role || null };
  }
  const wide = p => ['fullback', 'winger', 'wide'].includes(p.group);
  const attacking = p => ['winger', 'wide', 'playmaker', 'forward'].includes(p.group);
  const centralAttack = p => ['playmaker', 'forward'].includes(p.group);
  const opposite = (a, b) => a.side && b.side && a.side !== 'central' && b.side !== 'central' && a.side !== b.side;
  const centralCompatible = (a, b) => a.side && b.side && (a.side === 'central' || b.side === 'central' || opposite(a, b));
  function relation(a, b, phase) {
    if (!a.group || !b.group || a.group === 'keeper' || b.group === 'keeper') return null;
    if (phase === 'defence') {
      if (['fullback', 'wide', 'winger'].includes(a.group) && wide(b) && opposite(a, b))
        return { kind: a.group === 'winger' ? 'Ripiegamento laterale possibile' : 'Confronto laterale possibile', basis: 'Posizioni sui lati opposti delle due squadre', duty: a.group === 'winger' ? 'Compito di ripiegamento da confermare' : 'Posizione e copertura nella fixture da confermare' };
      if (a.group === 'centreback' && centralAttack(b) && centralCompatible(a, b))
        return { kind: 'Confronto con il reparto offensivo', basis: 'Difensore centrale e punta/trequartista in una zona compatibile', duty: 'Assegnazione della marcatura da confermare' };
      if (a.group === 'centreback' && ['winger', 'wide'].includes(b.group) && opposite(a, b))
        return { kind: 'Copertura laterale possibile', basis: 'Centrale sul lato del possibile ingresso avversario', duty: 'Uscita dalla linea e copertura da confermare' };
      if (['midfield', 'playmaker', 'forward'].includes(a.group) && ['midfield', 'playmaker', 'forward'].includes(b.group) && centralCompatible(a, b))
        return { kind: a.group === 'forward' ? 'Ripiegamento centrale possibile' : 'Contesa nella zona centrale', basis: 'Comparti centrali compatibili, senza assegnazione univoca', duty: a.group === 'forward' ? 'Ripiegamento della punta da confermare' : 'Compito senza palla da confermare' };
      if (['midfield', 'playmaker'].includes(a.group) && attacking(b) && wide(b) && opposite(a, b))
        return { kind: 'Raddoppio o copertura possibile', basis: 'Centrocampista con lato noto e attaccante sulla fascia opposta', duty: 'Raddoppio e scivolamento laterale da confermare' };
    }
    if (phase === 'pressing') {
      if (['forward', 'playmaker', 'midfield'].includes(a.group) && ['centreback', 'midfield'].includes(b.group) && centralCompatible(a, b))
        return { kind: 'Pressione sulla costruzione possibile', basis: 'Giocatore avanzato o centrocampista e costruttore in zona compatibile', duty: 'Sistema e frequenza del pressing N/D' };
      if (['winger', 'wide'].includes(a.group) && ['fullback', 'wide', 'centreback'].includes(b.group) && opposite(a, b))
        return { kind: 'Pressione laterale possibile', basis: 'Confronto tra lato avanzato e uscita avversaria', duty: 'Altezza e frequenza del pressing N/D' };
    }
    if (phase === 'attack') {
      if (['forward', 'playmaker'].includes(a.group) && ['centreback', 'midfield'].includes(b.group) && centralCompatible(a, b))
        return { kind: 'Contesa offensiva possibile', basis: 'Punta/trequartista e difendente compatibili per zona', duty: 'Protezione della palla e tipo di contatto non osservati' };
      if (['winger', 'wide', 'fullback'].includes(a.group) && ['fullback', 'wide', 'centreback', 'midfield'].includes(b.group) && opposite(a, b))
        return { kind: 'Contesa offensiva laterale possibile', basis: 'Giocatore sul lato offensivo e difendente sul lato opposto', duty: 'Partecipazione offensiva e tipo di contatto da confermare' };
      if (a.group === 'midfield' && ['midfield', 'centreback'].includes(b.group) && centralCompatible(a, b))
        return { kind: 'Contesa tra reparti possibile', basis: 'Centrocampista e difendente in una zona compatibile', duty: 'Possesso e contatto individuale non osservati' };
    }
    return null;
  }
  function channelContext(player, ownTeam, opponentTeam, phase, opponent) {
    // Attack channels belong to the team in possession. Pressing needs build-up data.
    if (phase === 'pressing') return { teamId: opponentTeam.id, side: null, state: 'UNKNOWN_BUILDUP', text: 'Canale di costruzione N/D: il profilo d’attacco non misura il pressing.' };
    const p = position(player), team = phase === 'attack' ? ownTeam : opponentTeam;
    // In defence, the relevant attack lane belongs to this opponent, not every
    // possible duel of the defender's historical lane (e.g. a mezzala vs a striker).
    const side = phase === 'attack' ? p.side : opponent ? position(opponent).side : null;
    const evidence = team.channel;
    if (!side || !evidence || evidence.status === 'UNKNOWN') return { teamId: team.id, side, state: 'UNKNOWN', text: 'Canale pertinente N/D.' };
    const supported = evidence.preferredSides.includes(side) || (side !== 'central' && evidence.wide);
    return { teamId: team.id, side, state: supported ? 'QUALITATIVE_COMPATIBLE' : 'QUALITATIVE_UNCONFIRMED',
      text: supported ? `Il profilo qualitativo di ${team.name} segnala attacchi nella zona compatibile. Volume e quota osservata N/D.`
        : `Il profilo qualitativo di ${team.name} non documenta una preferenza per questa zona. Questo non esclude il confronto.` };
  }
  function buildInteractions(player, ownTeam, opponentTeam, phase) {
    if (!player.id || !player.active || !position(player).group) return [];
    return opponentTeam.players.filter(o => o.id && o.active && o.teamId !== player.teamId).flatMap(opponent => {
      const match = relation(position(player), position(opponent), phase);
      if (!match) return [];
      return [{ playerId: player.id, opponentPlayerId: opponent.id, opponentName: opponent.name, opponentRole: opponent.detailedRole,
        phase, status: 'TACTICAL_ESTIMATE', ...match, channel: channelContext(player, ownTeam, opponentTeam, phase, opponent),
        opponentFoulsWon: opponent.current?.foulsWonPer90 ?? null,
        opponentHistoricalFoulsWon: opponent.historical?.foulsWonPer90 ?? null,
        exposureShare: null, duelProbability: null, cardProbability: null,
        limits: ['Abbinamento da ruoli compatibili, non marcatura osservata', match.duty,
          ...([player, opponent].some(p => p.positionSource !== 'FIXTURE_EXPLICIT') ? ['Almeno una posizione deriva dal profilo storico della rosa'] : [])]
      }];
    });
  }
  function inspectPlayer(player, ownTeam, opponentTeam, selectedPhase = 'all') {
    const selected = selectedPhase === 'all' ? Object.keys(phases) : [selectedPhase];
    const interactions = selected.flatMap(phase => buildInteractions(player, ownTeam, opponentTeam, phase));
    const positionState = position(player);
    const unavailable = !player.id ? 'Identità canonica N/D: nessun abbinamento.'
      : !player.active ? 'Fuori dall’undici selezionato: nessun duello iniziale.'
      : !positionState.group ? 'Posizione troppo generica: non assegno avversari nominativi.'
      : positionState.group === 'keeper' ? 'Portiere incluso. Duelli aerei, uscite e altre condotte richiedono eventi specifici, qui N/D.'
      : !interactions.length ? 'Nessun confronto sostenuto dalle regole e dalle posizioni disponibili.' : null;
    return { player, interactions, unavailable, positionState, state: 'RESEARCH_DESCRIPTIVE_ONLY',
      cardProbability: null, transitionEvidence: null, misconductCauseEvidence: null };
  }
  return { version, phases, position, relation, channelContext, buildInteractions, inspectPlayer };
})();
if (typeof module !== 'undefined') module.exports = TacticalPrototype;
