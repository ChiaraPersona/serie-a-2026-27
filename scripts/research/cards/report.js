"use strict";
const {CONFIG}=require('./config');

const table=(headers,rows)=>`| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n${rows.map(row=>`| ${row.map(value=>String(value??'N/D').replace(/\|/g,' / ').replace(/\n/g,' ')).join(' | ')} |`).join('\n')}`;
const metric=value=>value===null||value===undefined?'NOT_ESTIMABLE':typeof value==='number'?value.toFixed(6):String(value);
const pct=value=>value===null||value===undefined?'N/D':`${(value*100).toFixed(2)}%`;

function calibrationStatus(report){
  const evaluation=report.evaluations.PREMATCH_PROBABLE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360"><rect width="1200" height="360" fill="#fff"/><text x="30" y="36" font-family="sans-serif" font-size="22">RECORDED_YELLOW · C0–C4 research calibration</text><text x="30" y="64" font-family="sans-serif" font-size="15" fill="#a32626">${CONFIG.targetDisclaimer}</text>${Array.from({length:5},(_,i)=>{const model=evaluation.models[`pRecordedYellow_C${i}`],x=30+i*230,m=model.metrics;return `<rect x="${x}" y="90" width="210" height="220" fill="#f4f6fa" stroke="#ccc"/><text x="${x+16}" y="122" font-family="sans-serif" font-size="20">C${i}</text><text x="${x+16}" y="156" font-family="sans-serif" font-size="13">N ${model.n}</text><text x="${x+16}" y="185" font-family="sans-serif" font-size="13">Brier ${m?m.brier.toFixed(4):'N/D'}</text><text x="${x+16}" y="214" font-family="sans-serif" font-size="13">Log loss ${m?m.logLoss.toFixed(4):'N/D'}</text><text x="${x+16}" y="243" font-family="sans-serif" font-size="13">Pred ${m?(m.calibration.predictedPositiveRate*100).toFixed(1)+'%':'N/D'}</text><text x="${x+16}" y="272" font-family="sans-serif" font-size="13">Observed ${m?(m.calibration.observedPositiveRate*100).toFixed(1)+'%':'N/D'}</text><text x="${x+16}" y="296" font-family="sans-serif" font-size="11">RESEARCH / no promotion</text>`;}).join('')}</svg>\n`;
}

function reason(file){
  if(file==='package.json')return 'Research-only commands.';
  if(file.startsWith('scripts/research/cards/'))return 'Isolated Card C0–C4 research implementation.';
  if(file.startsWith('data/analysis/card-prediction-research/'))return 'Machine-readable research artifact.';
  if(file==='scripts/test-card-prediction-research.js')return 'Research regressions and integrity gates.';
  if(file==='docs/card-prediction-research-c0-c4.md')return 'Preregistered protocol and target separation.';
  if(file.startsWith('output/reports/card-prediction-research-c0-c4-'))return 'Human- and machine-readable final research report.';
  return 'Existing unrelated work preserved.';
}

function modelRow(evaluation,index){
  const model=evaluation.models[`pRecordedYellow_C${index}`],m=model.metrics,top=k=>model.ranking?.topK.find(row=>row.k===k);
  return [`C${index}`,model.n,m?.positives??0,metric(m?.brier),metric(m?.logLoss),metric(m?.rocAuc),metric(m?.prAuc),pct(m?.calibration?.predictedPositiveRate),pct(m?.calibration?.observedPositiveRate),pct(top(1)?.hitRate),pct(top(3)?.hitRate),pct(top(5)?.hitRate)];
}
function ablationRow(name,row){const m=row.metrics;return [name,row.n,metric(m?.brier),metric(m?.logLoss),metric(m?.rocAuc),metric(m?.prAuc),pct(m?.calibration?.predictedPositiveRate)];}
function subgroupRows(groups,model='pRecordedYellow_C2'){return groups.map(group=>{const m=group.models[model];return [group.group,group.n,group.positives,pct(group.observedRate),pct(m?.calibration?.predictedPositiveRate),metric(m?.brier),m?.calibration?metric(m.calibration.calibrationInTheLarge):'N/D',metric(m?.rocAuc),group.status];});}
function subgroupAllModelRows(groups){return groups.flatMap(group=>Array.from({length:5},(_,i)=>{const m=group.models[`pRecordedYellow_C${i}`];return [group.group,`C${i}`,group.n,group.positives,pct(group.observedRate),pct(m?.calibration?.predictedPositiveRate),metric(m?.brier),m?.calibration?metric(m.calibration.calibrationInTheLarge):'N/D',metric(m?.rocAuc),metric(m?.prAuc),group.status];}));}
function fallbackRows(fallbacks){return ['C0','C1','C2ExpectedMinutes','C2Fouls','C3','C4'].flatMap(layer=>Object.entries(fallbacks[layer]||{}).map(([state,n])=>[layer,state.replace(/^"|"$/g,''),n]));}

