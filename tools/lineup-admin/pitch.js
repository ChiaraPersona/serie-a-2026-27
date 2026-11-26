'use strict';
const teamEditorStates = new WeakMap();
const formationChoices = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-2-1', '3-4-3', '4-1-4-1', '5-3-2', '5-4-1', '4-3-1-2', '3-4-1-2', '4-2-2-2'];
const roleLabel = role => ({goalkeeper: 'Portiere', defender: 'Difensore', midfielder: 'Centrocampista', forward: 'Attaccante'})[role] || role;

function createTeamEditor(team, onChange) {
  const node = (tag, text, cls) => {const el = document.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; return el;};
  const card = node('section', null, 'card team-editor'); card.dataset.team = team.id;
  const state = {slots: Array.from({length: 11}, (_, i) => team.starters[i] || null), bench: [...team.bench],
    formation: team.formation || '4-3-3', benchConfirmed: false};
  teamEditorStates.set(card, state);
  const head = node('div', null, 'team-heading'); const count = node('span', '', 'count');
  head.append(node('h2', team.name), count); card.append(head);
  if (team.prefill?.kind === 'reference') card.append(node('p', `Formazione preimpostata come riferimento${team.prefill.matchday ? ` dalla giornata ${team.prefill.matchday}` : ''}${team.prefill.date ? ` del ${team.prefill.date.split('-').reverse().join('/')}` : ''}. Da verificare per questa partita.`, 'hint'));
  if (team.unresolved.length) card.append(node('p', `Identità ancora da risolvere: ${team.unresolved.join(', ')}. Ricalcolo sospeso per questa partita.`, 'hint'));
  const label = node('label', 'Modulo'); const formation = node('select'); formation.dataset.formation = '';
  for (const value of [...new Set([...formationChoices, state.formation])]) {const option = node('option', value); option.value = value; formation.append(option);}
  formation.value = state.formation; label.append(formation); label.className = 'formation-control'; card.append(label);
  card.append(node('p', 'Modulo e formazione sono modificabili. Tocca un giocatore per sostituirlo.', 'hint'));
  const pitch = node('div', null, 'pitch'); pitch.setAttribute('aria-label', `Campo ${team.name}`);
  const markings = node('div', null, 'pitch-markings'); markings.setAttribute('aria-hidden', 'true'); pitch.append(markings);
  const rows = node('div', null, 'pitch-rows'); pitch.append(rows); card.append(pitch);
  const benchHeading = node('div', null, 'bench-heading'); benchHeading.append(node('h3', 'Panchina'));
  const addBench = node('button', '+ Aggiungi', 'secondary'); addBench.type = 'button'; addBench.dataset.addBench = '';
  benchHeading.append(addBench); card.append(benchHeading);
  const bench = node('div', null, 'bench-list'); card.append(bench);
  const check = node('label', null, 'bench-check'); const confirmed = node('input'); confirmed.type = 'checkbox'; confirmed.dataset.benchConfirmed = '';
  check.append(confirmed, node('span', 'Ho verificato anche la panchina (obbligatorio per il ricalcolo)')); card.append(check);
  confirmed.addEventListener('change', () => {state.benchConfirmed = confirmed.checked; onChange();});

  const dialog = node('dialog', null, 'player-picker'); dialog.setAttribute('aria-label', `Scegli un giocatore per ${team.name}`);
  const dialogHead = node('div', null, 'picker-heading'); const title = node('h3', 'Scegli il titolare');
  const close = node('button', 'Chiudi', 'secondary'); close.type = 'button'; close.addEventListener('click', () => dialog.close());
  dialogHead.append(title, close); dialog.append(dialogHead);
  const searchLabel = node('label', 'Cerca giocatore'); const search = node('input'); search.type = 'search'; search.placeholder = 'Cerca nella rosa'; search.autocomplete = 'off'; searchLabel.append(search); dialog.append(searchLabel);
  const results = node('div', null, 'picker-results'); dialog.append(results);
  const remove = node('button', 'Libera questa posizione', 'secondary'); remove.type = 'button'; dialog.append(remove); card.append(dialog);
  let picking = null;
  const player = id => team.players.find(p => p.id === id);
  const changed = () => {confirmed.checked = false; state.benchConfirmed = false; onChange(); render();};
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it');
  function renderResults() {
    const query = normalize(search.value.trim()); results.replaceChildren();
    const preferred = picking === 0 ? ['goalkeeper', 'Portiere'] : [];
    const candidates = [...team.players].sort((a, b) => Number(preferred.includes(b.role)) - Number(preferred.includes(a.role)));
    for (const p of candidates.filter(p => normalize(p.name).includes(query))) {
      const occupied = state.slots.indexOf(p.id);
      const button = node('button', null, 'picker-player'); button.type = 'button'; button.dataset.pickPlayer = p.id;
      const inBench = state.bench.includes(p.id);
      const unavailable = occupied >= 0 && (picking === 'bench' || occupied !== picking) || picking === 'bench' && inBench;
      button.disabled = unavailable;
      const name = node('span', p.name); const detail = node('small', unavailable ? occupied >= 0 ? 'Già titolare' : 'Già in panchina' : inBench ? 'In panchina · sposta in campo' : roleLabel(p.role));
      button.append(name, detail);
      button.addEventListener('click', () => {
        if (picking === 'bench') state.bench.push(p.id);
        else {state.slots[picking] = p.id; state.bench = state.bench.filter(id => id !== p.id);}
        changed(); dialog.close();
      });
      results.append(button);
    }
    if (!results.children.length) results.append(node('p', 'Nessun giocatore trovato nella rosa.', 'hint'));
  }
  function openPicker(index) {
    picking = index; search.value = '';
    title.textContent = index === 'bench' ? 'Aggiungi alla panchina' : index === 0 ? 'Scegli il portiere' : 'Scegli il titolare';
    remove.hidden = index === 'bench' || !state.slots[index];
    renderResults(); dialog.showModal(); search.focus();
  }
  search.addEventListener('input', renderResults);
  remove.addEventListener('click', () => {if (typeof picking === 'number') {state.slots[picking] = null; changed();} dialog.close();});
  addBench.addEventListener('click', () => openPicker('bench'));
  formation.addEventListener('change', () => {state.formation = formation.value; changed();});
  function render() {
    rows.replaceChildren(); let index = 0;
    const lines = [1, ...state.formation.split('-').map(Number)];
    lines.forEach((size, line) => {
      const row = node('div', null, 'pitch-line'); row.dataset.line = String(line);
      for (let n = 0; n < size; n++) {
        const slot = index++, p = player(state.slots[slot]);
        const button = node('button', null, 'pitch-slot'); button.type = 'button'; button.dataset.slot = String(slot);
        if (p) button.dataset.selectedPlayer = p.id;
        const position = line === 0 ? 'Portiere' : line === 1 ? 'Difesa' : line === lines.length - 1 ? 'Attacco' : 'Centrocampo';
        button.setAttribute('aria-label', p ? `Cambia ${p.name}, posizione ${slot + 1}` : `Aggiungi titolare: ${position}, posizione ${slot + 1}`);
        button.classList.toggle('filled', !!p);
        const circle = node('span', p ? String(slot + 1) : '+', 'slot-circle'); circle.setAttribute('aria-hidden', 'true');
        const abbreviation = {Portiere: 'POR', Difesa: 'DIF', Attacco: 'ATT', Centrocampo: 'CEN'}[position];
        button.append(circle, node('span', p ? p.name : abbreviation, 'slot-name'));
        button.addEventListener('click', () => openPicker(slot)); row.append(button);
      }
      rows.append(row);
    });
    count.textContent = `${state.slots.filter(Boolean).length} / 11 titolari`;
    bench.replaceChildren();
    for (const id of state.bench) {
      const p = player(id); if (!p) continue;
      const chip = node('div', null, 'bench-player'); chip.append(node('span', p.name));
      const button = node('button', '×', 'bench-remove'); button.type = 'button'; button.dataset.removeBench = id;
      button.setAttribute('aria-label', `Rimuovi ${p.name} dalla panchina`);
      button.addEventListener('click', () => {state.bench = state.bench.filter(value => value !== id); changed();});
      chip.append(button); bench.append(chip);
    }
    if (!bench.children.length) bench.append(node('p', 'Aggiungi i giocatori convocati in panchina.', 'hint'));
  }
  render(); return card;
}

function readTeamEditor(card) {
  const state = teamEditorStates.get(card);
  return {teamId: card.dataset.team, formation: state.formation, starters: state.slots.filter(Boolean),
    bench: [...state.bench], benchConfirmed: state.benchConfirmed};
}
