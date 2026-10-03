# Card data and targets v1 — Phase 1, 3 October 2026

This is a data specification. The legacy card-risk formula, referee/duel coefficients, team model, shots/SOT and exact-score models are frozen. No calibrated Card V2 probability exists.

## Canonical events and counts

`js/pages/disciplinary.mjs` is the shared definition used by the importer, canonical migration, features, actuals, settlement and renderer. See `data/schemas/disciplinary-event.schema.json`.

| `eventType` | Meaning | Event count | Physical sanctions represented | Standard Sisal points contribution |
|---|---|---:|---:|---:|
| `yellow` | Ordinary yellow | 1 | 1 | 1 when eligible |
| `yellowRedCard` | Combined second-yellow dismissal | 1 | 2: second yellow and ensuing dismissal | 1 for ensuing dismissal; second yellow excluded |
| `redCard` | Direct red | 1 | 1 | 1 when eligible |
| `unknown` | Exact classification unresolved | Observed event retained | Unknown | Unavailable |

The previous ordinary yellow plus a combined dismissal are **two event records, three physical sanctions, two market points** under the specified standard rule. The totals `yellowCards`, `secondYellowCards`, `straightRedCards` now count their respective event categories. Provider totals, which can use a different convention, remain in `providerDiscipline`. They do not override an explicit event's dismissal cause.

Names and existing compatibility fields `player`, `card`, `team` remain. Normalized fields include `playerId`, `playerName`, `teamId`, minute, added time, period, event order, participation status, `onPitchAtEvent`, `benchEvent`, `postMatchEvent`, source, original type, classification confidence and context provenance. Missing clock/context stays null/unknown. Display minute alone does **not** establish period, post-final-whistle state or chronological order. The importer retains `sourceClock` when supplied. Known raw period tokens are mapped explicitly; unrecognized tokens stay unknown.

Sabelli is retained as an `UNUSED` participant with `onPitchAtEvent:false` and bench classification derived from the verified non-used roster (`contextSource:verified-didNotPlay`). This describes the unused bench participant, not an independently recorded physical location. Minute 85 does not fabricate `postMatchEvent:false`.

## Coverage

- `COMPLETE`: the relevant feed is explicitly complete and the expected array exists. An empty array can certify zero events in that feed's scope.
- `PARTIAL`: some events/components are known; the final total/outcome is unknown.
- `UNAVAILABLE`: the provider explicitly reports unavailability, or an array claimed complete is absent.
- `UNKNOWN`: no sufficient coverage declaration exists. `available` alone is not a disciplinary completeness certificate.

Event classification completeness and market context completeness are distinct. A complete card feed can still yield an unavailable market outcome. All-context rules additionally require `disciplinaryScope:ALL_CONTEXTS`.

`componentAggregate` returns final value or null, known subtotal/components and missing components. Team totals, standings, comparator, current features, referee aggregates and point settlement preserve coverage. No partial sum is presented as a complete total. Referee rates require a complete metric denominator; zero-covered historic totals are null.

## Targets

`targetVersion:card-targets-v1` is explicit and separate from engine versions. Target plus market rule ID form the evaluable contract; a target name alone does not establish bookmaker eligibility.

| Target | Positive outcome | Distinct requirements |
|---|---|---|
| `PLAYER_YELLOW` | At least one eligible **ordinary** yellow | A `yellowRedCard` alone does not satisfy this intentionally narrow target; straight red does not count. |
| `PLAYER_ANY_CARD` | At least one eligible yellow, second-yellow dismissal or direct red | Known market period, bench/post-match policy, identity and participation. |
| `PLAYER_DUO_CARD` | Named player **OR his direct qualifying replacement** receives an eligible card | Complete substitution feed, unique replacement identity and defined eligibility. Incoming predecessor's cards and further replacement chains are not silently included. No DUO probability formula is supplied. |
| `FIRST_BOOKED_PLAYER` | Player receiving earliest eligible ordinary yellow | Full eligible universe, actual pitch/substitution state, clock, added time and official event order. Minute ties return a set of IDs unless official order resolves them; rank 1 is not a probability. |
| `TEAM_CARD_POINTS` | Exact eligible points under a named rule | Separate from individual targets and from `bookings.length`; per-player cap and team scope explicit. |

The standard points rule uses 1 for ordinary yellow, 1 for combined second-yellow dismissal, 1 for direct red, maximum 2 per player, regulation time only including injury time. Bench, already replaced players and post-final-whistle cards are excluded. Unknown context blocks a final total, preserving known eligible components.

