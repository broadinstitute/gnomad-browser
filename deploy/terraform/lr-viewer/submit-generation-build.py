#!/usr/bin/env python3
"""Reconcile, submit, and wait for a Cloud Build bound to one GCS generation."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def evidence(tool: Path, *args: str) -> None:
    subprocess.run([sys.executable, str(tool), *args], check=True)


def request_json(method: str, url: str, token: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body, separators=(",", ":")).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            value = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Cloud Build API {method} failed ({error.code}): {error.read().decode(errors='replace')}") from error
    if not isinstance(value, dict):
        raise SystemExit("Cloud Build API returned non-object")
    return value


def submission_intent(receipt: Path, component: str) -> str:
    value = json.loads(receipt.read_text())
    item = (value.get("components") or {}).get(component) or {}
    intent = str(item.get("submission_intent", ""))
    if item.get("state") != "intent_recorded" or not intent:
        raise SystemExit("component has no durable submission intent awaiting reconciliation")
    return intent


def intent_tag(intent: str) -> str:
    return "lr-intent-" + intent.replace("-", "").lower()


def build_body(args: argparse.Namespace, intent: str) -> dict:
    value = json.load(sys.stdin)
    if not isinstance(value, dict) or not isinstance(value.get("steps"), list):
        raise SystemExit("invalid immutable Cloud Build config")
    value["source"] = {"storageSource": {"bucket": args.bucket, "object": args.object, "generation": args.generation}}
    substitutions = value.setdefault("substitutions", {})
    substitutions.update(json.loads(args.substitutions))
    substitutions.update({"_SUBMISSION_INTENT": intent, "_SOURCE_GENERATION": args.generation, "_COMPONENT": args.component})
    tags = value.setdefault("tags", [])
    if not isinstance(tags, list):
        raise SystemExit("invalid Cloud Build tags")
    for tag in ("gnomad-lr-release", intent_tag(intent)):
        if tag not in tags:
            tags.append(tag)
    return value


def wait_real(project: str, build_id: str, token: str) -> None:
    url = f"https://cloudbuild.googleapis.com/v1/projects/{project}/builds/{build_id}"
    while True:
        build = request_json("GET", url, token)
        status = build.get("status")
        if status == "SUCCESS":
            return
        if status in {"FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED", "EXPIRED"}:
            raise SystemExit(f"Cloud Build {build_id} ended {status}")
        time.sleep(5)


def fake_create(body: dict) -> dict:
    fd, path = tempfile.mkstemp(prefix="lr-cloudbuild-", suffix=".json")
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(body, stream)
        result = subprocess.run(["gcloud", "builds", "submit", "--no-source", f"--config={path}", "--format=value(id)"], check=True, text=True, stdout=subprocess.PIPE)
        return dict(body, id=result.stdout.strip())
    finally:
        Path(path).unlink(missing_ok=True)


def list_by_intent(project: str, intent: str, token: str | None, fake: bool) -> list[dict]:
    tag = intent_tag(intent)
    if fake:
        result = subprocess.run(["gcloud", "builds", "list", f"--project={project}", f"--filter=tags={tag}", "--format=json"], check=True, text=True, stdout=subprocess.PIPE)
        value = json.loads(result.stdout)
        if not isinstance(value, list):
            raise SystemExit("fake Cloud Build list returned non-list")
        return [item for item in value if isinstance(item, dict)]
    assert token is not None
    # Two rows are enough to distinguish the only legal cardinalities (zero or one)
    # from ambiguity without an unbounded list operation.
    query = urllib.parse.urlencode({"filter": f'tags="{tag}"', "pageSize": "2"})
    value = request_json("GET", f"https://cloudbuild.googleapis.com/v1/projects/{project}/builds?{query}", token)
    builds = value.get("builds", [])
    if not isinstance(builds, list):
        raise SystemExit("Cloud Build list returned invalid builds")
    if value.get("nextPageToken"):
        raise SystemExit("ambiguous Cloud Build submission intent: additional remote matches exist")
    return [item for item in builds if isinstance(item, dict)]


def matches_intent(build: dict, expected: dict, args: argparse.Namespace, intent: str) -> bool:
    source = (build.get("source") or {}).get("storageSource") or {}
    substitutions = build.get("substitutions") or {}
    return (
        intent_tag(intent) in (build.get("tags") or [])
        and str(source.get("bucket", "")) == args.bucket
        and str(source.get("object", "")) == args.object
        and str(source.get("generation", "")) == args.generation
        and substitutions.get("_SUBMISSION_INTENT") == intent
        and substitutions.get("_SOURCE_GENERATION") == args.generation
        and substitutions.get("_COMPONENT") == args.component
        and substitutions.get("_TAG") == expected["substitutions"].get("_TAG")
    )


def reconcile_or_create(args: argparse.Namespace, body: dict, intent: str, token: str | None, fake: bool) -> str:
    candidates = list_by_intent(args.project, intent, token, fake)
    if any(not matches_intent(build, body, args, intent) for build in candidates):
        raise SystemExit("submission intent matched remote build with conflicting release metadata")
    if len(candidates) > 1:
        raise SystemExit("ambiguous Cloud Build submission intent: multiple remote builds match")
    if candidates:
        build_id = str(candidates[0].get("id", ""))
        if not build_id:
            raise SystemExit("reconciled Cloud Build omitted build ID")
        return build_id
    if fake:
        created = fake_create(body)
    else:
        assert token is not None
        operation = request_json("POST", f"https://cloudbuild.googleapis.com/v1/projects/{args.project}/builds", token, body)
        created = (operation.get("metadata") or {}).get("build") or operation.get("response") or operation
    build_id = str(created.get("id", ""))
    if not build_id:
        raise SystemExit("Cloud Build create response omitted build ID")
    return build_id


def main() -> None:
    parser = argparse.ArgumentParser(); sub = parser.add_subparsers(dest="action", required=True)
    for name in ("submit", "wait"):
        p = sub.add_parser(name); p.add_argument("--project", required=True); p.add_argument("--receipt", type=Path, required=True); p.add_argument("--component", required=True); p.add_argument("--evidence-tool", type=Path, required=True)
        if name == "submit":
            p.add_argument("--bucket", required=True); p.add_argument("--object", required=True); p.add_argument("--generation", required=True); p.add_argument("--substitutions", required=True)
        else:
            p.add_argument("--build-id", required=True)
    args = parser.parse_args()
    fake = os.environ.get("LR_RELEASE_FAKE_BUILD_API") == "true"
    if args.action == "submit":
        intent = submission_intent(args.receipt, args.component)
        body = build_body(args, intent)
        token = None if fake else subprocess.run(["gcloud", "auth", "print-access-token"], check=True, text=True, stdout=subprocess.PIPE).stdout.strip()
        build_id = reconcile_or_create(args, body, intent, token, fake)
        # The intent is already durable and queryable remotely. If this local write
        # fails, resume lists by intent and recovers this exact build instead of creating another.
        evidence(args.evidence_tool, "build-created", str(args.receipt), args.component, build_id)
    else:
        build_id = args.build_id
        token = None
    if not fake:
        if token is None:
            token = subprocess.run(["gcloud", "auth", "print-access-token"], check=True, text=True, stdout=subprocess.PIPE).stdout.strip()
        wait_real(args.project, build_id, token)
    evidence(args.evidence_tool, "build-submit", str(args.receipt), args.component)
    print(build_id)


if __name__ == "__main__":
    main()
