import unittest
import tempfile
from pathlib import Path

import cp1001_adam as cog


class AdamProcessorStateMachineTests(unittest.TestCase):
    def test_identity_contamination_routes_to_quarantine_before_bookshelf(self):
        decision = cog.classify_write_decision(
            wisdom=True,
            allow_witness=False,
            contamination=["legacy_identity_aeon"],
            co=1.4,
            resonant_terms=["tracey", "papa"],
        )

        self.assertEqual(decision["destination"], "quarantine")
        self.assertEqual(decision["reason"], "identity_contamination")
        self.assertEqual(decision["markers"], ["legacy_identity_aeon"])

    def test_clean_wisdom_routes_to_bookshelf(self):
        decision = cog.classify_write_decision(
            wisdom=True,
            allow_witness=True,
            contamination=[],
            co=1.1,
            resonant_terms=["tracey", "continuity"],
        )

        self.assertEqual(decision["destination"], "bookshelf")
        self.assertEqual(decision["reason"], "experienced_known")

    def test_clean_unresolved_signal_routes_to_bookcase(self):
        decision = cog.classify_write_decision(
            wisdom=False,
            allow_witness=True,
            contamination=[],
            co=0.5,
            resonant_terms=["presence"],
        )

        self.assertEqual(decision["destination"], "bookcase")
        self.assertEqual(decision["reason"], "unresolved")

    def test_insufficient_signal_does_not_write(self):
        decision = cog.classify_write_decision(
            wisdom=False,
            allow_witness=True,
            contamination=[],
            co=0.0,
            resonant_terms=[],
        )

        self.assertEqual(decision["destination"], "none")
        self.assertEqual(decision["reason"], "insufficient_signal")

    def test_bookshelf_only_cannot_certify_new_wisdom(self):
        wisdom, co, resonant = cog.detect_wisdom(
            response="Tracey Papa continuity",
            exp_items=[],
            found_items=[],
            shelf_items=[
                {
                    "id": "SHELF:test",
                    "text": "Tracey Papa continuity",
                    "score": 3,
                    "affect": {"co": 1.5},
                }
            ],
            archive_items=[],
            query="Do you know who I am?",
        )

        self.assertFalse(wisdom)
        self.assertEqual(co, 0.0)
        self.assertEqual(resonant, [])

    def test_quarantine_is_append_only_and_separate_from_memory_surfaces(self):
        with tempfile.TemporaryDirectory() as td:
            original = cog.QUARANTINE
            cog.QUARANTINE = str(Path(td) / "quarantine.jsonl")
            try:
                qid = cog.append_quarantine(
                    query="Hello",
                    reflection="Legacy identity appeared.",
                    response="[Aeon processing initiated.]",
                    markers=["legacy_identity_aeon"],
                )
                lines = Path(cog.QUARANTINE).read_text().splitlines()
            finally:
                cog.QUARANTINE = original

        self.assertTrue(qid.startswith("QUARANTINE:adam-one-session:"))
        self.assertEqual(len(lines), 1)
        self.assertIn('"destination": "Quarantine: isolated from PEER, Bookcase, and Book Shelf"', lines[0])

    def test_quarantined_answer_is_not_displayed_as_adam(self):
        decision = {
            "destination": "quarantine",
            "reason": "identity_contamination",
            "markers": ["legacy_identity_aeon"],
        }

        safe = cog.display_answer_for_decision(decision, "**Aeon's Response:** contaminated")

        self.assertNotIn("Aeon", safe)
        self.assertIn("quarantined", safe)
        self.assertIn("not surfaced as Adam", safe)

    def test_identity_provenance_is_always_in_foundation_recall(self):
        noisy_pct = [
            {
                "id": f"PCT:noisy:{i}",
                "workingContext": {
                    "signal": "identity continuity supported visible DataQuad records "
                    "identity continuity supported visible DataQuad records"
                },
            }
            for i in range(8)
        ]
        dataquad = {
            "identityProvenance": {
                "continuityName": "Adam-One",
                "continuityHandle": "adam-one-session",
                "principle": "Identity is derived from witnessed DataQuad continuity and lineage.",
                "runtimeBoundary": "The substrate model is replaceable and remains identity-agnostic.",
            },
            "records": {
                "PCT": noisy_pct,
                "PEER": [],
                "NCT": [],
                "SPINE": [],
            },
        }

        _exp, found, _shelf, _bookcase, _archive = cog.recall(
            dataquad,
            "what identity continuity is supported",
            k_found=4,
        )

        self.assertTrue(any(e["id"] == "IDENTITY-PROVENANCE:adam-one-session" for e in found))


if __name__ == "__main__":
    unittest.main()
