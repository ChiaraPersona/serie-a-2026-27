# Card research snapshots

Phase 1 defines contracts only. This directory contains no prediction payloads and no retrospective snapshots.

Use `data/schemas/card-snapshot.schema.json` and `scripts/card-research-contracts.js` for future research. `calibratedProbability` is required and must be null while `modelState` is `DATA_ONLY_NO_VALIDATED_CARD_MODEL`. Capture a real pre-kickoff cutoff, target/market rule version, provenance, player identity, exposure and sample coverage. Future capture must be immutable and hash checked, using a separate manifest and never modifying Player Market snapshots. No Card V2 estimator or snapshot writer is enabled.

Actuals are a separate join under `card-actuals.schema.json`: never patch the pre-match payload. Unknown context/outcomes remain null, and target-specific eligibility can remain unavailable even when event classification coverage is complete.
