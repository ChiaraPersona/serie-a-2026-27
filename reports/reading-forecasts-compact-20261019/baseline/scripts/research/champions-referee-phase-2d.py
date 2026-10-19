#!/usr/bin/env python3
"""Phase 2D confirmatory referee-effect experiment with a locked final holdout."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/analysis/champions/referee-phase-2d/dataset"
OUT = ROOT / "data/analysis/champions/referee-phase-2d"
PHASE2C_PATH = Path(__file__).with_name("champions-referee-phase-2c.py")
spec = importlib.util.spec_from_file_location("phase2c", PHASE2C_PATH)
p2c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p2c)

DEVELOPMENT_FOLDS = [
    {"id": "dev-1", "train": ["2021-22"], "validation": "2022-23"},
    {"id": "dev-2", "train": ["2021-22", "2022-23"], "validation": "2023-24"},
    {"id": "dev-3", "train": ["2021-22", "2022-23", "2023-24"], "validation": "2024-25"},
]
FINAL_TRAIN = ["2021-22", "2022-23", "2023-24", "2024-25"]
FINAL_HOLDOUT = "2025-26"
SHRINKAGE = [None, 20.0, 40.0, 80.0, 160.0, 320.0, 640.0, 1280.0]
BOOTSTRAP = 1000


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(name, value):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows_for_seasons(rows, seasons):
    allowed = set(seasons)
    return [row for row in rows if row["season"] in allowed]


def attach_refs(rows, ref_by_match):
    return [dict(row, _refereeId=ref_by_match[row["matchId"]]) for row in rows]


def candidate_specs(rows, level):
    candidates = [
        {"model": "poisson", "featureSet": "compact", "alpha": 0.0},
        {"model": "poisson", "featureSet": "extended", "alpha": 0.0},
    ]
    fold_train = [rows_for_seasons(rows, fold["train"]) for fold in DEVELOPMENT_FOLDS]
    if all(p2c.dispersion_identifiable(part, level) for part in fold_train):
        for feature_set in p2c.FEATURE_SETS:
            for alpha in p2c.ALPHAS:
                candidates.append({"model": "negative_binomial", "featureSet": feature_set, "alpha": alpha})
    return candidates


def fit_spec(specification, train, level):
    return p2c.fit_glm(train, level, specification["featureSet"], specification["model"], specification["alpha"])


def record_from_mean(row, level, fold_id, label, model, mean):
    observed = p2c.target(row, level)
    item = {
        "matchId": row["matchId"], "season": row["season"], "kickoffUtc": row["kickoffUtc"], "foldId": fold_id,
        "level": level, "target": "totalCards", "model": label, "family": model["kind"],
        "alpha": round(float(model.get("alpha", 0.0)), 8), "featureSet": model.get("featureSet"),
        "observed": int(observed), "predictedMean": round(float(mean), 10),
        "negativeLogScore": round(-p2c.logpmf(observed, mean, model["kind"], model.get("alpha", 0.0)), 10),
        "overProbabilities": {f"over{threshold}.5": round(p2c.over_probability(mean, threshold, model["kind"], model.get("alpha", 0.0)), 10) for threshold in p2c.THRESHOLDS},
    }
    if level == "team": item.update({"teamId": row["uefaTeamId"], "teamName": row["teamName"], "homeAway": row["homeAway"]})
    return item


def prediction_records(model, rows, level, fold_id, label, means=None):
    if means is None: means = p2c.predict(model, rows, level)
    return [record_from_mean(row, level, fold_id, label, model, mean) for row, mean in zip(rows, means)]


def dev_predictions(specification, rows, level):
    output = []
    for fold in DEVELOPMENT_FOLDS:
        train = rows_for_seasons(rows, fold["train"])
        validation = rows_for_seasons(rows, [fold["validation"]])
        model = fit_spec(specification, train, level)
        output.extend(prediction_records(model, validation, level, fold["id"], "candidate_no_referee"))
    return output


def choose_no_referee(rows, level):
    evaluated = []
    for candidate in candidate_specs(rows, level):
        predictions = dev_predictions(candidate, rows, level)
        evaluated.append({"specification": candidate, "metrics": p2c.rounded(p2c.metrics(predictions)), "predictions": predictions})
    selected = min(evaluated, key=lambda item: (item["metrics"]["logScore"], item["metrics"]["mae"], json.dumps(item["specification"], sort_keys=True)))
    return selected, evaluated


def adjusted_means(model, train, validation, level, shrinkage):
    base = p2c.predict(model, validation, level)
    if shrinkage is None:
        history = referee_history(train)
        return base, history, {}
    effects, history = p2c.referee_effects(model, train, level, shrinkage)
    return base * np.array([effects.get(row["_refereeId"], 1.0) for row in validation]), history, effects


def referee_history(rows):
    grouped = defaultdict(set)
    for row in rows: grouped[row["_refereeId"]].add(row["matchId"])
    return Counter({key: len(value) for key, value in grouped.items()})


def choose_shrinkage(specification, rows, level):
    evaluated = []
    for shrinkage in SHRINKAGE:
        predictions = []
        for fold in DEVELOPMENT_FOLDS:
            train = rows_for_seasons(rows, fold["train"])
            validation = rows_for_seasons(rows, [fold["validation"]])
            model = fit_spec(specification, train, level)
            means, _, _ = adjusted_means(model, train, validation, level, shrinkage)
            predictions.extend(prediction_records(model, validation, level, fold["id"], "referee_candidate", means))
        evaluated.append({"shrinkage": "NULL_EFFECT" if shrinkage is None else shrinkage, "metrics": p2c.rounded(p2c.metrics(predictions)), "predictions": predictions})
    selected = min(evaluated, key=lambda item: (item["metrics"]["logScore"], item["metrics"]["mae"], str(item["shrinkage"])))
    finite = min((item for item in evaluated if item["shrinkage"] != "NULL_EFFECT"), key=lambda item: (item["metrics"]["logScore"], item["metrics"]["mae"]))
    return selected, finite, evaluated


def prior_discipline_score(row, level):
    pm = row["preMatchFeatures"]
    keys = ("homeTeamPriorUcl", "awayTeamPriorUcl") if level == "match" else ("teamPriorUcl", "opponentPriorUcl")
    values = []
    for key in keys:
        prior = pm[key]
        if prior.get("usable") and prior.get("values") and prior["values"].get("totalCardsPerMatch") is not None:
            values.append(float(prior["values"]["totalCardsPerMatch"]))
    return sum(values) if len(values) == 2 else None


def discipline_cutpoints(train, level):
    values = [prior_discipline_score(row, level) for row in train]
    values = np.array([value for value in values if value is not None], dtype=float)
    return [float(np.quantile(values, 1 / 3)), float(np.quantile(values, 2 / 3))]


def discipline_bucket(value, cutpoints):
    if value is None: return "missing"
    if value <= cutpoints[0]: return "low"
    if value <= cutpoints[1]: return "medium"
    return "high"


def history_bucket(n):
    return "0" if n == 0 else "1-2" if n <= 2 else "3-5" if n <= 5 else "6-10" if n <= 10 else "11+"


def decorate(records, source_rows, history, evidence, cutpoints, level):
    def identity(row): return (row["matchId"], row.get("uefaTeamId"), row.get("homeAway"))
    source = {identity(row): row for row in source_rows}
    for record in records:
        key = (record["matchId"], record.get("teamId"), record.get("homeAway"))
        row = source[key]; referee = row["_refereeId"]; ev = evidence[row["matchId"]]
        record.update({
            "refereeId": referee, "refereePriorMatches": history.get(referee, 0), "refereeHistoryBucket": history_bucket(history.get(referee, 0)),
            "priorDisciplineScore": prior_discipline_score(row, level), "priorDisciplineBucket": discipline_bucket(prior_discipline_score(row, level), cutpoints),
            "designationTemporalStatus": ev["status"], "designationUsablePreKickoff": ev["horizons"]["preKickoff"], "designationUsableAdvance48h": ev["horizons"]["advance48h"],
        })
    return records


def segment_metrics(records, field, ordered_values):
    output = {}
    for value in ordered_values:
        part = [row for row in records if row.get(field) == value]
        if part: output[str(value)] = p2c.rounded(p2c.metrics(part))
    return output


def compare(a, b):
    return p2c.paired_difference_ci(a, b, iterations=BOOTSTRAP)


def subset(records, predicate):
    return [row for row in records if predicate(row)]


def result_block(records):
    return {"metrics": p2c.rounded(p2c.metrics(records)), "uncertainty95": p2c.bootstrap_ci(records, iterations=BOOTSTRAP)}


def robust_verdict(comparison, b_segments, a_segments):
    log_robust = comparison["logScore_B_minus_A"]["high"] < 0
    brier_robust = sum(comparison[f"brier_over{threshold}.5_B_minus_A"]["high"] < 0 for threshold in p2c.THRESHOLDS)
    major_worsening = False
    for group in ("refereeHistory", "priorDiscipline"):
        for key in set(a_segments[group]) & set(b_segments[group]):
            if b_segments[group][key]["logScore"] - a_segments[group][key]["logScore"] > 0.02:
                major_worsening = True
    passed = log_robust and brier_robust >= 2 and not major_worsening
    return {"passed": passed, "logScoreImprovementRobust": log_robust, "robustBrierThresholds": brier_robust, "substantialSegmentWorsening": major_worsening}


def main():
    matches_doc = read(DATA / "match-totals.json"); teams_doc = read(DATA / "team-cards.json")
    matches = matches_doc["matches"]; teams = teams_doc["rows"]
    evidence_doc = read(OUT / "designation-evidence.json"); evidence = {row["matchId"]: row for row in evidence_doc["rows"]}
    ref_by_match = {row["matchId"]: row["refereeId"] for row in matches}
    matches = attach_refs(matches, ref_by_match); teams = attach_refs(teams, ref_by_match)
    predictions_output = []; level_results = {}

    for level, rows in (("match", matches), ("team", teams)):
        selected_a, candidates = choose_no_referee(rows, level)
        selected_b, best_finite, shrinkage_candidates = choose_shrinkage(selected_a["specification"], rows, level)
        final_train = rows_for_seasons(rows, FINAL_TRAIN); final_test = rows_for_seasons(rows, [FINAL_HOLDOUT])
        cutpoints = discipline_cutpoints(final_train, level)
        history = referee_history(final_train)

        historical = p2c.fit_historical(final_train, level)
        h = prediction_records(historical, final_test, level, "final-holdout", "historical_baseline")
        model_a = fit_spec(selected_a["specification"], final_train, level)
        a = prediction_records(model_a, final_test, level, "final-holdout", "no_referee")

        selected_k = None if selected_b["shrinkage"] == "NULL_EFFECT" else float(selected_b["shrinkage"])
        b_means, _, _ = adjusted_means(model_a, final_train, final_test, level, selected_k)
        b = prediction_records(model_a, final_test, level, "final-holdout", "referee_selected", b_means)
        finite_k = float(best_finite["shrinkage"])
        finite_means, _, _ = adjusted_means(model_a, final_train, final_test, level, finite_k)
        bf = prediction_records(model_a, final_test, level, "final-holdout", "referee_best_finite", finite_means)

        for records in (h, a, b, bf): decorate(records, final_test, history, evidence, cutpoints, level)
        predictions_output.extend(h + a + b + bf)

        a_segments = {
            "refereeHistory": segment_metrics(a, "refereeHistoryBucket", ["0", "1-2", "3-5", "6-10", "11+"]),
            "priorDiscipline": segment_metrics(a, "priorDisciplineBucket", ["low", "medium", "high", "missing"]),
        }
        b_segments = {
            "refereeHistory": segment_metrics(b, "refereeHistoryBucket", ["0", "1-2", "3-5", "6-10", "11+"]),
            "priorDiscipline": segment_metrics(b, "priorDisciplineBucket", ["low", "medium", "high", "missing"]),
        }
        ab = compare(a, b)
        pre_h, pre_a, pre_b = [subset(records, lambda row: row["designationUsablePreKickoff"]) for records in (h, a, b)]
        advance_h, advance_a, advance_b = [subset(records, lambda row: row["designationUsableAdvance48h"]) for records in (h, a, b)]

        dev_a = selected_a["predictions"]
        dev_b = selected_b["predictions"]
        level_results[level] = {
            "sample": {"developmentRows": len(dev_a), "finalTrainRows": len(final_train), "finalHoldoutRows": len(final_test), "finalHoldoutMatches": len({row["matchId"] for row in final_test})},
            "selectionOnDevelopmentOnly": {
                "noRefereeCandidates": [{"specification": item["specification"], "metrics": item["metrics"]} for item in candidates],
                "selectedNoReferee": selected_a["specification"],
                "shrinkageCandidates": [{"shrinkage": item["shrinkage"], "metrics": item["metrics"]} for item in shrinkage_candidates],
                "selectedShrinkage": selected_b["shrinkage"], "bestFiniteShrinkage": best_finite["shrinkage"],
            },
            "developmentOos": {
                "noReferee": p2c.rounded(p2c.metrics(dev_a)), "refereeSelected": p2c.rounded(p2c.metrics(dev_b)),
                "bySeasonNoReferee": p2c.segments(dev_a)["bySeason"], "bySeasonReferee": p2c.segments(dev_b)["bySeason"],
            },
            "finalHoldout": {
                "historical": result_block(h), "noReferee": result_block(a), "refereeSelected": result_block(b), "refereeBestFinite": result_block(bf),
                "comparisons95": {"noRefereeMinusHistorical": compare(h, a), "refereeMinusNoReferee": ab, "refereeMinusHistorical": compare(h, b)},
                "segments": {"noReferee": a_segments, "referee": b_segments},
                "horizons": {
                    "preKickoff": {"n": len(pre_a), "historical": p2c.rounded(p2c.metrics(pre_h)), "noReferee": p2c.rounded(p2c.metrics(pre_a)), "referee": p2c.rounded(p2c.metrics(pre_b)), "comparison95": compare(pre_a, pre_b)},
                    "advance48h": {"n": len(advance_a), "historical": p2c.rounded(p2c.metrics(advance_h)), "noReferee": p2c.rounded(p2c.metrics(advance_a)), "referee": p2c.rounded(p2c.metrics(advance_b)), "inference": "WITHHELD_SMALL_SAMPLE"},
                },
                "decisionCriterion": robust_verdict(ab, b_segments, a_segments),
            },
        }

    split_plan = {
        "schemaVersion": 1, "phase": "2D", "policy": "All selection and tuning use development folds only. The complete 2025-26 season is evaluated once after specifications are locked.",
        "developmentFolds": DEVELOPMENT_FOLDS, "finalTrainSeasons": FINAL_TRAIN, "finalHoldoutSeason": FINAL_HOLDOUT,
        "historicalCaveat": "The 2025-26 season was previously reported in Phase 2C; it is untouched by Phase 2D tuning but is not a never-before-seen organizational holdout.",
    }
    write("split-plan.json", split_plan)
    output = {
        "schemaVersion": 1, "phase": "2D", "status": "RESEARCH_ONLY_NOT_INTEGRATED",
        "provenance": {
            "datasetHashes": {name: digest(DATA / name) for name in ("match-totals.json", "team-cards.json", "quality-report.json")},
            "designationEvidenceSha256": digest(OUT / "designation-evidence.json"), "phase2cCodeSha256": digest(PHASE2C_PATH),
            "bootstrapSeed": p2c.SEED, "bootstrapIterations": BOOTSTRAP,
        },
        "dataset": {"matches": len(matches), "teamRows": len(teams), "seasons": dict(Counter(row["season"] for row in matches)), "competition": "UEFA Champions League only"},
        "splitPlan": split_plan, "designationCoverage": evidence_doc["summary"], "results": level_results,
        "marketVerdicts": {
            "refereeEffect": "DO_NOT_ACTIVATE",
            "matchTotalCards": "BASELINE_RESEARCH_READY_NOT_PUBLICATION_READY",
            "teamCards": "BASELINE_RESEARCH_READY_HIGH_TEAM_OVERS_BLOCKED",
            "individualCards": "BLOCKED_NO_TIMESTAMP_CERTIFIED_PARTICIPANT_UNIVERSE",
        },
        "competitionInteraction": "NOT_IDENTIFIABLE_SINGLE_COMPETITION_DATASET",
        "publicationGuard": "No output is authorized for active predictions, UI, readings or betslips.",
    }
    write("calibration-results.json", p2c.rounded(output))
    write("final-holdout-predictions.json", {"schemaVersion": 1, "phase": "2D", "rows": predictions_output})
    print(f"Phase 2D: {len(matches)} matches; final holdout {FINAL_HOLDOUT} = {len([row for row in matches if row['season'] == FINAL_HOLDOUT])} matches")
    for level in ("match", "team"):
        result = level_results[level]
        h = result["finalHoldout"]["historical"]["metrics"]; a = result["finalHoldout"]["noReferee"]["metrics"]; b = result["finalHoldout"]["refereeSelected"]["metrics"]
        print(f"{level}: k={result['selectionOnDevelopmentOnly']['selectedShrinkage']} H/A/B log={h['logScore']:.4f}/{a['logScore']:.4f}/{b['logScore']:.4f}; verdict={result['finalHoldout']['decisionCriterion']['passed']}")


if __name__ == "__main__":
    main()
