import json
import math
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RULES = json.loads((ROOT / "config" / "rules.json").read_text(encoding="utf-8"))
LISTONE = json.loads((ROOT / "data" / "listone.json").read_text(encoding="utf-8"))
OUTPUT = json.loads((ROOT / "output" / "strategies.json").read_text(encoding="utf-8"))


class GeneratedOutputTests(unittest.TestCase):
    def test_listone_integrity(self):
        players = LISTONE["players"]
        self.assertEqual(len(players), 615)
        self.assertEqual(len({player["id"] for player in players}), 615)
        self.assertEqual(len({player["team"] for player in players}), 36)

    def test_strategy_constraints(self):
        listone_ids = {player["id"] for player in LISTONE["players"]}
        for strategy in OUTPUT["strategies"]:
            with self.subTest(strategy=strategy["strategy"]):
                roster = strategy["roster"]
                roster_ids = {player["id"] for player in roster}
                self.assertEqual(len(roster), RULES["squadSize"])
                self.assertEqual(len(roster_ids), RULES["squadSize"])
                self.assertTrue(roster_ids <= listone_ids)
                self.assertLessEqual(sum(player["initialQuote"] for player in roster), RULES["budget"])
                for role, minimum in RULES["minimumRoles"].items():
                    self.assertGreaterEqual(sum(player["role"] == role for player in roster), minimum)

                md2 = strategy["md2"]
                starters = md2["starters"]
                bench = md2["bench"]
                excluded = md2["excluded"]
                self.assertEqual(len(starters), RULES["starters"])
                self.assertEqual(len(bench), RULES["bench"])
                self.assertEqual(len(excluded), RULES["excluded"])
                self.assertEqual(
                    {player["id"] for player in starters + bench + excluded},
                    roster_ids,
                )
                requirements = RULES["formations"][md2["formation"]]
                for role, count in requirements.items():
                    self.assertEqual(sum(player["role"] == role for player in starters), count)
                for role in ("P", "D", "E", "C", "F", "A"):
                    self.assertTrue(any(player["role"] == role for player in bench))
                self.assertFalse(any(player["unavailableMD2"] for player in starters))
                self.assertTrue(all(strategy["validation"].values()))

    def test_numeric_outputs_are_finite_and_bounded(self):
        for strategy in OUTPUT["strategies"]:
            self.assertGreaterEqual(strategy["md2"]["fullElevenProbabilityPct"], 0)
            self.assertLessEqual(strategy["md2"]["fullElevenProbabilityPct"], 100)
            for player in strategy["roster"]:
                for field in ("md2VoteProbability", "generalVoteProbability"):
                    self.assertGreaterEqual(player[field], 0)
                    self.assertLessEqual(player[field], 1)
                for field in ("expectedPointsMD2", "expectedCumulativePoints", "riskScore"):
                    self.assertTrue(math.isfinite(player[field]))

    def test_every_player_has_league_matchday_projections(self):
        projections = json.loads((ROOT / "data" / "player-projections.json").read_text(encoding="utf-8"))
        for player in projections["players"]:
            with self.subTest(player=player["id"]):
                matchdays = player["leaguePhaseProjections"]
                self.assertEqual([item["matchday"] for item in matchdays], list(range(2, 9)))
                for item in matchdays:
                    self.assertTrue(math.isfinite(item["expectedPoints"]))
                    self.assertGreaterEqual(item["voteProbability"], 0)
                    self.assertLessEqual(item["voteProbability"], 1)


if __name__ == "__main__":
    unittest.main()
