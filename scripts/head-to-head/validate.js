const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/generated/head-to-head/first-leg-2026-27.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(root, "data/generated/head-to-head/import-report.json"), "utf8"));
const meetings = data.fixtures.flatMap(fixture => fixture.previousMeetings);

assert.equal(data.fixtures.length, 190, "Il girone di andata deve contenere 190 partite");
assert.equal(new Set(data.fixtures.map(fixture => fixture.pairKey)).size, 190, "Gli accoppiamenti devono essere unici");
assert.ok(data.fixtures.every(fixture => fixture.previousMeetings.length <= 5), "Non devono esserci più di 5 precedenti per partita");
assert.ok(data.fixtures.every(fixture => fixture.previousMeetings.every((meeting, index, rows) => index === 0 || new Date(rows[index - 1].date) >= new Date(meeting.date))), "I precedenti devono essere ordinati dal più recente");
assert.equal(meetings.length, report.importedHistoricalMatches, "Il totale importato deve coincidere con il report");
assert.ok(meetings.every(meeting => meeting.goals.every(goal => goal.player && goal.teamId)), "Ogni gol acquisito deve avere giocatore e squadra");
assert.ok(meetings.every(meeting => meeting.bookings.every(card => card.player && card.teamId)), "Ogni ammonizione acquisita deve avere giocatore e squadra");
assert.ok(meetings.every(meeting => meeting.source?.url && meeting.source?.retrievedAt), "Ogni precedente deve conservare fonte e data di recupero");
assert.deepEqual(report.errors, [], "L'importazione non deve contenere errori di rete/provider");
console.log(`OK scontri diretti: ${data.fixtures.length} partite di andata, ${meetings.length} precedenti, ${report.completeFixtures} accoppiamenti con copertura 5/5`);
