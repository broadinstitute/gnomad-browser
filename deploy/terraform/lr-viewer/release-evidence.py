#!/usr/bin/env python3
"""Atomic release receipts/journals and offline schema checks."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SHA = re.compile(r"^[0-9a-f]{40}$")
DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
HEX256 = re.compile(r"^[0-9a-f]{64}$")
MD5_B64 = re.compile(r"^[A-Za-z0-9+/]{22}==$")
BUILD_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
SUBMISSION_INTENT = BUILD_ID
IMAGE_TAG = re.compile(r"^fullgenome-[0-9a-f]{12}-[0-9]{8}t[0-9]{6}z$")
RUN_TAG = re.compile(r"^[a-z][a-z0-9-]{0,62}$")
COMPONENT_STATES = {"pending", "intent_recorded", "submitted", "build_succeeded", "digest_resolved", "recorded"}
EXPECTED_IMAGES = {
    "api": "us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-api",
    "browser": "us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-browser",
}


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def timestamp(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise SystemExit(f"invalid {field} timestamp")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as error:
        raise SystemExit(f"invalid {field} timestamp") from error
    if parsed.tzinfo != timezone.utc:
        raise SystemExit(f"invalid {field} timestamp")
    return parsed


def canonical_timestamp(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value):
        raise SystemExit(f"invalid {field} timestamp")
    return timestamp(value, field)


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise SystemExit(f"expected JSON object: {path}")
    return value


def atomic_write(path: Path, value: dict[str, Any], *, exclusive: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if exclusive and path.exists():
        raise SystemExit(f"refusing to overwrite existing evidence: {path}")
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        if exclusive:
            try:
                os.link(temporary, path)
            except FileExistsError:
                raise SystemExit(f"refusing to overwrite existing evidence: {path}")
            os.unlink(temporary)
        else:
            os.replace(temporary, path)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def validate_build_receipt(receipt: dict[str, Any], *, require_pair: bool = True) -> None:
    if receipt.get("schema_version") != 4:
        raise SystemExit("unsupported build receipt schema")
    status = receipt.get("status")
    if status not in {"in_progress", "complete", "failed_partial"}:
        raise SystemExit("invalid build receipt status")
    source_sha = str(receipt.get("source_sha", ""))
    if not SHA.fullmatch(source_sha):
        raise SystemExit("invalid source_sha")
    created = canonical_timestamp(receipt.get("created"), "created")
    updated = canonical_timestamp(receipt.get("updated"), "updated")
    if updated < created:
        raise SystemExit("receipt updated timestamp predates creation")
    expected_stamp = created.strftime("%Y%m%dt%H%M%Sz")
    if receipt.get("tag") != f"fullgenome-{source_sha[:12]}-{expected_stamp}":
        raise SystemExit("image tag does not match source SHA and creation timestamp")
    if receipt.get("cloud_run_tag") != f"fg-{source_sha[:8]}-{expected_stamp}":
        raise SystemExit("Cloud Run tag does not match source SHA and creation timestamp")
    if not IMAGE_TAG.fullmatch(str(receipt.get("tag", ""))) or not RUN_TAG.fullmatch(str(receipt.get("cloud_run_tag", ""))):
        raise SystemExit("invalid release tag")
    if not HEX256.fullmatch(str(receipt.get("source_archive_sha256", ""))):
        raise SystemExit("invalid source archive SHA-256")
    if not MD5_B64.fullmatch(str(receipt.get("source_archive_md5", ""))):
        raise SystemExit("invalid source archive MD5")
    if not HEX256.fullmatch(str(receipt.get("routing_artifact_manifest_sha256", ""))):
        raise SystemExit("invalid routing manifest SHA-256")
    requested = receipt.get("requested_components")
    if not isinstance(requested, list) or not requested or set(requested) - EXPECTED_IMAGES.keys():
        raise SystemExit("invalid requested component set")
    if len(requested) != len(set(requested)):
        raise SystemExit("duplicate requested component")
    source_object = receipt.get("source_object")
    if source_object is not None:
        if not isinstance(source_object, dict) or not source_object.get("bucket") or not source_object.get("object") or not str(source_object.get("generation", "")).isdigit():
            raise SystemExit("invalid immutable source object identity")
        if source_object.get("md5_hash") != receipt["source_archive_md5"]:
            raise SystemExit("immutable source object checksum mismatch")
    components = receipt.get("components")
    if not isinstance(components, dict) or set(components) != set(requested):
        raise SystemExit("component journal does not match requested components")
    images = receipt.get("images")
    if not isinstance(images, dict) or set(images) - set(requested):
        raise SystemExit("unexpected image result")
    for component, item in components.items():
        if not isinstance(item, dict) or item.get("image") != EXPECTED_IMAGES[component]:
            raise SystemExit(f"unexpected {component} component repository")
        state = item.get("state")
        if state not in COMPONENT_STATES:
            raise SystemExit(f"invalid {component} component state")
        item_updated = canonical_timestamp(item.get("updated"), f"{component}.updated")
        if not created <= item_updated <= updated:
            raise SystemExit(f"invalid {component} transition timestamp")
        intent = item.get("submission_intent")
        if state == "pending":
            if intent is not None or "build_id" in item:
                raise SystemExit(f"unexpected {component} submission evidence while pending")
        else:
            if not SUBMISSION_INTENT.fullmatch(str(intent or "")):
                raise SystemExit(f"invalid {component} submission intent")
            if source_object is None:
                raise SystemExit("build intent recorded before immutable source object")
        if state not in {"pending", "intent_recorded"} and not BUILD_ID.fullmatch(str(item.get("build_id", ""))):
            raise SystemExit(f"invalid {component} build ID")
        if state == "intent_recorded" and "build_id" in item:
            raise SystemExit(f"unexpected {component} build ID before create reconciliation")
        source = item.get("source_provenance")
        if source is not None:
            if not isinstance(source, dict) or not source.get("bucket") or not source.get("object") or not str(source.get("generation", "")).isdigit():
                raise SystemExit(f"invalid {component} source provenance identity")
            if source.get("md5_hash") != receipt["source_archive_md5"] or source != source_object:
                raise SystemExit(f"{component} source object identity mismatch")
        if state in {"digest_resolved", "recorded"}:
            if source is None or not DIGEST.fullmatch(str(item.get("digest", ""))):
                raise SystemExit(f"incomplete {component} digest evidence")
        if state == "recorded":
            image = images.get(component)
            expected = {"image": item["image"], "tag": receipt["tag"], "digest": item["digest"], "build_id": item["build_id"]}
            if image != expected:
                raise SystemExit(f"{component} image record does not match component journal")
        elif component in images:
            raise SystemExit(f"{component} image recorded before durable component transition")
    if status == "complete":
        completed = canonical_timestamp(receipt.get("completed"), "completed")
        if not created <= completed <= updated:
            raise SystemExit("invalid completion timestamp relationship")
        if set(images) != set(requested) or any(components[x]["state"] != "recorded" for x in requested):
            raise SystemExit("complete receipt does not contain every recorded image")
    elif "completed" in receipt:
        raise SystemExit("incomplete receipt contains completion timestamp")
    if status == "failed_partial":
        failure = receipt.get("failure")
        if not isinstance(failure, dict) or canonical_timestamp(failure.get("recorded"), "failure.recorded") > updated:
            raise SystemExit("invalid failure evidence")
    if require_pair and (status != "complete" or set(requested) != set(EXPECTED_IMAGES) or set(images) != set(EXPECTED_IMAGES)):
        raise SystemExit("staging requires one complete paired API/browser receipt")


def command_build_init(args: argparse.Namespace) -> None:
    requested = args.components.split(",")
    value = {
        "schema_version": 4,
        "status": "in_progress",
        "source_sha": args.source_sha,
        "source_archive_sha256": args.archive_sha256,
        "source_archive_md5": args.archive_md5,
        "tag": args.tag,
        "cloud_run_tag": args.cloud_run_tag,
        "created": args.created,
        "updated": args.created,
        "routing_artifact_manifest_sha256": args.routing_sha256,
        "requested_components": requested,
        "components": {component: {"image": EXPECTED_IMAGES[component], "state": "pending", "updated": args.created} for component in requested},
        "images": {},
    }
    validate_build_receipt(value, require_pair=False)
    atomic_write(args.receipt, value, exclusive=True)


def mutate_receipt(path: Path) -> dict[str, Any]:
    value = load(path)
    validate_build_receipt(value, require_pair=False)
    if value["status"] != "in_progress":
        raise SystemExit("receipt is not in progress")
    return value


def command_build_resume(args: argparse.Namespace) -> None:
    value = load(args.receipt)
    validate_build_receipt(value, require_pair=False)
    if value["status"] == "complete":
        return
    if value["status"] == "failed_partial":
        value.setdefault("failures", []).append(value.pop("failure"))
        value["status"] = "in_progress"
        value["updated"] = now()
        atomic_write(args.receipt, value)


def command_build_source_object(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt)
    if value.get("source_object") is not None:
        raise SystemExit("immutable source object is already recorded")
    if args.md5_hash != value["source_archive_md5"]:
        raise SystemExit("uploaded source object MD5 does not match archive")
    value["source_object"] = {"bucket": args.bucket, "object": args.object, "generation": args.generation, "md5_hash": args.md5_hash}
    value["updated"] = now()
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_intent(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt); item = value["components"].get(args.component)
    if item is None or item["state"] != "pending": raise SystemExit("component is not awaiting a submission intent")
    if not SUBMISSION_INTENT.fullmatch(args.intent): raise SystemExit("invalid submission intent")
    item.update({"state": "intent_recorded", "submission_intent": args.intent, "updated": now()}); value["updated"] = item["updated"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_created(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt); item = value["components"].get(args.component)
    if item is None or item["state"] != "intent_recorded": raise SystemExit("component has no durable submission intent")
    item.update({"state": "submitted", "build_id": args.build_id, "updated": now()}); value["updated"] = item["updated"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_submit(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt); item = value["components"].get(args.component)
    if item is None or item["state"] != "submitted": raise SystemExit("component is not awaiting build success")
    item.update({"state": "build_succeeded", "updated": now()}); value["updated"] = item["updated"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_source(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt)
    item = value["components"].get(args.component)
    if item is None or item["state"] != "build_succeeded":
        raise SystemExit("component has no successful build awaiting source verification")
    if args.md5_hash != value["source_archive_md5"]:
        raise SystemExit("Cloud Build source object MD5 does not match pre-hashed archive")
    item["source_provenance"] = {"bucket": args.bucket, "object": args.object, "generation": args.generation, "md5_hash": args.md5_hash}
    item["updated"] = now(); value["updated"] = item["updated"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_digest(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt)
    item = value["components"].get(args.component)
    if item is None or item["state"] != "build_succeeded" or "source_provenance" not in item:
        raise SystemExit("component source is not verified")
    item.update({"state": "digest_resolved", "digest": args.digest, "updated": now()})
    value["updated"] = item["updated"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_record(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt)
    item = value["components"].get(args.component)
    if item is None or item["state"] != "digest_resolved":
        raise SystemExit("component digest is not awaiting recording")
    item["state"] = "recorded"; item["updated"] = now(); value["updated"] = item["updated"]
    value["images"][args.component] = {"image": item["image"], "tag": value["tag"], "digest": item["digest"], "build_id": item["build_id"]}
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_finish(args: argparse.Namespace) -> None:
    value = mutate_receipt(args.receipt)
    if any(item["state"] != "recorded" for item in value["components"].values()):
        raise SystemExit("cannot complete receipt before every requested build is recorded")
    value["status"] = "complete"; value["completed"] = now(); value["updated"] = value["completed"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_build_fail(args: argparse.Namespace) -> None:
    value = load(args.receipt); validate_build_receipt(value, require_pair=False)
    if value["status"] == "complete": return
    value["status"] = "failed_partial"
    value["failure"] = {"phase": args.phase, "exit_code": args.exit_code, "recorded": now()}
    value["updated"] = value["failure"]["recorded"]
    validate_build_receipt(value, require_pair=False); atomic_write(args.receipt, value)


def command_validate(args: argparse.Namespace) -> None:
    data = args.receipt.read_bytes(); value = json.loads(data)
    if not isinstance(value, dict): raise SystemExit("expected receipt object")
    validate_build_receipt(value, require_pair=args.require_pair)
    print(hashlib.sha256(data).hexdigest())


def write_bytes_exclusive(path: Path, data: bytes, mode: int = 0o400) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data); stream.flush(); os.fsync(stream.fileno())
    except BaseException:
        path.unlink(missing_ok=True); raise


def release_identity(data: bytes, receipt: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "build_receipt_sha256": hashlib.sha256(data).hexdigest(),
        "source_sha": receipt["source_sha"],
        "source_archive_sha256": receipt["source_archive_sha256"],
        "source_archive_md5": receipt["source_archive_md5"],
        "routing_artifact_manifest_sha256": receipt["routing_artifact_manifest_sha256"],
        "image_tag": receipt["tag"],
        "run_tag": receipt["cloud_run_tag"],
        "created": receipt["created"],
        "completed": receipt["completed"],
        "source_object": receipt["source_object"],
        "images": {
            component: {
                "repository": image["image"], "digest": image["digest"], "tag": image["tag"],
                "build_id": image["build_id"],
                "submission_intent": receipt["components"][component]["submission_intent"],
                "source_provenance": receipt["components"][component]["source_provenance"],
            }
            for component, image in receipt["images"].items()
        },
    }


def validate_release_identity(identity: dict[str, Any]) -> None:
    if identity.get("schema_version") != 1 or not HEX256.fullmatch(str(identity.get("build_receipt_sha256", ""))):
        raise SystemExit("invalid release identity schema or receipt hash")
    if not SHA.fullmatch(str(identity.get("source_sha", ""))) or not HEX256.fullmatch(str(identity.get("source_archive_sha256", ""))):
        raise SystemExit("invalid release source identity")
    if not MD5_B64.fullmatch(str(identity.get("source_archive_md5", ""))) or not HEX256.fullmatch(str(identity.get("routing_artifact_manifest_sha256", ""))):
        raise SystemExit("invalid release artifact identity")
    created = canonical_timestamp(identity.get("created"), "identity.created"); completed = canonical_timestamp(identity.get("completed"), "identity.completed")
    if completed < created: raise SystemExit("release identity completion predates creation")
    stamp = created.strftime("%Y%m%dt%H%M%Sz"); source_sha = identity["source_sha"]
    if identity.get("image_tag") != f"fullgenome-{source_sha[:12]}-{stamp}" or identity.get("run_tag") != f"fg-{source_sha[:8]}-{stamp}":
        raise SystemExit("release tag does not match source identity")
    if not IMAGE_TAG.fullmatch(str(identity.get("image_tag", ""))) or not RUN_TAG.fullmatch(str(identity.get("run_tag", ""))):
        raise SystemExit("invalid release tag identity")
    source_object = identity.get("source_object")
    if not isinstance(source_object, dict) or not source_object.get("bucket") or not source_object.get("object") or not str(source_object.get("generation", "")).isdigit() or source_object.get("md5_hash") != identity["source_archive_md5"]:
        raise SystemExit("invalid release source object")
    images = identity.get("images")
    if not isinstance(images, dict) or set(images) != set(EXPECTED_IMAGES): raise SystemExit("release identity requires paired images")
    for component, image in images.items():
        expected = EXPECTED_IMAGES[component]
        if image.get("repository") != expected or image.get("tag") != identity["image_tag"]:
            raise SystemExit(f"invalid {component} release image identity")
        if not DIGEST.fullmatch(str(image.get("digest", ""))) or not BUILD_ID.fullmatch(str(image.get("build_id", ""))):
            raise SystemExit(f"invalid {component} release build identity")
        if not SUBMISSION_INTENT.fullmatch(str(image.get("submission_intent", ""))): raise SystemExit(f"invalid {component} release submission intent")
        if image.get("source_provenance") != source_object: raise SystemExit(f"invalid {component} source provenance")


def command_snapshot(args: argparse.Namespace) -> None:
    data = args.source.read_bytes(); value = json.loads(data)
    if not isinstance(value, dict): raise SystemExit("expected receipt object")
    validate_build_receipt(value, require_pair=True); write_bytes_exclusive(args.destination, data)
    print(hashlib.sha256(data).hexdigest())


def command_identity_init(args: argparse.Namespace) -> None:
    # This is the sole parse/hash boundary for the caller's receipt. All release work
    # consumes the resulting complete identity object, not later receipt path reads.
    data = args.receipt.read_bytes(); receipt = json.loads(data)
    if not isinstance(receipt, dict): raise SystemExit("expected receipt object")
    validate_build_receipt(receipt, require_pair=True)
    identity = release_identity(data, receipt); validate_release_identity(identity)
    write_bytes_exclusive(args.snapshot, data); atomic_write(args.identity, identity, exclusive=True)
    print(identity["build_receipt_sha256"])


def command_identity_check(args: argparse.Namespace) -> None:
    identity = load(args.identity); validate_release_identity(identity)
    actual = hashlib.sha256(args.snapshot.read_bytes()).hexdigest()
    if actual != identity["build_receipt_sha256"]: raise SystemExit("receipt evidence changed after identity derivation")


def command_assert_mutation(args: argparse.Namespace) -> None:
    command_identity_check(args)
    identity = load(args.identity); image = identity["images"].get(args.component)
    if args.tag != identity["run_tag"] or image is None or args.image != f"{image['repository']}@{image['digest']}":
        raise SystemExit("remote mutation inputs differ from stable release identity")


def command_journal_init(args: argparse.Namespace) -> None:
    identity = load(args.identity); validate_release_identity(identity)
    journal_images = {component: {"image": image["repository"], "tag": image["tag"], "digest": image["digest"], "build_id": image["build_id"]} for component, image in identity["images"].items()}
    value = {
        "schema_version": 1, "status": "in_progress", "phase": "preflight_complete", "created": now(), "updated": now(),
        "run_tag": identity["run_tag"], "build_receipt_sha256": identity["build_receipt_sha256"],
        "source_sha": identity["source_sha"], "source_archive_sha256": identity["source_archive_sha256"],
        "routing_artifact_manifest_sha256": identity["routing_artifact_manifest_sha256"], "image_tag": identity["image_tag"],
        "images": journal_images, "builds": {key: item["build_id"] for key, item in identity["images"].items()},
        "submission_intents": {key: item["submission_intent"] for key, item in identity["images"].items()}, "services": {},
    }
    atomic_write(args.journal, value, exclusive=True)


def command_verify_bindings(args: argparse.Namespace) -> None:
    identity = load(args.identity); validate_release_identity(identity)
    provenance = load(args.provenance); journal = load(args.journal); receipt_hash = identity["build_receipt_sha256"]
    for value, label in ((provenance, "provenance"), (journal, "journal")):
        if value.get("build_receipt_sha256") != receipt_hash: raise SystemExit(f"{label} receipt hash mismatch")
        for field in ("source_sha", "source_archive_sha256", "routing_artifact_manifest_sha256"):
            if value.get(field) != identity[field]: raise SystemExit(f"{label} {field} mismatch")
    if provenance.get("image_tag") != identity["image_tag"] or provenance.get("cloud_run_tag") != identity["run_tag"]:
        raise SystemExit("provenance tag identity mismatch")
    if journal.get("image_tag") != identity["image_tag"] or journal.get("run_tag") != identity["run_tag"]:
        raise SystemExit("journal tag identity mismatch")
    expected_images = {component: {"image": image["repository"], "tag": image["tag"], "digest": image["digest"], "build_id": image["build_id"]} for component, image in identity["images"].items()}
    expected_intents = {key: value["submission_intent"] for key, value in identity["images"].items()}
    if journal.get("images") != expected_images or journal.get("builds") != {k: v["build_id"] for k, v in identity["images"].items()} or journal.get("submission_intents") != expected_intents:
        raise SystemExit("journal image/build/intent identity mismatch")
    for component, image in identity["images"].items():
        verified = provenance.get("images", {}).get(component, {})
        expected = {key: image[key] for key in ("repository", "digest", "tag", "build_id")}
        if any(verified.get(key) != value for key, value in expected.items()) or verified.get("submission_intent") != image["submission_intent"]: raise SystemExit(f"provenance {component} image identity mismatch")
        if verified.get("source_provenance") != image["source_provenance"]:
            raise SystemExit(f"provenance {component} source identity mismatch")


def command_journal_patch(args: argparse.Namespace) -> None:
    value = load(args.journal); patch = json.loads(args.patch)
    if not isinstance(patch, dict): raise SystemExit("journal patch must be an object")
    value.update(patch); value["updated"] = now(); atomic_write(args.journal, value)


def command_journal_service(args: argparse.Namespace) -> None:
    value = load(args.journal); service = value.setdefault("services", {}).setdefault(args.component, {})
    service.update(json.loads(args.patch)); value["phase"] = args.phase; value["updated"] = now(); atomic_write(args.journal, value)


def command_copy(args: argparse.Namespace) -> None:
    atomic_write(args.destination, load(args.source), exclusive=args.exclusive)


def command_get(args: argparse.Namespace) -> None:
    value: Any = load(args.path)
    for part in args.field.split("."):
        if not isinstance(value, dict) or part not in value: raise SystemExit(f"missing field: {args.field}")
        value = value[part]
    if isinstance(value, (dict, list)): print(json.dumps(value, separators=(",", ":")))
    elif isinstance(value, bool): print(str(value).lower())
    elif value is None: print("null")
    else: print(value)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(); commands = root.add_subparsers(dest="command", required=True)
    p = commands.add_parser("build-init")
    for name in ("receipt", "source_sha", "archive_sha256", "archive_md5", "tag", "cloud_run_tag", "created", "routing_sha256", "components"):
        p.add_argument(name, type=Path if name == "receipt" else str)
    p.set_defaults(func=command_build_init)
    p = commands.add_parser("build-resume"); p.add_argument("receipt", type=Path); p.set_defaults(func=command_build_resume)
    p = commands.add_parser("build-source-object"); p.add_argument("receipt", type=Path); p.add_argument("bucket"); p.add_argument("object"); p.add_argument("generation"); p.add_argument("md5_hash"); p.set_defaults(func=command_build_source_object)
    p = commands.add_parser("build-intent"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.add_argument("intent"); p.set_defaults(func=command_build_intent)
    p = commands.add_parser("build-created"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.add_argument("build_id"); p.set_defaults(func=command_build_created)
    p = commands.add_parser("build-submit"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.set_defaults(func=command_build_submit)
    p = commands.add_parser("build-source"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.add_argument("bucket"); p.add_argument("object"); p.add_argument("generation"); p.add_argument("md5_hash"); p.set_defaults(func=command_build_source)
    p = commands.add_parser("build-digest"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.add_argument("digest"); p.set_defaults(func=command_build_digest)
    p = commands.add_parser("build-record"); p.add_argument("receipt", type=Path); p.add_argument("component"); p.set_defaults(func=command_build_record)
    p = commands.add_parser("build-finish"); p.add_argument("receipt", type=Path); p.set_defaults(func=command_build_finish)
    p = commands.add_parser("build-fail"); p.add_argument("receipt", type=Path); p.add_argument("phase"); p.add_argument("exit_code", type=int); p.set_defaults(func=command_build_fail)
    p = commands.add_parser("validate"); p.add_argument("receipt", type=Path); p.add_argument("--require-pair", action="store_true"); p.set_defaults(func=command_validate)
    p = commands.add_parser("snapshot"); p.add_argument("source", type=Path); p.add_argument("destination", type=Path); p.set_defaults(func=command_snapshot)
    p = commands.add_parser("identity-init"); p.add_argument("receipt", type=Path); p.add_argument("snapshot", type=Path); p.add_argument("identity", type=Path); p.set_defaults(func=command_identity_init)
    p = commands.add_parser("identity-check"); p.add_argument("identity", type=Path); p.add_argument("snapshot", type=Path); p.set_defaults(func=command_identity_check)
    p = commands.add_parser("assert-mutation"); p.add_argument("identity", type=Path); p.add_argument("snapshot", type=Path); p.add_argument("component"); p.add_argument("tag"); p.add_argument("image"); p.set_defaults(func=command_assert_mutation)
    p = commands.add_parser("journal-init"); p.add_argument("journal", type=Path); p.add_argument("identity", type=Path); p.set_defaults(func=command_journal_init)
    p = commands.add_parser("verify-bindings"); p.add_argument("identity", type=Path); p.add_argument("provenance", type=Path); p.add_argument("journal", type=Path); p.set_defaults(func=command_verify_bindings)
    p = commands.add_parser("journal-patch"); p.add_argument("journal", type=Path); p.add_argument("patch"); p.set_defaults(func=command_journal_patch)
    p = commands.add_parser("journal-service"); p.add_argument("journal", type=Path); p.add_argument("component"); p.add_argument("phase"); p.add_argument("patch"); p.set_defaults(func=command_journal_service)
    p = commands.add_parser("copy"); p.add_argument("source", type=Path); p.add_argument("destination", type=Path); p.add_argument("--exclusive", action="store_true"); p.set_defaults(func=command_copy)
    p = commands.add_parser("get"); p.add_argument("path", type=Path); p.add_argument("field"); p.set_defaults(func=command_get)
    return root


if __name__ == "__main__":
    args = parser().parse_args(); args.func(args)
