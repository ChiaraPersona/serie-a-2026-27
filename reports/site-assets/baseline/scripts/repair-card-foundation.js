"use strict";
// Idempotent canonical-source migration; never downloads, publishes or rewrites archives.
const fs = require('fs');
const {normalizeEvent,eventCounts,DISCIPLINARY_VERSION} = require('../js/pages/disciplinary.mjs');
const file = 'data/sources/match-results-2026-27.json';
const data = JSON.parse(fs.readFileSync(file));
const calendar = new Map(JSON.parse(fs.readFileSync('data/normalized/matches.json')).map(m => [m.id,m]));
let events = 0;
for (const result of data.matches) {
  const fixture = calendar.get(result.matchId);
  if (fixture?.competition !== 'serie-a' || result.status !== 'finished') continue;
  const context = {...result,homeTeam:fixture.homeTeam,awayTeam:fixture.awayTeam};
  result.bookings = result.bookings?.map(e => normalizeEvent(e,context));
  context.bookings = result.bookings;
  for (const side of ['home','away']) {
    const stats = result.teamStats?.[side]; if (!stats) continue;
    const evidence = eventCounts(context,fixture[`${side}Team`]);
    stats.providerDiscipline ??= {yellowCards:stats.yellowCards ?? null,dismissals:stats.straightRedCards ?? null,source:'pre-migration-provider-totals-not-a-red-classification'};
    Object.assign(stats,evidence.value,{disciplinaryAggregation:evidence});
  }
  result.disciplinaryVersion = DISCIPLINARY_VERSION;
  events += result.bookings?.length || 0;
}
data.disciplinaryInterpretation = {version:DISCIPLINARY_VERSION,yellowCards:'ordinary yellow event count',secondYellowCards:'second-yellow dismissal event count',straightRedCards:'direct red event count',sanctionCount:'ordinary yellow + 2 per combined second-yellow dismissal + direct red; not market points',unknownContext:'null/unknown, never inferred from a display minute'};
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log(`Canonical disciplinary migration: ${events} events preserved`);
// Repair only false zero totals with zero metric coverage in the existing rich
// derived archive. Never reconstruct or touch events/raw files.
const aggregatePath='data/generated/referee-stats/2023-24/aggregates.json';
const archived=JSON.parse(fs.readFileSync(aggregatePath));
let missingTotals=0;
for(const row of archived.referees)if(row.coverage?.yellowCards===0&&row.yellowCards!==null){row.yellowCards=null;missingTotals++;}
for(const row of archived.refereeTeams)if(row.yellowCoverage===0&&row.yellowCards!==null){row.yellowCards=null;missingTotals++;}
if(missingTotals)fs.writeFileSync(aggregatePath,JSON.stringify(archived,null,2)+'\n');
console.log(`Historical yellow totals with no coverage corrected to null: ${missingTotals}`);
