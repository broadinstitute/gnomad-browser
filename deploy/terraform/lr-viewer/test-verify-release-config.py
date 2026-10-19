#!/usr/bin/env python3
"""Focused fail-closed tests for the joined phased-methylation release route."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

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


class RefreshBundleReleaseConfigTest(unittest.TestCase):
    def test_exact_refresh_bundle_is_admitted(self) -> None:
        VERIFY.verify_refresh_bundle()

    def test_public_joined_identity_and_scope_drift_fail_closed(self) -> None:
        env = json.loads((SCRIPT_DIR / "refresh-20260923-api-env.json").read_text())
        for key, value in [
            ("REDIS_CACHE_PREFIX", "public:v6-refresh-20260923:20261019:"),
            ("REDIS_CACHE_PREFIX", ""),
            ("NODE_ENV", "development"),
            ("LR_Y1_CLICKHOUSE_DATABASE", "wrong"),
            ("LR_Y1_CLICKHOUSE_URL", "http://192.168.0.124:8123"),
            ("LR_Y1_LOCAL_JOINED_MAPPING_ASSUMPTION_ENABLED", "true"),
            ("LR_Y1_PUBLIC_JOINED_MAPPING_ASSUMPTION_ENABLED", "false"),
            ("LR_Y1_PRIMARY_MANIFEST_PATH", "/app/graphql-api/config/y1-presentation-primary-manifests.json"),
            ("LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED", "false"),
            ("LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE", ""),
            ("LR_Y1_JOINED_PHASED_METHYLATION_ROUTE", ""),
        ]:
            with self.subTest(key=key):
                with self.assertRaises(SystemExit):
                    VERIFY.require_exact_public_joined_env({**env, key: value})
        missing = dict(env)
        del missing["LR_Y1_PUBLIC_JOINED_MAPPING_ASSUMPTION_ENABLED"]
        with self.assertRaises(SystemExit):
            VERIFY.require_exact_public_joined_env(missing)
        for key in VERIFY.EXPECTED_PUBLIC_JOINED_ROUTE:
            with self.subTest(route_key=key):
                route = {**VERIFY.EXPECTED_PUBLIC_JOINED_ROUTE, key: "wrong"}
                with self.assertRaises(SystemExit):
                    VERIFY.require_exact_public_joined_env({**env,
                        "LR_Y1_JOINED_PHASED_METHYLATION_ROUTE": json.dumps(route)})

    def test_manifest_drift_fails_closed(self) -> None:
        with patch.object(VERIFY, "sha256", return_value="0" * 64):
            with self.assertRaisesRegex(SystemExit, "refresh artifact manifest drifted"):
                VERIFY.verify_refresh_bundle()

    def test_any_refresh_artifact_drift_fails_closed(self) -> None:
        original_sha256 = VERIFY.sha256
        names = VERIFY.REFRESH_CONFIG_NAMES | {"refresh-20260923-api-env.json"}
        for name in names:
            with self.subTest(name=name):
                with patch.object(VERIFY, "sha256", side_effect=lambda p: "0" * 64
                                  if p.name == name else original_sha256(p)):
                    with self.assertRaisesRegex(SystemExit, "refresh artifact hash/size mismatch"):
                        VERIFY.verify_refresh_bundle()


if __name__ == "__main__":
    unittest.main()
