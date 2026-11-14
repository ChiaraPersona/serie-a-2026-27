"use strict";

const crypto = require("crypto");
const fs = require("fs");

const round = (value, digits = 6) => value == null ? null : Number(value.toFixed(digits));
const finite = value => Number.isFinite(value);
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const ratio = (total, matches, digits = 3) => matches ? round(total / matches, digits) : null;
const close = (actual, expected, tolerance) => finite(actual) && finite(expected) && Math.abs(actual - expected) <= tolerance;
const kickoffUtc = fixture => `${fixture.date}T${fixture.kickoff}:00+02:00`;
const matchKey = match => [match.date, match.homeTeamCode, match.awayTeamCode, match.homeGoals, match.awayGoals].join("|");

function sumSamples(samples) {
  const matches = samples.reduce((sum, row) => sum + row.matches, 0);
  const sum = key => samples.reduce((total, row) => total + (row[key]?.total ?? 0), 0);
  const yellowCards = sum("yellowCards");
  const redCards = sum("redCards");
  const fouls = sum("fouls");
  const penalties = sum("penalties");
  return {
    matches,
    yellowCards: { total: yellowCards, perMatch: ratio(yellowCards, matches) },
    redCards: { total: redCards, perMatch: ratio(redCards, matches) },
    totalCards: { total: yellowCards + redCards, perMatch: ratio(yellowCards + redCards, matches) },
    fouls: { total: fouls, perMatch: ratio(fouls, matches) },
    penalties: { total: penalties, perMatch: ratio(penalties, matches) }
  };
}

function validateRate(errors, label, actual, total, matches, tolerance) {
  const expected = matches ? total / matches : null;
  if (matches === 0 && actual !== null) errors.push(`${label}: expected null with zero matches`);
  if (matches > 0 && !close(actual, expected, tolerance)) errors.push(`${label}: ${actual} != ${round(expected, 6)}`);
}

function validateReferee(referee, kickoff) {
  const errors = [];
  const warnings = [];
  const rows = referee.seasonCompetitionSamples;

  for (const [index, row] of rows.entries()) {
    if (!Number.isInteger(row.matches) || row.matches < 0) errors.push(`sample[${index}].matches invalid`);
    validateRate(errors, `sample[${index}].yellowCards.perMatch`, row.yellowCards.perMatch, row.yellowCards.total, row.matches, 0.051);
    validateRate(errors, `sample[${index}].redCards.perMatch`, row.redCards.perMatch, row.redCards.total, row.matches, 0.051);
    validateRate(errors, `sample[${index}].fouls.perMatch`, row.fouls.perMatch, row.fouls.total, row.matches, 0.051);
    validateRate(errors, `sample[${index}].penalties.perMatch`, row.penalties.perMatch, row.penalties.total, row.matches, 0.00011);
  }

  for (const [groupKey, group] of Object.entries(referee.groupedSamples)) {
    const [periodScope, competitionGroup] = groupKey.split(":");
    const expected = sumSamples(rows.filter(row => row.periodScope === periodScope && row.competitionGroup === competitionGroup));
    for (const metric of ["yellowCards", "redCards", "totalCards", "fouls", "penalties"]) {
      if (group[metric].total !== expected[metric].total) errors.push(`${groupKey}.${metric}.total mismatch`);
      validateRate(errors, `${groupKey}.${metric}.perMatch`, group[metric].perMatch, group[metric].total, group.matches, 0.00051);
    }
    if (group.matches !== expected.matches) errors.push(`${groupKey}.matches mismatch`);
  }

  if (!close(referee.career.totalCards.perMatch, referee.career.yellowCards.perMatch + referee.career.redCards.perMatch, 0.011)) {
    errors.push("career.totalCards.perMatch is not yellow + red");
  }
  validateRate(errors, "career.penalties.perMatch", referee.career.penalties.perMatch, referee.career.penalties.total, referee.career.matches, 0.0051);
  if (referee.career.overCardFrequencies.over3_5.frequency !== null) errors.push("career.over3_5 must remain unavailable");
  for (const threshold of ["over4_5", "over5_5"]) {
    const row = referee.career.overCardFrequencies[threshold];
    if (!finite(row.frequency) || row.frequency < 0 || row.frequency > 1 || row.matches !== referee.career.matches) errors.push(`career.${threshold} invalid`);
  }

  const log = referee.last10.matchLog;
  const unique = new Set(log.map(matchKey));
  if (unique.size !== log.length) errors.push("last10 duplicate match");
  if (log.length !== referee.last10.matches || log.length !== 10) errors.push(`last10 size ${log.length}`);
  for (let index = 0; index < log.length; index += 1) {
    const match = log[index];
    if (match.totalCards !== match.yellowCards + match.redCards) errors.push(`last10[${index}].totalCards mismatch`);
    if (Date.parse(`${match.date}T23:59:59Z`) >= Date.parse(kickoff)) errors.push(`last10[${index}] is not strictly pre-kickoff`);
    if (index && match.date >= log[index - 1].date) errors.push(`last10 order invalid at ${index}`);
  }
  for (const metric of ["yellowCards", "redCards", "totalCards", "fouls", "penalties"]) {
    const total = log.reduce((sum, match) => sum + match[metric], 0);
    const row = referee.last10[metric];
    if (row.matches !== log.length || row.total !== total) errors.push(`last10.${metric} aggregate mismatch`);
    validateRate(errors, `last10.${metric}.perMatch`, row.perMatch, row.total, row.matches, 0.00051);
  }
  for (const [threshold, minimum] of [["over3_5", 4], ["over4_5", 5], ["over5_5", 6]]) {
    const row = referee.last10.overCardFrequencies[threshold];
    const hits = log.filter(match => match.totalCards >= minimum).length;
    if (row.matches !== log.length || row.hits !== hits || !close(row.frequency, hits / log.length, 1e-9)) errors.push(`last10.${threshold} mismatch`);
  }
  if (referee.last10.homeAwayCards !== null) errors.push("last10 home/away split must remain unavailable");

  const delta = rows.reduce((sum, row) => sum + row.matches, 0) - referee.career.matches;
  if (delta !== referee.sourceConsistency.matchesDelta) errors.push("sourceConsistency delta mismatch");
  if (referee.refereeId === "uefa-referee:sco:nicholas-walsh") {
    if (referee.career.matches !== 179 || rows.reduce((sum, row) => sum + row.matches, 0) !== 180 || delta !== 1) {
      errors.push("Nicholas Walsh 179/180 discrepancy changed");
    } else {
      warnings.push("Provider headline says 179 career matches while atomic rows sum to 180; preserved, not reconciled.");
    }
  } else if (delta !== 0) {
    errors.push(`unexpected career/atomic delta ${delta}`);
  }

  return { errors, warnings };
}

