#!/usr/bin/env python3
"""Offline checks for the immutable gnomAD-LR full-genome release inputs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[2]
CONFIG_DIR = ROOT / "graphql-api" / "config"
MANIFEST_PATH = CONFIG_DIR / "full-genome-routing-artifact-manifest.json"
API_ENV_PATH = SCRIPT_DIR / "full-genome-api-env.json"
EXPECTED_ENV_SHA256 = "e38c9d37c82134b5fc84d284130b68cabaf35e0539a467132861a3d19544f893"
EXPECTED_ARTIFACTS = {
    "y1-presentation-primary-manifests.json",
    "y1-represented-length-source-contract.json",
    "y1-source-phased-methylation-serving-receipt.json",
    "y1-source-to-browser-vcf-orientation-receipt.json",
    "completion-receipt-coverage-aou.json",
    "completion-receipt-coverage-hgsvc_hprc.json",
    "completion-receipt-str-aou.json",
    "completion-receipt-str-hgsvc_hprc.json",
    "sample-total-completion-receipt.json",
    "terminal-metadata-receipt.json",
    "long-read-tr-reference-crosswalk.json",
}
EXPECTED_JOINED_ROUTE = {
    "database": "gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3",
    "run_id": "y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1",
    "raw_receipt_path": "/app/graphql-api/config/y1-source-phased-methylation-serving-receipt.json",
    "orientation_receipt_path": "/app/graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json",
    "expected_orientation_receipt_sha256": "e3d7c819e0cb8fb759d8ce1611eec1228ae3a40d6f9407cbbfbe50551809e460",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact_sha256(value: object) -> str:
    payload = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(payload).hexdigest()


def canonical_sha256(value: object) -> str:
    payload = json.dumps(value, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(payload).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"release config check failed: {message}")


def require_exact_joined_route(api_env: dict[str, object]) -> None:
    raw = api_env.get("LR_Y1_JOINED_PHASED_METHYLATION_ROUTE")
    require(isinstance(raw, str), "joined phased-methylation route is omitted")
    try:
        route = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        require(False, "joined phased-methylation route is not valid JSON")
    require(
        route == EXPECTED_JOINED_ROUTE,
        "joined phased-methylation route is not the exact approved identity",
    )


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    require(manifest.get("schema_version") == 1, "unexpected artifact manifest schema")
    artifacts = manifest.get("artifacts", [])
    names = {Path(item["path"]).name for item in artifacts}
    require(len(artifacts) == 11 and names == EXPECTED_ARTIFACTS, "artifact allowlist is not the exact eleven-file bundle")

    for item in artifacts:
        relative = Path(item["path"])
        require(not relative.is_absolute() and ".." not in relative.parts, f"unsafe artifact path {relative}")
        path = ROOT / relative
        require(path.parent == CONFIG_DIR, f"artifact is outside graphql-api/config: {relative}")
        require(path.is_file(), f"missing artifact {relative}")
        require(path.stat().st_size == item["bytes"], f"byte count mismatch for {relative}")
        require(sha256(path) == item["sha256"], f"SHA-256 mismatch for {relative}")
        require(item["target_in_image"] == f"/app/graphql-api/config/{path.name}", f"bad image target for {relative}")

    env_bytes = API_ENV_PATH.read_bytes()
    require(hashlib.sha256(env_bytes).hexdigest() == EXPECTED_ENV_SHA256, "full-genome API env differs from the approved proposal")
    api_env = json.loads(env_bytes)
    require(api_env["CLICKHOUSE_URL"] == "http://192.168.0.124:8123", "generic ClickHouse endpoint is wrong")
    require(api_env["LR_Y1_CLICKHOUSE_URL"] == "http://192.168.0.124:8123", "Y1 ClickHouse endpoint is wrong")
    require(api_env["REDIS_HOST"] == "10.252.0.3", "Redis host must use the managed Redis instance")
    require(api_env["CACHE_REDIS_URL"] == "redis://10.252.0.3:6379/1", "cache Redis route is wrong")
    require(api_env["RATE_LIMITER_REDIS_URL"] == "redis://10.252.0.3:6379/2", "rate-limiter Redis route is wrong")
    require(api_env["LR_Y1_ENABLED"] == "true", "API Y1 mode must be enabled")
    require(json.loads(api_env["LR_Y1_RUN_MAP"])["hgsvc_hprc"]["chr3"].endswith("recovery-r2"), "approved chr3 recovery route is missing")
    require_exact_joined_route(api_env)

    represented_length_receipt = json.loads((CONFIG_DIR / "y1-represented-length-source-contract.json").read_text())
    represented_length_digest = represented_length_receipt.pop("canonical_digest_sha256", None)
    require(
        represented_length_digest == "ad16242c7d0bff2321c87ad7d2ceecef2d7285706f71210699dc5e3af9cf1615",
        "represented-length canonical receipt digest drifted",
    )
    require(
        canonical_sha256(represented_length_receipt) == represented_length_digest,
        "represented-length receipt is not canonical-digest valid",
    )
    require(
        represented_length_receipt.get("measurement_scope")
        == "ENGINEERING_REPRESENTED_ALLELE_LENGTH_NOT_CLINICAL_OR_COMPONENT_REPEAT",
        "represented length was mislabeled as clinical or component-repeat measurement",
    )
    require(
        represented_length_receipt.get("rule")
        == {
            "id": "VCF_SHARED_LEFT_PADDING_BASE_V1",
            "remove_left_padding_bytes": 1,
            "requires_complete_non_symbolic_ref_alt": True,
            "requires_identical_first_byte": True,
            "requires_source_ref_byte_agreement": True,
            "requires_single_source_record_task_attempt": True,
            "requires_whole_record_delta_reconciliation": True,
        },
        "represented-length receipt has the wrong padding rule",
    )
    primary_manifest_path = CONFIG_DIR / "y1-presentation-primary-manifests.json"
    primary_manifest = json.loads(primary_manifest_path.read_text())
    manifest_contract = [
        {
            key: entry[key]
            for key in ("cohort", "chrom", "run_id", "manifest_sha256", "source")
        }
        for entry in sorted(
            primary_manifest["entries"], key=lambda entry: (entry["cohort"], entry["chrom"])
        )
    ]
    binding = represented_length_receipt.get("manifest_binding", {})
    require(
        binding.get("artifact_sha256") == sha256(primary_manifest_path)
        and binding.get("entry_count") == len(primary_manifest["entries"]) == 48
        and binding.get("contract_sha256") == canonical_sha256(manifest_contract),
        "represented-length receipt is stale against the primary manifest bundle",
    )
    require(
        api_env.get("LR_Y1_REPRESENTED_LENGTH_RULE_PATH")
        == "/app/graphql-api/config/y1-represented-length-source-contract.json",
        "represented-length receipt is not wired into API startup",
    )

    crosswalk = json.loads((CONFIG_DIR / "long-read-tr-reference-crosswalk.json").read_text())
    require(crosswalk.get("schema_version") == 4, "STR crosswalk is not receipt-bound schema v4")
    rows = crosswalk.get("rows", [])
    catalog = crosswalk.get("catalog", {})
    contract = crosswalk.get("catalog_contract", {})
    require(catalog.get("row_count") == len(rows) and len(rows) > 0, "catalog row receipt is incomplete")
    require(compact_sha256([row["short"] for row in rows]) == catalog.get("compact_sha256"), "catalog compact digest mismatch")
    require(contract.get("contract_id") == "gnomad-short-tr-snapshot-2026-08-24", "unexpected public catalog contract")
    require(contract.get("row_count") == len(rows), "catalog contract count mismatch")
    require(contract.get("source_memberships") == ["GNOMAD_SHORT_SNAPSHOT"], "catalog source membership drifted")
    require(contract.get("approval", {}).get("state") == "PENDING_SCIENCE_OWNER", "science approval state is not honest")
    require(contract.get("approval", {}).get("public_catalog_change_authorized") is False, "unapproved catalog change is authorized")
    require(contract.get("current_trexplorer", {}).get("admitted") is False, "current TRExplorer was admitted without approval")
    row_keys = sorted(row.get("row_key") for row in rows)
    require(len(set(row_keys)) == len(rows), "catalog row keys are not unique")
    require(compact_sha256(row_keys) == contract.get("row_keys_sha256"), "catalog row-key digest mismatch")
    # The artifact rows are already in the producer's canonical JS locale order. Keep that
    # receipt order here rather than replacing it with Python's different underscore collation.
    tuple_receipt = [
        {"row_key": row["row_key"], "tuple_set_sha256": row["tuple_set_sha256"]}
        for row in rows
    ]
    require(compact_sha256(tuple_receipt) == contract.get("full_tuple_set_sha256"), "catalog tuple digest mismatch")
    statuses = crosswalk.get("reconciliation", {}).get("exclusive_statuses", [])
    computed_counts = {
        cohort: {
            status: sum(row["cohorts"][cohort]["status"] == status for row in rows)
            for status in statuses
        }
        for cohort in ("hgsvc_hprc", "aou")
    }
    require(computed_counts == contract.get("expected_status_counts"), "catalog status-category receipt mismatch")
    require(computed_counts == crosswalk.get("reconciliation", {}).get("status_counts"), "reconciliation status counts drifted")
    require(compact_sha256(computed_counts) == crosswalk.get("reconciliation", {}).get("status_counts_sha256"), "status-count digest mismatch")
    require(all(sum(counts.values()) == len(rows) for counts in computed_counts.values()), "statuses are not exclusive and complete")
    component = crosswalk.get("component_index_receipt", {})
    require(component.get("complete") is True and component.get("source_count") == 48, "component index is incomplete")
    require(len(component.get("sources", [])) == component.get("source_count"), "component source bundle is incomplete")
    require(compact_sha256(component.get("sources")) == component.get("source_bundle_sha256"), "component source digest mismatch")
    require(component.get("source_record_count", 0) > 0, "component source records are empty")
    require(component.get("ordered_component_count", 0) >= component.get("source_record_count", 0), "ordered component count is invalid")
    require(
        component.get("completion_marker_sha256") == compact_sha256({
            "expected_source_records": component.get("source_record_count"),
            "expected_ordered_components": component.get("ordered_component_count"),
        }),
        "component terminal completion marker is invalid",
    )
    require(all(source.get("source_record_count", 0) > 0 for source in component.get("sources", [])), "one component source is empty")
    ar = next(row for row in rows if row["short"]["id"] == "AR")
    require(all(result["status"] == "COORDINATE_MISMATCH" and not result["candidates"] for result in ar["cohorts"].values()), "AR diagnostic authorized an exact candidate")
    require(all(result["diagnostic_candidates"][0]["canonical_id"] == "X-67545306-67545318-TGC+X-67545400-67545419-GCA" for result in ar["cohorts"].values()), "AR compound diagnostic identity drifted")
    for short_id in ("ARX_1", "ARX_2"):
        row = next(item for item in rows if item["short"]["id"] == short_id)
        require(all(result["status"] == "EXACT_UNIQUE" for result in row["cohorts"].values()), f"{short_id} exact identity drifted")

    expected_database = api_env["LR_Y1_CLICKHOUSE_DATABASE"]
    require(
        crosswalk.get("provenance", {}).get("presentation_database") == expected_database,
        "STR crosswalk presentation database differs from the approved API route",
    )
    require(
        all(source.get("source_database") == expected_database for source in crosswalk.get("sources", [])),
        "STR crosswalk source identity differs from the approved API route",
    )
    require(
        all(
            result.get("source_database") == expected_database
            for row in crosswalk.get("rows", [])
            for result in row.get("cohorts", {}).values()
        ),
        "STR crosswalk row source differs from the approved API route",
    )

    api_dockerfile = (ROOT / "deploy/dockerfiles/browser/api.dockerfile").read_text()
    api_ignore = (ROOT / "deploy/dockerfiles/browser/api.dockerfile.dockerignore").read_text().splitlines()
    config_negations = {line[1:] for line in api_ignore if line.startswith("!graphql-api/config/")}
    require(config_negations == {f"graphql-api/config/{name}" for name in EXPECTED_ARTIFACTS}, "API dockerignore config allowlist is not exact")
    copy_lines = [line for line in api_dockerfile.splitlines() if line.startswith("COPY ")]
    for name in EXPECTED_ARTIFACTS:
        source = f"graphql-api/config/{name}"
        matches = [line for line in copy_lines if line.split()[2] == source]
        require(len(matches) == 1, f"API Dockerfile must copy {name} exactly once")
    require("COPY --chown=node:node graphql-api/config /app" not in api_dockerfile, "API Dockerfile copies config wholesale")
    require("node:18.17-alpine@sha256:" in api_dockerfile, "API Node base is not digest pinned")
    require("pnpm-8.14.3.tgz" in api_dockerfile and "PNPM_TARBALL_SHA512=" in api_dockerfile, "API pnpm tarball is not integrity pinned")
    require("sha512sum -c" in api_dockerfile and "npm install -g --offline /tmp/pnpm.tgz" in api_dockerfile, "API pnpm is not verified before offline install")

    runtime_imports = {
        ROOT / "graphql-api/src/graphql/resolvers/variants.ts": "../../../../dataset-metadata/longReadVariantId",
        ROOT / "graphql-api/src/graphql/resolvers/long_read_variants.ts": "../../../../dataset-metadata/longReadVariantId",
        ROOT / "graphql-api/src/queries/long_read_variants.ts": "../../../dataset-metadata/longReadVariantId",
    }
    for path, expected_import in runtime_imports.items():
        source = path.read_text()
        require(expected_import in source, f"{path.relative_to(ROOT)} does not use the emitted relative module")
        require("@gnomad/dataset-metadata/longReadVariantId" not in source, f"{path.relative_to(ROOT)} retains a source-only runtime import")

    packaging_test = (SCRIPT_DIR / "test-api-production-emit.sh").read_text()
    require("tsconfig.build.json" in packaging_test, "API packaging regression does not run the production emit")
    require("NODE_ENV=production" in packaging_test and "node -" in packaging_test, "API packaging regression does not load output with raw Node")
    require("long_read_tr_reference.js" in packaging_test, "API packaging regression does not load the crosswalk artifact consumer")

    browser_dockerfile = (ROOT / "deploy/dockerfiles/browser/browser.dockerfile").read_text()
    require("ARG LR_Y1_ENABLED=false" in browser_dockerfile, "browser LR_Y1_ENABLED build input is not explicit")
    require("ARG EXPERIMENTAL_FEATURES_ENABLED=false" in browser_dockerfile, "browser experimental-feature build input is not explicit")
    require("browser/build.env" not in browser_dockerfile, "browser build still depends on ignored build.env")
    require("node:18.17-alpine@sha256:" in browser_dockerfile, "browser Node base is not digest pinned")
    require("nginx:stable-alpine@sha256:" in browser_dockerfile, "browser nginx base is not digest pinned")
    require("pnpm-8.14.3.tgz" in browser_dockerfile and "PNPM_TARBALL_SHA512=" in browser_dockerfile, "browser pnpm tarball is not integrity pinned")
    require("sha512sum -c" in browser_dockerfile and "npm install -g --offline /tmp/pnpm.tgz" in browser_dockerfile, "browser pnpm is not verified before offline install")
    require("apk add" not in browser_dockerfile, "browser build installs mutable Alpine packages")

    cloudbuild = (SCRIPT_DIR / "cloudbuild.yaml").read_text()
    cloudbuild_value = json.loads(cloudbuild)
    require("${_IMAGE}:${_TAG}" in cloudbuild and ":latest" not in cloudbuild, "Cloud Build does not use only a unique supplied tag")
    require("LR_Y1_ENABLED=${_LR_Y1_ENABLED}" in cloudbuild, "Cloud Build omits browser Y1 input")
    require("EXPERIMENTAL_FEATURES_ENABLED=${_EXPERIMENTAL_FEATURES_ENABLED}" in cloudbuild, "Cloud Build omits browser experimental-feature input")
    require(cloudbuild_value.get("substitutions", {}).get("_EXPERIMENTAL_FEATURES_ENABLED") == "false", "Cloud Build experimental-feature input is not forced false")
    require("org.opencontainers.image.revision" in cloudbuild, "Cloud Build omits OCI source revision")
    require("org.gnomad.source-archive.sha256" in cloudbuild, "Cloud Build omits source archive identity")
    require("org.gnomad.lr.routing-manifest.sha256" in cloudbuild, "Cloud Build omits routing provenance")
    require("org.gnomad.experimental-features.enabled=${_EXPERIMENTAL_FEATURES_ENABLED}" in cloudbuild, "Cloud Build omits experimental-feature provenance")
    for key in ("_SUBMISSION_INTENT", "_SOURCE_GENERATION", "_COMPONENT"):
        require(key in cloudbuild, f"Cloud Build omits durable submission metadata {key}")
    require(cloudbuild_value.get("options", {}).get("requestedVerifyOption") == "VERIFIED", "Cloud Build provenance verification is not requested")

    main_tf = (SCRIPT_DIR / "main.tf").read_text()
    cloud_run_tf = (SCRIPT_DIR / "cloud-run.tf").read_text()
    require(":latest" not in main_tf and "docker_registry_image" not in main_tf, "Terraform still resolves mutable tags")
    require("var.api_image_digest" in cloud_run_tf and "var.browser_image_digest" in cloud_run_tf, "Terraform images are not digest inputs")
    require("local.full_genome_api_env" in cloud_run_tf, "Terraform does not use the approved exact env map")
    require("google_compute_instance.clickhouse_vm.network_interface" not in cloud_run_tf, "Cloud Run env still couples ClickHouse/Redis to one VM")
    require(cloud_run_tf.count("ignore_changes") == 2 and cloud_run_tf.count("template[0].containers[0].image") == 2, "Terraform release ownership boundary is missing")

    build_script = (SCRIPT_DIR / "deploy.sh").read_text()
    stage_script = (SCRIPT_DIR / "deploy-no-traffic.sh").read_text()
    require("--confirm-build-push" in build_script and "terraform apply" not in build_script.lower(), "build script is not safely build-only")
    require("git archive" in build_script and 'chmod 700 "$WORK_DIR"' in build_script, "build script does not use a private immutable archive")
    require("source_archive_sha256" in (SCRIPT_DIR / "release-evidence.py").read_text(), "build receipt omits source archive identity")
    require("build-fail" in build_script and "build-finish" in build_script, "build receipt has no durable lifecycle")
    require("--no-traffic" in stage_script and "--receipt" in stage_script, "staging script is not receipt-gated/no-traffic")
    require("'EXPERIMENTAL_FEATURES_ENABLED':'false'" in stage_script, "staging does not explicitly disable browser experimental features")
    require("verify-build-provenance.py" in stage_script, "staging does not verify remote provenance")
    require("phase-journal.json" in stage_script and "rollback_component" in stage_script, "staging lacks journaled rollback")
    require("${#TAG} + ${#BROWSER_SERVICE} <= 46" in stage_script, "staging script does not enforce Cloud Run hostname length")
    require("terraform apply" not in stage_script.lower(), "staging script applies Terraform")

    for path in [MANIFEST_PATH, API_ENV_PATH]:
        require("/Users/" not in path.read_text(), f"local absolute path leaked into {path.relative_to(ROOT)}")

    print(f"verified 11 artifacts; routing manifest sha256={sha256(MANIFEST_PATH)}")
    print(f"verified approved API env sha256={EXPECTED_ENV_SHA256}")


if __name__ == "__main__":
    main()
