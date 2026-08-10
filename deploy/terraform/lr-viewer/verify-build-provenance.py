#!/usr/bin/env python3
"""Verify a paired build receipt against exact Cloud Build source and image bytes."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

from gcloud_storage_metadata import object_md5

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import importlib.util
spec = importlib.util.spec_from_file_location("release_evidence", SCRIPT_DIR / "release-evidence.py")
assert spec and spec.loader
release_evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release_evidence)


def gcloud_json(*args: str) -> dict:
    command = ["gcloud", *args, "--format=json"]
    result = subprocess.run(command, check=True, text=True, stdout=subprocess.PIPE)
    value = json.loads(result.stdout)
    if not isinstance(value, dict):
        raise SystemExit(f"expected object from {' '.join(command)}")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"provenance verification failed: {message}")


def artifact_digest(value: dict) -> str | None:
    summary = value.get("image_summary", {})
    if isinstance(summary, dict) and isinstance(summary.get("digest"), str): return summary["digest"]
    name = value.get("name")
    if isinstance(name, str) and "/versions/sha256:" in name: return "sha256:" + name.rsplit("/versions/sha256:", 1)[1]
    return value.get("digest") if isinstance(value.get("digest"), str) else None


def hash_generation(source: dict) -> tuple[str, str]:
    url = f"gs://{source['bucket']}/{source['object']}#{source['generation']}"
    process = subprocess.Popen(["gcloud", "storage", "cp", url, "-"], stdout=subprocess.PIPE)
    assert process.stdout is not None
    sha256 = hashlib.sha256(); md5 = hashlib.md5()
    for chunk in iter(lambda: process.stdout.read(1024 * 1024), b""):
        sha256.update(chunk); md5.update(chunk)
    status = process.wait()
    if status:
        raise subprocess.CalledProcessError(status, process.args)
    return sha256.hexdigest(), base64.b64encode(md5.digest()).decode()


def main() -> None:
    parser = argparse.ArgumentParser(); parser.add_argument("identity", type=Path); parser.add_argument("output", type=Path); args = parser.parse_args()
    identity = release_evidence.load(args.identity); release_evidence.validate_release_identity(identity)
    receipt_hash = identity["build_receipt_sha256"]; verified = {}
    created = release_evidence.timestamp(identity["created"], "created")
    completed = release_evidence.timestamp(identity["completed"], "completed")

    for component in ("api", "browser"):
        image = identity["images"][component]; recorded_source = image["source_provenance"]
        reference = f"{image['repository']}@{image['digest']}"
        artifact = gcloud_json("artifacts", "docker", "images", "describe", reference, "--project=gnomadev")
        require(artifact_digest(artifact) == image["digest"], f"{component} digest is absent from expected repository")
        artifact_name = str(artifact.get("name", reference))
        require("gnomad-lr-" + component in artifact_name or artifact.get("package") == image["repository"], f"{component} repository mismatch")

        build = gcloud_json("builds", "describe", image["build_id"], "--project=gnomadev")
        require(build.get("id", image["build_id"]) == image["build_id"], f"{component} build ID mismatch")
        require(build.get("status") == "SUCCESS", f"{component} build did not succeed")
        build_created = release_evidence.timestamp(build.get("createTime"), f"{component} build createTime")
        build_finished = release_evidence.timestamp(build.get("finishTime"), f"{component} build finishTime")
        # Receipt times are intentionally second precision; a build can finish later
        # within the same displayed completion second.
        require(created <= build_created <= build_finished < completed + timedelta(seconds=1), f"{component} build timestamps fall outside receipt lifetime")
        substitutions = build.get("substitutions", {})
        expected_substitutions = {
            "_IMAGE": image["repository"], "_TAG": identity["image_tag"], "_SOURCE_SHA": identity["source_sha"],
            "_SOURCE_ARCHIVE_SHA256": identity["source_archive_sha256"], "_CREATED": identity["created"],
            "_ROUTING_MANIFEST_SHA256": identity["routing_artifact_manifest_sha256"],
            "_SUBMISSION_INTENT": image["submission_intent"], "_SOURCE_GENERATION": str(recorded_source["generation"]),
            "_COMPONENT": component,
        }
        for key, expected in expected_substitutions.items(): require(substitutions.get(key) == expected, f"{component} build {key} mismatch")
        require(build.get("options", {}).get("requestedVerifyOption") == "VERIFIED", f"{component} build did not request verified provenance")
        build_args = [arg for step in build.get("steps", []) for arg in step.get("args", [])]
        required_labels = {
            f"--label=org.opencontainers.image.created={identity['created']}",
            f"--label=org.opencontainers.image.revision={identity['source_sha']}",
            f"--label=org.gnomad.source-archive.sha256={identity['source_archive_sha256']}",
            f"--label=org.gnomad.lr.routing-manifest.sha256={identity['routing_artifact_manifest_sha256']}",
        }
        require(required_labels.issubset(build_args), f"{component} build steps do not carry required OCI identity labels")
        source = build.get("sourceProvenance", {}).get("resolvedStorageSource", {})
        normalized_source = {"bucket": source.get("bucket"), "object": source.get("object"), "generation": str(source.get("generation", "")), "md5_hash": recorded_source["md5_hash"]}
        require(normalized_source == recorded_source, f"{component} resolved source identity changed")
        metadata = gcloud_json("storage", "objects", "describe", f"gs://{source['bucket']}/{source['object']}#{source['generation']}")
        require((metadata.get("bucket") or source["bucket"]) == source["bucket"] and metadata.get("name") == source["object"] and str(metadata.get("generation", "")) == str(source["generation"]), f"{component} source object generation mismatch")
        try:
            service_md5 = object_md5(metadata)
        except ValueError as error:
            raise SystemExit(f"provenance verification failed: {component} {error}") from error
        require(service_md5 == identity["source_archive_md5"], f"{component} service-reported source checksum mismatch")
        received_sha256, received_md5 = hash_generation(recorded_source)
        require(received_sha256 == identity["source_archive_sha256"] and received_md5 == identity["source_archive_md5"], f"{component} actual received source bytes differ from pre-hashed archive")
        results = build.get("results", {}).get("images", [])
        require(any(item.get("digest") == image["digest"] and item.get("name") == f"{image['repository']}:{identity['image_tag']}" for item in results), f"{component} build result does not bind digest/tag")
        verified[component] = {
            "repository": image["repository"], "digest": image["digest"], "tag": identity["image_tag"], "build_id": image["build_id"],
            "submission_intent": image["submission_intent"], "build_status": build["status"], "build_create_time": build["createTime"], "build_finish_time": build["finishTime"],
            "source_provenance": recorded_source, "received_source_sha256": received_sha256,
        }

    output = {
        "schema_version": 2, "build_receipt_sha256": receipt_hash, "source_sha": identity["source_sha"],
        "source_archive_sha256": identity["source_archive_sha256"], "routing_artifact_manifest_sha256": identity["routing_artifact_manifest_sha256"],
        "image_tag": identity["image_tag"], "cloud_run_tag": identity["run_tag"], "images": verified,
    }
    release_evidence.atomic_write(args.output, output, exclusive=True); print(receipt_hash)


if __name__ == "__main__": main()