Rules for individual/DUO on-pitch periods including extra time are distinct from the expressly named Sisal variant including bench, shootout and post-match cards. The abbreviated local market `CARTELLINO SI/NO (DUO) INC TS` has **no automatic eligibility mapping**: new settlement requires an explicit `cardRuleId`. The on-pitch and all-context contracts remain separate choices; the label is not evidence that either variant applies. This mapping must be confirmed against each future bookmaker variant before producing a research snapshot or a production target probability. Unsupported variants return unavailable. An explicit all-context rule requires a correspondingly certified feed. The future snapshot `marketRuleId` remains null until a rule is chosen.

Source consulted on 3 October 2026: [Sisal football rules](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf), printed pages 428–429 for card points and 233–234 for the specifically named all-context DUO variant. This is not automatic certification of every abbreviated feed market.

## Settlement and preserved history

`settleLeg` performs strict current checks. A missing, partial or unknown feed, unknown rule/context, ambiguous identity, insufficient participation or substitution data returns `unavailable` with a reason. No card YES/NO is inferred from missing events. Verified non-participation can produce void only under a defined market rule and sufficient evidence.

Completed archived picks/odds/results are protected. `card-settlement-records-2026-10-03.json` records 25 pre-change disciplinary outcomes from the existing local settlement, with source slip/index and an explicit legacy basis. It is **not** a historical prediction snapshot or a current target certification. `settleArchivedLeg` exposes that recorded outcome separately from `currentCheck`, with `reviewRequired`. The archive UI preserves previously completed results, annotating the cases the strict new checks cannot certify. New picks without a legacy record use strict settlement. Tests of archived counts preserve their original expected counts; strict safety tests are independent.

## Features, identities and exposure

Current features include appearances, starts, minutes, ordinary yellows, second-yellow dismissals, direct reds, matches with any recorded card, card events/90, ordinary yellows/90, committed fouls and fouls/90, suffered fouls where known, disciplinary/participation sample sizes and coverage. The feature target is `ALL_RECORDED_CONTEXTS_DATA_ONLY`, not bookmaker points or on-pitch market eligibility. Missing exposure never produces a rate; null discipline totals retain observed components. Identity fallback is explicitly marked. IDs are canonical; verified source aliases are accepted only uniquely and canonical IDs prevent duplicate candidates. No aliases or IDs are invented.

Current-feature construction for a pre-match candidate excludes the target, future matchdays and unfinished matches. It is attached as `cardResearchFeatures`, not read by the legacy risk formula. Expected minutes and substitution risk reference serialized Player Market V2 values. Starting probability and expected-minutes reliability remain null where no such field is serialized; no reliability conversion is fabricated.

## Referees and missing raw data

Normalized ESPN data distinguish dataset matches, identified referees, usable yellow coverage and usable complete disciplinary coverage. Per-referee denominators exclude unidentified referees. The descriptive reading pool uses its attributable complete-yellow sample: 2,853 / 720 = 3.9625. The Prediction Engine's separate Serie A-only pool is frozen and must not inherit a descriptive-pool correction.

The reading-profile builder retains preexisting rich event tendencies when raw files are absent and labels their provenance/coverage accordingly; it fails closed if a necessary retained profile is unavailable. It never replaces rich event distributions with a zero-event reconstruction. The 2,900 retained yellow events and 2,853 team totals are not forced equal. Serie B 2023/24 has 760 missing team yellow fields; only the false zero totals in the existing derived archive are corrected to null. Missing raw `.json.gz` files remain an explicit reconstruction/validation blocker.

## Research snapshots and actuals

`card-snapshot.schema.json` specifies a separate future snapshot envelope, with candidate identity, team/opponent, roles, XI, exposure, historical/current samples, fouls, referee status/evidence, duel evidence, legacy score, target/rule version, coverage, generated timestamp and cutoff. `calibratedProbability` must be **null** in `DATA_ONLY_NO_VALIDATED_CARD_MODEL`. No snapshot writer or historical backfill is enabled.

`card-actuals.schema.json` and `cardActuals` provide a separate target-versioned join: ordinary yellow, second-yellow dismissal, direct red, qualifying player card, first qualifying minute, participation/minutes, pitch/bench/post-match counts, rule-specific team points, normalized events, coverage and eligibility reason. Unknown fields stay null. Existing Player Market snapshots and their manifest are untouched.

## Legacy probability conversions

Three production paths retain `clamp(riskScore / 150, 0.18, 0.62)` for compatibility: Serie A card selection generator, Serie A schedina builder and Champions schedina builder. Future outputs are marked `HEURISTIC_UNVALIDATED_INDIVIDUAL_PROXY_FOR_DUO`, with calibrated probability null. Their reciprocals, odds products and EV arithmetic are preserved as legacy calculations, not statistically validated card probabilities or advantage. The distinct yellow-baseline-to-card-points Poisson path is also marked unvalidated. UI labels and first-booked semantics are explicit for both current and archived data, without rewriting archived numerical payloads.
