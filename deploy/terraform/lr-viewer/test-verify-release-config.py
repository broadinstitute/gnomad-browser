#!/usr/bin/env python3
"""Focused fail-closed tests for the joined phased-methylation release route."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "verify_release_config", SCRIPT_DIR / "verify-release-config.py"
)
assert SPEC and SPEC.loader
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)
API_ENV = json.loads((SCRIPT_DIR / "full-genome-api-env.json").read_text())


class JoinedRouteReleaseConfigTest(unittest.TestCase):
    def test_exact_route_is_admitted(self) -> None:
        VERIFY.require_exact_joined_route(API_ENV)

    def test_each_identity_drift_fails_closed(self) -> None:
        mutations = {
            "omitted route": None,
            "wrong database": ("database", "wrong_database"),
            "wrong run": ("run_id", "wrong_run"),
            "wrong raw receipt path": ("raw_receipt_path", "/app/graphql-api/config/wrong-raw.json"),
            "wrong orientation receipt path": (
                "orientation_receipt_path",
                "/app/graphql-api/config/wrong-orientation.json",
            ),
            "wrong orientation hash": ("expected_orientation_receipt_sha256", "0" * 64),
        }
        for label, mutation in mutations.items():
            with self.subTest(label=label):
                env = copy.deepcopy(API_ENV)
                if mutation is None:
                    del env["LR_Y1_JOINED_PHASED_METHYLATION_ROUTE"]
                else:
                    route = json.loads(env["LR_Y1_JOINED_PHASED_METHYLATION_ROUTE"])
                    field, value = mutation
                    route[field] = value
                    env["LR_Y1_JOINED_PHASED_METHYLATION_ROUTE"] = json.dumps(route)
                with self.assertRaises(SystemExit):
                    VERIFY.require_exact_joined_route(env)


if __name__ == "__main__":
    unittest.main()