function featureRecord(fixture, assignment, referee, snapshot) {
  const currentUcl = referee.groupedSamples["current:champions-league"];
  const historicalUcl = referee.groupedSamples["historical:champions-league"];
  const kickoff = kickoffUtc(fixture);
  const raw = snapshot.files.find(file => file.path.endsWith(`/footymetrics/${referee.source.providerRefereeId}.html.gz`));
  const validation = validateReferee(referee, kickoff);
  const chronologyPass = Boolean(raw && Date.parse(raw.lastWriteTimeUtc) < Date.parse(kickoff));
  const identityPass = assignment.refereeId === referee.refereeId;
  return {
    fixtureId: fixture.fixtureId,
    fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
    kickoff,
    refereeId: referee.refereeId,
    referee: referee.name,
    sourceSnapshot: raw ? { path: raw.path, capturedAtUtc: raw.lastWriteTimeUtc, sha256: raw.sha256 } : null,
    chronology: { status: chronologyPass && !validation.errors.some(error => error.includes("pre-kickoff")) ? "PASS" : "FAIL", excludedPostKickoffObservations: validation.errors.filter(error => error.includes("pre-kickoff")).length },
    identity: { status: identityPass ? "PASS" : "FAIL", providerRefereeId: referee.source.providerRefereeId },
    samples: {
      currentChampionsLeague: currentUcl,
      historicalChampionsLeague: historicalUcl,
      career: referee.career,
      recent10: referee.last10
    },
    overlapPolicy: {
      additiveSamples: ["currentChampionsLeague", "historicalChampionsLeague"],
      nonAdditiveSamples: ["career", "recent10"],
      reason: "Career includes competition groups and recent10 overlaps career; recent form is a covariate, never an independent pool."
    },
    reliability: {
      status: chronologyPass && identityPass && validation.errors.length === 0 ? "ELIGIBLE_FOR_CALIBRATION" : "BLOCKED",
      numericScore: null,
      dimensions: {
        chronology: chronologyPass ? "PASS" : "FAIL",
        identity: identityPass ? "PASS" : "FAIL",
        archiveIntegrity: validation.errors.length ? "FAIL" : validation.warnings.length ? "PASS_WITH_DISCLOSED_SOURCE_ANOMALY" : "PASS",
        currentChampionsLeagueMatches: currentUcl.matches,
        historicalChampionsLeagueMatches: historicalUcl.matches,
        careerMatches: referee.career.matches,
        recentMatches: referee.last10.matches
      }
    },
    validation
  };
}

module.exports = { close, featureRecord, kickoffUtc, matchKey, ratio, sha256, sumSamples, validateReferee };
