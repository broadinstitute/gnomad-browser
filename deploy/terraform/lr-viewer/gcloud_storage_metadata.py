#!/usr/bin/env python3
"""Normalize checksum fields emitted by supported gcloud storage JSON schemas."""

from __future__ import annotations

import base64
import binascii

MD5_ALIASES = ("md5_hash", "md5Hash")


def object_md5(metadata: dict) -> str:
    """Return one valid base64 MD5 value, rejecting missing or conflicting aliases."""
    if not isinstance(metadata, dict):
        raise ValueError("storage object metadata must be a JSON object")

    values: list[str] = []
    for field in MD5_ALIASES:
        if field not in metadata:
            continue
        value = metadata[field]
        if not isinstance(value, str) or not value:
            raise ValueError(f"storage object {field} checksum is empty or not a string")
        try:
            decoded = base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError(f"storage object {field} checksum is not valid base64 MD5") from error
        if len(decoded) != 16 or base64.b64encode(decoded).decode() != value:
            raise ValueError(f"storage object {field} checksum is not valid base64 MD5")
        values.append(value)

    if not values:
        raise ValueError("storage object metadata is missing an MD5 checksum")
    if len(set(values)) != 1:
        raise ValueError("storage object metadata has conflicting MD5 checksum aliases")
    return values[0]
