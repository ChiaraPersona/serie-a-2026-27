'use strict';
const $ = id => document.getElementById(id);
let fixtures = [], current = null, token = '', dirty = false, busy = false, generation = 0, drafts = [], selectedFixture = '', selectedCompetition = 'serie-a';
function element(tag, text, cls) {const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node;}
async function api(url, payload) {
  const res = await fetch(url, payload ? {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Lineup-Token': token}, body: JSON.stringify(payload)} : {});
  const data = await res.json(); if (!res.ok) throw Error(data.error || 'Operazione non riuscita.'); return data;
}
function feedback(title, lines = [], error = false) {
  const box = $('feedback'); box.replaceChildren(element('h2', title));
  for (const line of lines) box.append(element('p', line));
  box.classList.toggle('error', error); box.hidden = false; box.focus();
}
function showProjection(report) {
  if (!report?.after) return;
  const before = report.before, after = report.after;
  const box = $('feedback'); box.append(element('h3', `${after.home} – ${after.away}`));
  const table = element('table', null, 'projection');
  const header = element('tr'); for (const text of ['Stima', 'Prima', 'Dopo']) header.append(element('th', text)); table.append(header);
  const number = (n, suffix = '') => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('it-IT', {maximumFractionDigits: 2}) + suffix : 'N/D';
  const rows = [
    ['Gol attesi casa', number(before?.expectedGoals.home), number(after.expectedGoals.home)],
    ['Gol attesi ospite', number(before?.expectedGoals.away), number(after.expectedGoals.away)],
    ['Probabilità 1', number(before?.probabilities.home, '%'), number(after.probabilities.home, '%')],
    ['Probabilità X', number(before?.probabilities.draw, '%'), number(after.probabilities.draw, '%')],
    ['Probabilità 2', number(before?.probabilities.away, '%'), number(after.probabilities.away, '%')],
    ['Risultato centrale', before?.score || 'N/D', after.score || 'N/D']
  ];
  for (const row of rows) {const tr = element('tr'); row.forEach(text => tr.append(element('td', text))); table.append(tr);}
  box.append(table); for (const text of after.limits) box.append(element('p', text, 'hint'));
}
function renderTeam(team) {
  return createTeamEditor(team, () => {dirty = true;});
}
function payload() {
  if (!current) throw Error('Scegli una partita disponibile.');
  return {fixtureId: current.fixture.id, revision: current.revision, status: $('status').value, note: $('note').value,
    teams: [...document.querySelectorAll('[data-team]')].map(readTeamEditor)};
}
function check() {
  const data = payload();
  for (const t of data.teams) {
    const name = current.teams.find(c => c.id === t.teamId).name;
    if (t.starters.length !== 11) throw Error(`${name}: seleziona esattamente 11 titolari (ora ${t.starters.length}).`);
    if (!t.formation) throw Error(`${name}: scegli il modulo.`);
  }
  return data;
}
function describe(data) {
  return data.teams.map(t => {
    const old = current.teams.find(c => c.id === t.teamId);
    const names = ids => ids.map(id => old.players.find(p => p.id === id)?.name || id).join(', ') || 'nessuno';
    return `${old.name}: ${t.starters.length} titolari, ${t.bench.length} in panchina. Entrano: ${names(t.starters.filter(id => !old.starters.includes(id)))}. Escono: ${names(old.starters.filter(id => !t.starters.includes(id)))}.`;
  });
}
function setBusy(value) {busy = value; for (const control of document.querySelectorAll('button,select,textarea,input')) control.disabled = value; if (!value) {$('calculate').disabled = !current?.fixture.canRecalculate; $('restore').disabled = !drafts.length;}}
async function loadFixture() {
  const request = ++generation; current = null; $('teams').replaceChildren(); $('feedback').hidden = true; $('calculate').disabled = true;
  if (!$('fixture').value) {$('scope').textContent = 'Nessuna partita futura disponibile.'; return;}
  try {
    const result = await api(`/api/fixture?id=${encodeURIComponent($('fixture').value)}`); if (request !== generation) return;
    current = result; $('teams').replaceChildren(...current.teams.map(renderTeam));
    $('status').value = current.teams.every(t => t.status === 'official') ? 'official' : 'probable';
    $('note').value = ''; dirty = false; selectedFixture = current.fixture.id; $('calculate').disabled = !current.fixture.canRecalculate;
    $('scope').textContent = current.fixture.canRecalculate ? 'Puoi salvare una bozza o avviare il ricalcolo in una copia isolata. Il sito pubblico rimane invariato.' : current.teams.some(t => t.unresolved.length) ? 'Puoi salvare una bozza. Il ricalcolo richiede prima la risoluzione delle identità mancanti indicate nelle squadre.' : 'Compilazione e salvataggio bozze disponibili. Il ricalcolo per questa giornata deve ancora essere collegato.';
    await loadDrafts(request);
  } catch (error) {feedback('Partita non caricata', [error.message], true);}
}
function chooseCompetition() {
  const choices = fixtures.filter(f => f.competition === $('competition').value);
  $('fixture').replaceChildren(...choices.map(f => {const opt = element('option', `${f.date.split('-').reverse().join('/')} · ${f.kickoff} · ${f.label} · G${f.matchday}`); opt.value = f.id; return opt;}));
  loadFixture();
}
async function loadDrafts(request = generation) {
  if (!current) return;
  const result = await api(`/api/drafts?fixtureId=${encodeURIComponent(current.fixture.id)}`);
  if (request !== generation) return;
  drafts = result.drafts;
  $('draft').replaceChildren(...(drafts.length ? drafts.map(d => {const opt = element('option', `${new Date(d.createdAt).toLocaleString('it-IT')} · ${d.status === 'official' ? 'Ufficiale' : 'Probabile'}`); opt.value = d.id; return opt;}) : [element('option', 'Nessuna bozza')]));
  $('restore').disabled = !drafts.length;
}
function discard() {return !dirty || window.confirm('Cambiare partita e scartare le modifiche non salvate?');}
$('competition').addEventListener('change', () => {if (!discard()) {$('competition').value = selectedCompetition; return;} selectedCompetition = $('competition').value; chooseCompetition();});
$('fixture').addEventListener('change', () => {if (!discard()) {$('fixture').value = selectedFixture; return;} loadFixture();});
$('restore').addEventListener('click', () => {
  const draft = drafts.find(d => d.id === $('draft').value);
  if (!draft || !current) return;
  if (draft.revision !== current.revision) return feedback('Bozza precedente ai dati attuali', ['La formazione canonica è cambiata. Ricompila usando i dati aggiornati.'], true);
  const teams = current.teams.map(team => {const saved = draft.teams.find(t => t.teamId === team.id); return {...team, ...saved};});
  $('teams').replaceChildren(...teams.map(renderTeam)); $('status').value = draft.status; $('note').value = draft.note;
  // Bench confirmation is deliberately requested again when resuming a draft.
  dirty = true; feedback('Bozza ripresa', ['Controlla nuovamente entrambe le panchine prima del ricalcolo.']);
});
for (const id of ['status', 'note']) $(id).addEventListener('change', () => {dirty = true;});
$('review').addEventListener('click', () => {try {const data = check(); feedback('Formazioni pronte al controllo', [...describe(data), data.status === 'official' ? 'Ufficiale: il filtro definitivo dei titolari sarà applicato nel ricalcolo.' : 'Probabile: non attiva il filtro definitivo dei titolari.']);} catch (error) {feedback('Controlla la formazione', [error.message], true);}});
$('save').addEventListener('click', async () => {try {const data = check(); setBusy(true); const result = await api('/api/draft', data); dirty = false; await loadDrafts(); feedback('Bozza salvata sul computer', [...describe(data), `Riferimento: ${result.id}. Nessuna modifica ai dati del sito.`]);} catch (error) {feedback('Bozza non salvata', [error.message], true);} finally {setBusy(false);}});
$('calculate').addEventListener('click', async () => {
  try {
    const data = check(); if (data.teams.some(t => !t.benchConfirmed)) throw Error('Verifica e conferma la panchina di entrambe le squadre.');
    setBusy(true); const job = await api('/api/recalculate', data); dirty = false;
    feedback('Ricalcolo in corso', ['Puoi attendere qui. Le pagine pubbliche non vengono modificate.']);
    let result = job;
    while (result.status === 'running') {await new Promise(resolve => setTimeout(resolve, 1800)); result = await api(`/api/job?id=${encodeURIComponent(job.id)}`);}
    feedback(result.status === 'completed' ? 'Ricalcolo locale completato' : 'Ricalcolo non completato', [result.message, ...(result.report?.error || result.error ? [result.report?.error || result.error] : []), `Registro: ${result.log}`], result.status !== 'completed');
    if (result.status === 'completed') showProjection(result.report);
  } catch (error) {feedback('Aggiornamento non avviato', [error.message], true);} finally {setBusy(false);}
});
window.addEventListener('beforeunload', event => {if (dirty || busy) {event.preventDefault(); event.returnValue = '';}});
api('/api/catalog').then(data => {fixtures = data.fixtures; token = data.token; chooseCompetition();}).catch(error => feedback('Pannello non disponibile', [error.message], true));
