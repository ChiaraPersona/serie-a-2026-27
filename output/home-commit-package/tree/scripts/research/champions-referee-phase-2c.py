#!/usr/bin/env python3
"""Phase 2C: leakage-safe card baselines and retrospective referee experiment."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
IN_DIR = ROOT / "data/analysis/champions/referee-phase-2b"
OUT_DIR = ROOT / "data/analysis/champions/referee-phase-2c"
SEED = 20261013
THRESHOLDS = (3, 4, 5)  # integer form of Over 3.5, 4.5, 5.5
ALPHAS = (0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.5)
SHRINKAGE_K = (2.0, 5.0, 10.0, 20.0, 40.0, 80.0)
FEATURE_SETS = ("compact", "extended")


def load(name):
    return json.loads((IN_DIR / name).read_text(encoding="utf-8"))


def write_json(name, value):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def finite(value):
    return value is not None and math.isfinite(float(value))


def prior_values(prior):
    if prior and prior.get("usable") and isinstance(prior.get("values"), dict):
        return prior["values"], float(prior.get("matches", 0)), 0.0
    return {}, 0.0, 1.0


def feature_vector(row, level, feature_set):
    pm = row["preMatchFeatures"]
    if level == "match":
        left, ln, lm = prior_values(pm["homeTeamPriorUcl"])
        right, rn, rm = prior_values(pm["awayTeamPriorUcl"])
        home = None
    else:
        left, ln, lm = prior_values(pm["teamPriorUcl"])
        right, rn, rm = prior_values(pm["opponentPriorUcl"])
        home = 1.0 if row["homeAway"] == "home" else 0.0
    values = [left.get("totalCardsPerMatch"), right.get("totalCardsPerMatch"), lm, rm]
    names = ["team_a_prior_total_cards", "team_b_prior_total_cards", "team_a_missing", "team_b_missing"]
    if level == "team":
        values.append(home)
        names.append("is_home")
    if feature_set == "extended":
        values += [
            left.get("yellowCardsPerMatch"), right.get("yellowCardsPerMatch"),
            left.get("foulsPerMatch"), right.get("foulsPerMatch"),
            left.get("penaltiesPerMatch"), right.get("penaltiesPerMatch"),
            math.log1p(ln), math.log1p(rn),
        ]
        names += [
            "team_a_prior_yellows", "team_b_prior_yellows",
            "team_a_prior_fouls", "team_b_prior_fouls",
            "team_a_prior_penalties", "team_b_prior_penalties",
            "log_team_a_prior_matches", "log_team_b_prior_matches",
        ]
    return values, names


class Transformer:
    def fit(self, raw):
        arr = np.array([[np.nan if not finite(v) else float(v) for v in row] for row in raw], dtype=float)
        self.medians = np.nanmedian(arr, axis=0)
        self.medians = np.where(np.isfinite(self.medians), self.medians, 0.0)
        filled = np.where(np.isnan(arr), self.medians, arr)
        self.means = filled.mean(axis=0)
        self.scales = filled.std(axis=0)
        self.scales = np.where(self.scales > 1e-9, self.scales, 1.0)
        return self

    def transform(self, raw):
        arr = np.array([[np.nan if not finite(v) else float(v) for v in row] for row in raw], dtype=float)
        filled = np.where(np.isnan(arr), self.medians, arr)
        z = (filled - self.means) / self.scales
        return np.column_stack([np.ones(len(z)), z])


def target(row, level, name="totalCards"):
    return float(row["cards"][name] if level == "match" else row[name])


def raw_matrix(rows, level, feature_set):
    vectors = [feature_vector(row, level, feature_set)[0] for row in rows]
    return vectors


def fit_glm(train_rows, level, feature_set, family, alpha=0.0, target_name="totalCards"):
    transformer = Transformer().fit(raw_matrix(train_rows, level, feature_set))
    x = transformer.transform(raw_matrix(train_rows, level, feature_set))
    y = np.array([target(row, level, target_name) for row in train_rows])
    beta = np.zeros(x.shape[1]); beta[0] = math.log(max(float(y.mean()), 1e-5))
    ridge = np.eye(x.shape[1]) * 1e-6; ridge[0, 0] = 0.0
    converged = False
    for _ in range(150):
        eta = np.clip(x @ beta, -8.0, 8.0)
        mu = np.exp(eta)
        variance = mu if family == "poisson" else mu + alpha * mu * mu
        weights = np.maximum(mu * mu / variance, 1e-8)
        z = eta + (y - mu) / np.maximum(mu, 1e-8)
        lhs = x.T @ (weights[:, None] * x) + ridge
        rhs = x.T @ (weights * z)
        try:
            updated = np.linalg.solve(lhs, rhs)
        except np.linalg.LinAlgError:
            updated = np.linalg.lstsq(lhs, rhs, rcond=None)[0]
        if np.max(np.abs(updated - beta)) < 1e-8:
            beta = updated; converged = True; break
        beta = updated
    return {"kind": family, "alpha": alpha, "featureSet": feature_set, "transformer": transformer, "beta": beta, "converged": converged}


def fit_historical(train_rows, level, target_name="totalCards"):
    values = [target(row, level, target_name) for row in train_rows]
    return {"kind": "historical_mean_poisson", "mean": max(float(np.mean(values)), 1e-6), "alpha": 0.0, "featureSet": None, "converged": True}


def predict(model, rows, level):
    if model["kind"] == "historical_mean_poisson":
        return np.full(len(rows), model["mean"])
    x = model["transformer"].transform(raw_matrix(rows, level, model["featureSet"]))
    return np.exp(np.clip(x @ model["beta"], -8.0, 8.0))


def logpmf(y, mu, family, alpha):
    mu = max(float(mu), 1e-10); y = int(y)
    if family in ("poisson", "historical_mean_poisson"):
        return y * math.log(mu) - mu - math.lgamma(y + 1)
    r = 1.0 / alpha
    return math.lgamma(y + r) - math.lgamma(r) - math.lgamma(y + 1) + r * math.log(r / (r + mu)) + y * math.log(mu / (r + mu))


def over_probability(mu, threshold, family, alpha):
    cumulative = sum(math.exp(logpmf(y, mu, family, alpha)) for y in range(threshold + 1))
    return min(1.0, max(0.0, 1.0 - cumulative))


def prediction_rows(model, rows, level, fold_id, model_name, target_name="totalCards"):
    means = predict(model, rows, level)
    output = []
    for row, mu in zip(rows, means):
        observed = target(row, level, target_name)
        item = {
            "matchId": row["matchId"], "season": row["season"], "kickoffUtc": row["kickoffUtc"],
            "foldId": fold_id, "level": level, "target": target_name, "model": model_name,
            "family": model["kind"], "alpha": round(float(model.get("alpha", 0.0)), 8),
            "featureSet": model.get("featureSet"), "observed": int(observed), "predictedMean": round(float(mu), 10),
            "negativeLogScore": round(-logpmf(observed, mu, model["kind"], model.get("alpha", 0.0)), 10),
            "overProbabilities": {f"over{t}.5": round(over_probability(mu, t, model["kind"], model.get("alpha", 0.0)), 10) for t in THRESHOLDS},
        }
        if level == "team":
            item.update({"teamId": row["uefaTeamId"], "teamName": row["teamName"], "homeAway": row["homeAway"]})
        output.append(item)
    return output


def mean_log_score(model, rows, level, target_name="totalCards"):
    means = predict(model, rows, level)
    return float(np.mean([-logpmf(target(r, level, target_name), mu, model["kind"], model.get("alpha", 0.0)) for r, mu in zip(rows, means)]))


def inner_split(train_rows, level):
    seasons = sorted({row["season"] for row in train_rows})
    if len(seasons) > 1:
        validation_season = seasons[-1]
        return [r for r in train_rows if r["season"] != validation_season], [r for r in train_rows if r["season"] == validation_season]
    match_order = sorted({(r["kickoffUtc"], r["matchId"]) for r in train_rows})
    kickoff_values = sorted({item[0] for item in match_order})
    cutoff = kickoff_values[max(1, int(len(kickoff_values) * 0.7)) - 1]
    left = [r for r in train_rows if r["kickoffUtc"] <= cutoff]
    right = [r for r in train_rows if r["kickoffUtc"] > cutoff]
    return left, right


def dispersion_identifiable(rows, level, target_name="totalCards"):
    y = np.array([target(r, level, target_name) for r in rows])
    return len(y) >= 40 and float(np.var(y, ddof=1)) > float(np.mean(y)) * 1.05


def tune_models(train_rows, level, target_name="totalCards"):
    inner_train, inner_val = inner_split(train_rows, level)
    tuning = {"innerTrainN": len(inner_train), "innerValidationN": len(inner_val), "candidates": []}
    historical = fit_historical(inner_train, level, target_name)
    tuning["candidates"].append({"model": "historical", "featureSet": None, "alpha": 0.0, "logScore": mean_log_score(historical, inner_val, level, target_name)})
    for feature_set in FEATURE_SETS:
        poisson = fit_glm(inner_train, level, feature_set, "poisson", target_name=target_name)
        tuning["candidates"].append({"model": "poisson", "featureSet": feature_set, "alpha": 0.0, "logScore": mean_log_score(poisson, inner_val, level, target_name), "converged": poisson["converged"]})
    nb_ok = dispersion_identifiable(inner_train, level, target_name)
    if nb_ok:
        for feature_set in FEATURE_SETS:
            for alpha in ALPHAS:
                model = fit_glm(inner_train, level, feature_set, "negative_binomial", alpha, target_name)
                tuning["candidates"].append({"model": "negative_binomial", "featureSet": feature_set, "alpha": alpha, "logScore": mean_log_score(model, inner_val, level, target_name), "converged": model["converged"]})
    tuning["negativeBinomialIdentifiable"] = nb_ok
    best_by_kind = {}
    for kind in ("historical", "poisson", "negative_binomial"):
        candidates = [c for c in tuning["candidates"] if c["model"] == kind]
        if candidates:
            best_by_kind[kind] = min(candidates, key=lambda c: (c["logScore"], str(c["featureSet"]), c["alpha"]))
    tuning["selectedByKind"] = best_by_kind
    tuning["selectedOverall"] = min(best_by_kind.values(), key=lambda c: (c["logScore"], c["model"]))
    return tuning


def ref_map(match_rows):
    return {row["matchId"]: row["refereeId"] for row in match_rows}


def attach_ref(rows, refs):
    return [dict(row, _refereeId=refs[row["matchId"]]) for row in rows]


def fit_selected(spec, rows, level, target_name="totalCards"):
    if spec["model"] == "historical":
        return fit_historical(rows, level, target_name)
    return fit_glm(rows, level, spec["featureSet"], spec["model"], spec["alpha"], target_name)


def referee_effects(model, rows, level, k, target_name="totalCards"):
    means = predict(model, rows, level)
    observed = defaultdict(float); expected = defaultdict(float); games = Counter()
    seen_matches = defaultdict(set)
    for row, mu in zip(rows, means):
        ref = row["_refereeId"]
        observed[ref] += target(row, level, target_name); expected[ref] += float(mu)
        seen_matches[ref].add(row["matchId"])
    effects = {ref: (observed[ref] + k) / (expected[ref] + k) for ref in observed}
    games.update({ref: len(ids) for ref, ids in seen_matches.items()})
    return effects, games


def referee_adjusted_predictions(model, rows, level, effects):
    means = predict(model, rows, level)
    return means * np.array([effects.get(row["_refereeId"], 1.0) for row in rows])


def mean_log_score_adjusted(model, rows, level, means, target_name="totalCards"):
    return float(np.mean([-logpmf(target(r, level, target_name), mu, model["kind"], model.get("alpha", 0.0)) for r, mu in zip(rows, means)]))


def calibration_bins(preds, key, bins=5):
    ordered = sorted(preds, key=lambda p: p["overProbabilities"][key])
    chunks = np.array_split(np.array(ordered, dtype=object), bins)
    output = []
    for chunk in chunks:
        if not len(chunk): continue
        probs = [p["overProbabilities"][key] for p in chunk]
        threshold = int(key.replace("over", "").split(".")[0])
        obs = [1.0 if p["observed"] > threshold else 0.0 for p in chunk]
        output.append({"n": len(chunk), "meanPredicted": round(float(np.mean(probs)), 6), "observedRate": round(float(np.mean(obs)), 6)})
    return output


def metrics(preds):
    y = np.array([p["observed"] for p in preds], dtype=float)
    mu = np.array([p["predictedMean"] for p in preds], dtype=float)
    result = {"n": len(preds), "mae": float(np.mean(np.abs(y - mu))), "logScore": float(np.mean([p["negativeLogScore"] for p in preds])), "meanObserved": float(np.mean(y)), "meanPredicted": float(np.mean(mu)), "thresholds": {}}
    for t in THRESHOLDS:
        key = f"over{t}.5"; prob = np.array([p["overProbabilities"][key] for p in preds]); obs = (y > t).astype(float)
        bins = calibration_bins(preds, key)
        result["thresholds"][key] = {
            "n": len(preds), "events": int(obs.sum()), "observedRate": float(obs.mean()), "meanPredicted": float(prob.mean()),
            "brier": float(np.mean((prob - obs) ** 2)),
            "ece5": float(sum(b["n"] * abs(b["meanPredicted"] - b["observedRate"]) for b in bins) / len(preds)), "calibrationBins": bins,
        }
    return result


def rounded(value):
    if isinstance(value, float): return round(value, 6)
    if isinstance(value, dict): return {k: rounded(v) for k, v in value.items()}
    if isinstance(value, list): return [rounded(v) for v in value]
    return value


def bootstrap_ci(preds, iterations=500):
    rng = np.random.default_rng(SEED)
    groups = defaultdict(list)
    for p in preds: groups[p["matchId"]].append(p)
    ids = sorted(groups); samples = defaultdict(list)
    for _ in range(iterations):
        chosen = rng.choice(ids, len(ids), replace=True)
        sample = [p for match_id in chosen for p in groups[match_id]]
        m = metrics(sample)
        samples["mae"].append(m["mae"]); samples["logScore"].append(m["logScore"])
        for t in THRESHOLDS: samples[f"brier_over{t}.5"].append(m["thresholds"][f"over{t}.5"]["brier"])
    return {key: {"low": round(float(np.quantile(vals, .025)), 6), "high": round(float(np.quantile(vals, .975)), 6)} for key, vals in samples.items()}


def paired_difference_ci(a_preds, b_preds, iterations=500, allow_common=False):
    def key(p): return (p["matchId"], p.get("teamId"), p.get("homeAway"))
    a = {key(p): p for p in a_preds}; b = {key(p): p for p in b_preds}
    if set(a) != set(b):
        if not allow_common: raise ValueError("A/B prediction identity mismatch")
        common = set(a) & set(b)
        a = {k: a[k] for k in common}; b = {k: b[k] for k in common}
    by_match = defaultdict(list)
    for k in sorted(a): by_match[k[0]].append(k)
    ids = sorted(by_match); rng = np.random.default_rng(SEED + 1); samples = defaultdict(list)
    for _ in range(iterations):
        chosen = rng.choice(ids, len(ids), replace=True)
        ap = [a[k] for match_id in chosen for k in by_match[match_id]]; bp = [b[k] for match_id in chosen for k in by_match[match_id]]
        am, bm = metrics(ap), metrics(bp)
        samples["mae_B_minus_A"].append(bm["mae"] - am["mae"]); samples["logScore_B_minus_A"].append(bm["logScore"] - am["logScore"])
        for t in THRESHOLDS:
            name = f"over{t}.5"; samples[f"brier_{name}_B_minus_A"].append(bm["thresholds"][name]["brier"] - am["thresholds"][name]["brier"])
    result = {key: {"low": round(float(np.quantile(vals, .025)), 6), "high": round(float(np.quantile(vals, .975)), 6), "median": round(float(np.median(vals)), 6)} for key, vals in samples.items()}
    result["comparisonSample"] = {"rows": len(a), "matches": len(ids)}
    return result


def adjusted_prediction_rows(model, rows, level, fold_id, effects, history_counts, evidence, target_name="totalCards"):
    means = referee_adjusted_predictions(model, rows, level, effects)
    output = []
    for row, mu in zip(rows, means):
        observed = target(row, level, target_name); ev = evidence[row["matchId"]]; n = history_counts.get(row["_refereeId"], 0)
        bucket = "0" if n == 0 else "1-2" if n <= 2 else "3-5" if n <= 5 else "6-10" if n <= 10 else "11+"
        item = {
            "matchId": row["matchId"], "season": row["season"], "kickoffUtc": row["kickoffUtc"], "foldId": fold_id,
            "level": level, "target": target_name, "model": "referee_hierarchical", "family": model["kind"],
            "alpha": round(float(model.get("alpha", 0.0)), 8), "featureSet": model.get("featureSet"), "observed": int(observed),
            "predictedMean": round(float(mu), 10), "negativeLogScore": round(-logpmf(observed, mu, model["kind"], model.get("alpha", 0.0)), 10),
            "overProbabilities": {f"over{t}.5": round(over_probability(mu, t, model["kind"], model.get("alpha", 0.0)), 10) for t in THRESHOLDS},
            "refereeId": row["_refereeId"], "refereePriorMatches": n, "refereeHistoryBucket": bucket,
            "designationTemporalStatus": ev["status"], "designationUsablePreKickoff": ev["horizons"]["preKickoff"], "designationUsableAdvance48h": ev["horizons"]["advance48h"],
        }
        if level == "team": item.update({"teamId": row["uefaTeamId"], "teamName": row["teamName"], "homeAway": row["homeAway"]})
        output.append(item)
    return output


def baseline_prediction_rows(model, rows, level, fold_id, evidence, history_counts=None, target_name="totalCards"):
    output = prediction_rows(model, rows, level, fold_id, "baseline_no_referee", target_name)
    refs = {r["matchId"]: r["_refereeId"] for r in rows}
    for item in output:
        ev = evidence[item["matchId"]]
        item.update({"refereeId": refs[item["matchId"]], "designationTemporalStatus": ev["status"], "designationUsablePreKickoff": ev["horizons"]["preKickoff"], "designationUsableAdvance48h": ev["horizons"]["advance48h"]})
        if history_counts is not None:
            n = history_counts.get(item["refereeId"], 0)
            item["refereePriorMatches"] = n
            item["refereeHistoryBucket"] = "0" if n == 0 else "1-2" if n <= 2 else "3-5" if n <= 5 else "6-10" if n <= 10 else "11+"
    return output


def segments(preds):
    result = {"bySeason": {}, "byRefereeHistory": {}, "designationCertifiedSubset": {}}
    for season in sorted({p["season"] for p in preds}): result["bySeason"][season] = rounded(metrics([p for p in preds if p["season"] == season]))
    if preds and "refereeHistoryBucket" in preds[0]:
        for bucket in ("0", "1-2", "3-5", "6-10", "11+"):
            subset = [p for p in preds if p["refereeHistoryBucket"] == bucket]
            if subset: result["byRefereeHistory"][bucket] = rounded(metrics(subset))
    for horizon, field in (("preKickoff", "designationUsablePreKickoff"), ("advance48h", "designationUsableAdvance48h")):
        subset = [p for p in preds if p.get(field)]
        result["designationCertifiedSubset"][horizon] = rounded(metrics(subset)) if subset else {"n": 0}
    return result


def main():
    matches_doc = load("match-totals.json"); teams_doc = load("team-cards.json"); splits = load("rolling-origin-splits.json")["folds"]
    matches = matches_doc["matches"]; teams = teams_doc["rows"]
    evidence_doc = json.loads((OUT_DIR / "designation-evidence.json").read_text(encoding="utf-8")); evidence = {r["matchId"]: r for r in evidence_doc["rows"]}
    refs = ref_map(matches); matches_by_id = {r["matchId"]: r for r in matches}; teams_by_match = defaultdict(list)
    for row in teams: teams_by_match[row["matchId"]].append(row)
    all_predictions = []; tuning_records = []; experiment = {}
    for level in ("match", "team"):
        level_baselines = defaultdict(list); a_all = []; b_all = []; fold_experiments = []
        for fold in splits:
            train_ids = set(fold["trainMatchIds"]); test_ids = set(fold["validationMatchIds"])
            if level == "match":
                train = [matches_by_id[x] for x in fold["trainMatchIds"]]; test = [matches_by_id[x] for x in fold["validationMatchIds"]]
            else:
                train = [r for match_id in fold["trainMatchIds"] for r in teams_by_match[match_id]]; test = [r for match_id in fold["validationMatchIds"] for r in teams_by_match[match_id]]
            train = attach_ref(train, refs); test = attach_ref(test, refs)
            tuning = tune_models(train, level); tuning_records.append({"level": level, "foldId": fold["id"], **tuning})
            for kind, spec in tuning["selectedByKind"].items():
                model = fit_selected(spec, train, level)
                name = "negative_binomial" if kind == "negative_binomial" else "poisson" if kind == "poisson" else "historical"
                level_baselines[name].extend(prediction_rows(model, test, level, fold["id"], name))

            inner_train, inner_val = inner_split(train, level)
            overall_spec = tuning["selectedOverall"]
            inner_model = fit_selected(overall_spec, inner_train, level)
            k_scores = []
            for k in SHRINKAGE_K:
                effects, _ = referee_effects(inner_model, inner_train, level, k)
                val_means = referee_adjusted_predictions(inner_model, inner_val, level, effects)
                k_scores.append({"k": k, "logScore": mean_log_score_adjusted(inner_model, inner_val, level, val_means)})
            best_k = min(k_scores, key=lambda r: (r["logScore"], r["k"]))["k"]
            model_a = fit_selected(overall_spec, train, level); effects, history = referee_effects(model_a, train, level, best_k)
            a_preds = baseline_prediction_rows(model_a, test, level, fold["id"], evidence, history)
            b_preds = adjusted_prediction_rows(model_a, test, level, fold["id"], effects, history, evidence)
            a_all.extend(a_preds); b_all.extend(b_preds)
            fold_experiments.append({
                "foldId": fold["id"], "trainN": len(train), "testN": len(test), "selectedBaseline": overall_spec,
                "shrinkageTuning": {"innerTrainN": len(inner_train), "innerValidationN": len(inner_val), "candidates": k_scores, "selectedK": best_k},
                "baselineMetrics": rounded(metrics(a_preds)), "refereeMetrics": rounded(metrics(b_preds)),
            })
        baseline_results = {}
        for name, preds in level_baselines.items():
            baseline_results[name] = {"metrics": rounded(metrics(preds)), "uncertainty95": bootstrap_ci(preds), "bySeason": segments(preds)["bySeason"]}
            all_predictions.extend(preds)
        baseline_comparisons = {}
        names = sorted(level_baselines)
        for i, left in enumerate(names):
            for right in names[i + 1:]:
                baseline_comparisons[f"{right}_minus_{left}"] = paired_difference_ci(level_baselines[left], level_baselines[right], allow_common=True)
        experiment[level] = {
            "scope": "RETROSPECTIVE_ALL_OOS; STRICT_PREMATCH_ONLY_WHERE_DESIGNATION_CERTIFIED",
            "folds": fold_experiments,
            "baselineA": {"metrics": rounded(metrics(a_all)), "uncertainty95": bootstrap_ci(a_all), "segments": segments(a_all)},
            "refereeB": {"metrics": rounded(metrics(b_all)), "uncertainty95": bootstrap_ci(b_all), "segments": segments(b_all)},
            "pairedDifference95": paired_difference_ci(a_all, b_all),
        }
        experiment[level]["baselines"] = baseline_results
        experiment[level]["baselinePairedComparisons95"] = baseline_comparisons
        all_predictions.extend(a_all); all_predictions.extend(b_all)

    # Separate descriptive targets; never merged into totalCards.
    target_summary = {}
    for level, rows in (("match", matches), ("team", teams)):
        target_summary[level] = {}
        for name in ("yellowCards", "secondYellowCards", "directRedCards", "totalCards"):
            vals = np.array([target(r, level, name) for r in rows])
            mean = float(vals.mean()); variance = float(np.var(vals, ddof=1))
            target_summary[level][name] = {"n": len(vals), "sum": int(vals.sum()), "mean": round(mean, 6), "variance": round(variance, 6), "dispersionIndex": round(variance / mean, 6) if mean else None, "zeroRate": round(float(np.mean(vals == 0)), 6)}

    provenance = {
        "inputs": {name: sha256(IN_DIR / name) for name in ("match-totals.json", "team-cards.json", "rolling-origin-splits.json")},
        "designationEvidenceSha256": sha256(OUT_DIR / "designation-evidence.json"), "seed": SEED, "bootstrapIterations": 500,
    }
    result = {
        "schemaVersion": 1, "phase": "2C", "status": "RESEARCH_ONLY_NOT_INTEGRATED", "provenance": provenance,
        "data": {"historicalMatches": len(matches), "teamRows": len(teams), "outerOosMatches": len({p["matchId"] for p in all_predictions if p["model"] == "baseline_no_referee"}), "outerOosTeamRows": len([p for p in all_predictions if p["model"] == "baseline_no_referee" and p["level"] == "team"])},
        "featurePolicy": {
            "allowed": ["strictly-prior UCL team card rate", "strictly-prior UCL team yellow rate", "strictly-prior UCL team foul rate", "strictly-prior UCL team penalty rate", "strictly-prior match count", "home/away indicator (team model)"],
            "excluded": ["current-match events/statistics", "actual lineups/participants", "actual minutes", "post-match roles", "referee aggregates updated with current/future match"],
            "missingness": "Training-fold median imputation plus explicit prior-unavailable indicators; transformer fit inside each fold.",
        },
        "targetDefinitions": load("quality-report.json")["targetDefinitions"], "targetSummary": target_summary,
        "tuning": tuning_records, "results": experiment,
        "interpretationGuard": "Referee B is retrospective on the full OOS set. Only rows whose designation evidence satisfies a named horizon can support horizon-specific pre-match claims. No probabilities are publication-ready.",
    }
    write_json("calibration-results.json", rounded(result))
    write_json("oos-predictions.json", {"schemaVersion": 1, "seed": SEED, "rows": all_predictions})
    print(f"Phase 2C calibrated: {len(matches)} matches; OOS 503 matches / 1006 team rows")
    for level in ("match", "team"):
        a = experiment[level]["baselineA"]["metrics"]; b = experiment[level]["refereeB"]["metrics"]
        print(f"{level}: A log={a['logScore']:.4f} MAE={a['mae']:.4f}; B log={b['logScore']:.4f} MAE={b['mae']:.4f}")


if __name__ == "__main__":
    main()