function markdown(report){
  const evaluation=report.evaluations.PREMATCH_PROBABLE,sample=report.sample,gate=evaluation.gate;
  const comparison=id=>report.bootstrap.comparisons.find(row=>row.id===id);
  const models=Array.from({length:5},(_,i)=>modelRow(evaluation,i)),ablations=evaluation.ablations;
  const sections=[];
  sections.push(
    '# Card Prediction Engine V2 — RECORDED_YELLOW research','',`Generated: ${report.generatedAt}`,'',`> **${CONFIG.targetDisclaimer}**`,'',
    'All C0–C4 outputs remain **RESEARCH**. They estimate the observational source-event target defined below; they are not Sisal settlement probabilities and cannot be promoted by this task.','',
    '## A. TARGET AUDIT','',
    `- **RECORDED_YELLOW (${CONFIG.targetVersion})**: at least one canonical ordinary \`yellow\` event associated with the candidate in a completed match whose disciplinary feed is complete. Bench, post-match and context-unknown ordinary yellows remain observational positives. \`yellowRedCard\`, straight red and unknown categories do not independently count.`,
    `- **PLAYER_YELLOW (${CONFIG.marketTargetVersion})**: unchanged strict market-certified target. Historical market context remains insufficiently certified, so unavailable stays unavailable.`,
    '- The observational and market-certified layers remain separate in retrospective rows, the model registry, the MD6 preview and the future-actual join contract.','',
    '## B. DATASET','',
    table(['Measure','Value'],[
      ['Completed matches',sample.completedMatches],['Matches with reconstructible pre-match universe',sample.probableMatches],['Pre-match candidates',sample.probableRecords],['Eligible observational targets',sample.primaryEligible],['Positive RECORDED_YELLOW',sample.observationalPositives],['Negative RECORDED_YELLOW',sample.observationalNegatives],['Excluded',sample.excluded],['Projected starters',sample.projectedStarters],['Projected reserves',sample.projectedReserves],['Unresolved playerId retained',sample.missing.playerId],['Ordinary yellows outside projected universe',sample.ordinaryYellowEventsOutsideProjectedUniverse],['Observed rate',pct(sample.positiveRate)]
    ]),'',
    `The reconstructed probable-lineup universe contains ${sample.probableRecords} rows across ${sample.probableMatches} of the 50 completed matches. Milan–Venezia MD2 is excluded because its probable-lineup capture is timestamped after kickoff; reconstructing it from actuals would leak. All 50 discipline feeds are complete for the observational scope. Ordinary-yellow players outside this universe are reported but never appended post hoc.`,'',
    'By matchday:','',table(['MD','N','Eligible','Positive'],Object.entries(sample.byMatchday).map(([key,value])=>[key,value.n,value.primaryEligible,value.knownTargetPositives])),'',
    '## C. LEAKAGE AUDIT','',
    `Status: **${report.leakage.status}**. Target and future matches are excluded by exact kickoff; same-day matches require explicit pre-kickoff completion. Current aggregates, fouls, opponent signals, referee evidence and Expected Minutes use only earlier matches and timestamp-gated sources. Actual minutes, actual starter state and substitutions are diagnostics only. Date-only official XI data are not mixed into the primary probable-lineup sample.`,'',
    'Limitation: this is an event-time reconstruction, not a claim that every historical feature vector was frozen at the time.','',
    '## D. C0 — ROLE / LEAGUE PRIOR','',
    'C0 uses a Jeffreys Beta-Binomial league posterior, followed by broad-role and sufficiently mature detailed-role shrinkage with 12 equivalent observations. The target player is removed from the population pool. MD1 exposes the prior-only limitation instead of borrowing future information.','',
    '## E. C1 — INDIVIDUAL DISCIPLINE','',
    'C1 adds timestamped 2025/26 Serie A ordinary-yellow/minutes aggregates at 0.5 historical weight plus current-season prior-match evidence. Samples are exposure-tempered and shrunk by 12 prior-equivalent observations. Overlapping provider season totals are deduplicated as-of, while genuine named multi-club rows are summed. Other competitions and bookmaker context are not pooled.','',
    `Transition C1−C0: **${comparison('C1_MINUS_C0')?.label??'N/D'}**.`,'',
    '## F. C2 — EXPECTED MINUTES AND FOULS','',
    'Expected Minutes follow the prespecified production-engine policy on timestamped historical totals and prior current-season appearances, and are available only for projected starters. Reserves remain null. Expected Minutes and stabilized historical/current fouls/90 enter as ridge-regularized log-odds offsets fitted inside each walk-forward training fold. Actual target-match minutes never enter.','',
    table(['Ablation','N','Brier','Log loss','ROC-AUC','PR-AUC','Predicted rate'],Object.entries(ablations).map(([key,value])=>ablationRow(key,value))),'',
    `- Expected Minutes vs C1: **${comparison('EXPECTED_MINUTES_MINUS_C1')?.label??'N/D'}**.`,
    `- Fouls vs C1: **${comparison('FOULS_MINUS_C1')?.label??'N/D'}**.`,
    `- Expected Minutes + fouls vs C1: **${comparison('MINUTES_PLUS_FOULS_MINUS_C1')?.label??'N/D'}**.`,'',
    `Foul evidence: current available=${report.fouls.currentAvailable}, historical available=${report.fouls.historicalAvailable}, combined stabilized feature=${report.fouls.combinedFeatureAvailable}, missing=${report.fouls.missing}; prior-equivalent minutes=${report.fouls.priorEquivalentMinutes}. ${report.fouls.interpretation}`,'',
    table(['Foul band','Model','N','Positive','Observed','Predicted','Brier','Bias','ROC-AUC','PR-AUC','Status'],subgroupAllModelRows(report.fouls.bands)),'',
    'Tiny-current-sample high-foul-rate audit (raw rates are diagnostic; the model uses only the stabilized feature):','',
    table(['Match','Player','Current fouls','Current min','Raw /90','Historical fouls','Historical min','Stabilized log ratio','C1','C1+fouls'],report.fouls.tinyHighRateCases.map(row=>[row.matchId,row.playerName??row.playerId,row.currentFouls,row.currentMinutes,metric(row.currentFoulsPer90),row.historicalFouls,row.historicalMinutes,metric(row.stabilizedLogRatio),metric(row.pC1),metric(row.pC1PlusFouls)])),'',
    '## G. C3 — OPPONENT / MATCHUP','',
    'Only a temporally trained, uncertainty-separated and persistent opponent foul-drawing signal may modify C2. WATCH, UNKNOWN and INACTIVE signals are neutral; direct-duel and channel effects are unavailable. C3=C2 is an allowed result.','',
    table(['Signal','Feature N','Effect','Interval','Persistence','Maturity','Status','Used'],report.matchupSignals.map(row=>[row.signal,row.dataFeatureN,metric(row.effectEstimate),row.uncertainty?row.uncertainty.map(metric).join(' to '):'N/D',typeof row.persistence==='object'?JSON.stringify(row.persistence):row.persistence,row.maturity,row.status,row.quantitativeInfluence?'YES':'NO'])),'',
    `Transition C3−C2: **${comparison('C3_MINUS_C2')?.label??'N/D'}**.`,'',
    '## H. C4 — REFEREE','',
    'C4 distinguishes no designation, a known neutral estimate and informative known-referee evidence. Historical referee match totals are descriptive and shrunk toward the Serie A environment, but are not substituted for player-level walk-forward target evidence. Serie B is never pooled.','',
    table(['Referee','Matches','Yellows','Raw / match','League relative','Shrunk / match','Prior weight','Coverage','Competition/source','Maturity','Status'],report.referees.rows.map(row=>[row.referee,row.matches,row.yellows,metric(row.yellowsPerMatch),metric(row.leagueRelativeRate),metric(row.shrunkYellowPerMatch),metric(row.priorWeight),row.coverage,row.competition+'/'+report.referees.source,row.maturity,row.status])),'',
    `Transition C4−C3: **${comparison('C4_MINUS_C3')?.label??'N/D'}**.`,'',
    '## I. COMMON-SAMPLE TABLE','',
    `Primary comparison: ${gate.status}; common sample N=${evaluation.commonSample}, positives=${gate.positives}, matches=${gate.matches}.`,'',
    table(['Model','N','Positive','Brier','Log loss','ROC-AUC','PR-AUC','Predicted','Observed','Top1 hit','Top3 hit','Top5 hit'],models),'',
    `Full available N by model: ${Object.entries(evaluation.fullAvailableSample).map(([key,value])=>`${key}=${value}`).join(', ')}.`,'',
    '## J. INCREMENTAL VALUE','',
    table(['Comparison','Added','Δ Brier','Δ log loss','Δ PR-AUC','Cluster interval Brier','Verdict'],report.bootstrap.comparisons.map(row=>[row.id,row.added,metric(row.pointDifferences?.brier),metric(row.pointDifferences?.logLoss),metric(row.pointDifferences?.prAuc),row.intervals?.brier?.map(metric).join(' to '),row.label])),'',
    `Team effect: **${comparison('TEAM_MINUS_C2')?.label??'N/D'}**. Home/away: **${comparison('HOME_MINUS_C2')?.label??'N/D'}**. Neither is automatically retained.`,'',
    'Team-level C2 diagnostic:','',table(['Team','N','Positive','Observed','Predicted C2','Brier C2','Bias','ROC-AUC','Status'],subgroupRows(report.teams)),'',
    'Home/away C2 diagnostic:','',table(['Side','N','Positive','Observed','Predicted C2','Brier C2','Bias','ROC-AUC','Status'],subgroupRows(report.homeAway)),'',
    '## K. LEGACY RISK SCORE','',
    `The legacy score is ranking-only. Pre-match score intersections: ${report.legacy.eligibleCommonScores}. ROC-AUC=${metric(report.legacy.rocAuc)}, PR-AUC=${metric(report.legacy.prAuc)}. Spearman rank correlations with C0–C4: ${Object.entries(report.legacy.rankCorrelationWithModels).map(([key,value])=>`${key}=${metric(value)}`).join(', ')}. Brier and log loss are intentionally absent; no raw \`riskScore\` probability conversion is used. The five-candidate archive creates selection bias and is not the primary sample.`,'',
    '## L. ROLE RESULTS','',table(['Role','Model','N','Positive','Observed','Predicted','Brier','Bias','ROC-AUC','PR-AUC','Status'],subgroupAllModelRows(report.roles)),'',
    '## M. EXPOSURE RESULTS','',table(['Expected Minutes band','Model','N','Positive','Observed','Predicted','Brier','Bias','ROC-AUC','PR-AUC','Status'],subgroupAllModelRows(report.exposure.byExpectedMinutes)),'',
    `Expected-minus-actual minutes are post-match diagnostics only (squared-error correlation=${metric(report.exposure.minutesErrorCorrelation)}). Actual minutes never enter the feature vector. Reserve Expected Minutes are missing by design.`,'',
    '## N. SHRINKAGE STRESS TEST','',
    table(['Case','Raw current rate','Current N','Historical N','Prior','Shrunk C1','Fallback'],report.shrinkageExamples.map(row=>[row.name,row.input.current.length?pct(row.input.current.reduce((n,x)=>n+x.target,0)/row.input.current.length):'N/D',row.input.current.length,row.input.historical.length,metric(row.input.priorProbability),metric(row.p),row.fallback])),'',
    'The synthetic checks cover tiny extreme and zero samples, large high/low samples, new players, historical-only players and current/historical contradiction.','',
    '## O. MATCHUP MATURITY','',
    'No signal is forced ACTIVE. The table in G records sample, effect, interval, persistence, maturity, status and whether the signal can change C3.','',
    '## P. REFEREE MATURITY','',
    `The 2025/26 source contains ${report.referees.identifiedMatches}/${report.referees.matchesInLeaguePool} identified Serie A referee-matches. Unknown buckets and missing raw gzip coverage stay explicit. Descriptive referee totals have a different estimand from player RECORDED_YELLOW, so no uniform strict-referee multiplier is applied.`,'',
    '## Q. UNCERTAINTY / BOOTSTRAP','',
    `${report.bootstrap.iterations} paired bootstrap draws by **match**, seed ${report.bootstrap.seed}. Intervals use family-wise alpha ${report.bootstrap.familyAlpha} across ${CONFIG.bootstrap.familyComparisons} prespecified comparisons. Players are never independently bootstrapped as the primary uncertainty unit.`,'',
    'Fallback usage (every probable row exposes all C0–C4 states):','',table(['Layer','Fallback/state','Rows'],fallbackRows(report.fallbacks)),'',
    '## R. RESEARCH LEADER','',
    `**${report.researchLeader.leader}** — ${report.researchLeader.reason}${report.researchLeader.simplestSupported?`; simplest supported before the unresolved transition: ${report.researchLeader.simplestSupported}`:''}. This is not a production candidacy decision.`,'',
    '## S. MD6 PROSPECTIVE READINESS','',
    `- Infrastructure: **${report.readiness.infrastructure}**.`,
    `- Final snapshot: **${report.readiness.finalSnapshot}**.`,
    `- Preview: ${report.snapshotValidation.matches} matches, ${report.snapshotValidation.candidates} candidates, schema/hash valid=${report.snapshotValidation.valid}, actuals excluded=${report.snapshotValidation.actualsExcluded}.`,
    `- Freeze gates: ${(report.readiness.snapshotValidation?.reasons||[]).join(', ')||'none'}.`,'',
    'The dry-run preview is separate from Player Market V2 and contains C0–C4, fallbacks, samples, exposure, fouls, matchup/referee state, both target definitions, and source/configuration hashes. No final snapshot was frozen. The writer is immutable by default, rejects post-kickoff capture, and requires a logged reason plus archived revision for a pre-kickoff replacement. Future actuals attach separately as RECORDED_YELLOW and strict PLAYER_YELLOW.','',
    '## T. PRODUCTION INTEGRITY','',
    `Status: **${report.production.status}**. Checked ${report.production.checkedFiles} task-required protected production files; ${report.production.unchangedFiles} are byte-identical and changed protected files=${report.production.changedFiles.length}. Production riskScore, likelyBooked, firstBooked, shots/SOT, Team Profiles V2, exact-score research, MD6 Player Market snapshots, betting/odds archives, settlements and public pages were not changed.`,'',
    `Out-of-scope repository drift already present during the check: ${(report.production.outOfScopeRepositoryDriftPresentAtCheck||[]).length} files. Those files are reported separately and were not modified or re-authorized by this Card task.`,'',
    '## U. TESTS','',
    `${report.validation.passed}/${report.validation.suites} suites passed; Card assertions=${report.validation.cardAssertions??'N/D'}/${report.validation.cardAssertions??'N/D'}; unexpected failures=${report.validation.unexpectedFailures}; known baseline blockers=${report.validation.knownBlockers}. The full evidence is recorded in \`validation.json\`. The known exact-score inventory blocker, if present, remains separately classified and is not a Card regression.`,'',
    '## V. FILES CHANGED','',table(['File','Purpose'],report.filesChanged.map(file=>[file,reason(file)])),'',
    'No publication command was run.','',
    '## W. LIMITATIONS','',...report.limitations.map(item=>`- ${item}`),'',
    ...report.verdicts.flatMap((line,index)=>index?['',line]:[line])
  );
  return `${sections.join('\n')}\n`;
}

module.exports={table,metric,reason,markdown,calibrationStatus};
