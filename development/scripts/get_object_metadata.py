#!/usr/bin/env python3

"""
Use this script to get sizes and MD5 hashes for objects listed on the downloads page.

Usage:

python ./get_object_metadata.py --urls gs://bucket/file_1 gs://bucket/file_2 ...

python ./get_object_metadata.py --bucket gs://gcp-public-data--gnomad/release/4.1/vcf/exomes
"""

import argparse
import base64
import json
import subprocess


ONE_GIBIBYTE = 2**30
ONE_MEBIBYTE = 2**20


def fetch_object_metadata(url):
    output = subprocess.check_output(["gsutil", "stat", url]).decode("utf8")

    info = {}

    lines = output.split("\n")
    for line in lines:
        if not line:
            continue

        label, value = [s.strip() for s in line.split(":", 1)]

        if label == "Content-Length":
            size = int(value)
            if size >= ONE_GIBIBYTE:
                info["size"] = f"{round(size / ONE_GIBIBYTE, 2)} GiB"
            else:
                info["size"] = f"{round(size / ONE_MEBIBYTE, 2)} MiB"

        if label == "Hash (md5)":
            info["md5"] = base64.b64decode(value).hex()

    return info


def fetch_object_metadata_from_bucket(bucket_prefix):
    output = subprocess.check_output(["gsutil", "ls", "-L", bucket_prefix]).decode("utf8")

    aggregated_info = {}

    lines = output.split("\n")
    current_filename = None
    for line in lines:
        if line.startswith("gs://"):
            current_filename = line.split("/")[-1]
            aggregated_info[current_filename] = {}
        elif line.strip().startswith("Content-Length:"):
            size = int(line.split(":")[1].strip())
            if size >= ONE_GIBIBYTE:
                aggregated_info[current_filename]["size"] = f"{round(size / ONE_GIBIBYTE, 2)} GiB"
            else:
                aggregated_info[current_filename]["size"] = f"{round(size / ONE_MEBIBYTE, 2)} MiB"
        elif line.strip().startswith("Hash (md5):"):
            md5_hash = line.split(":")[1].strip()
            aggregated_info[current_filename]["md5"] = base64.b64decode(md5_hash).hex()

    return aggregated_info


def main():
    parser = argparse.ArgumentParser()

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--urls", metavar="url", nargs="+")
    group.add_argument("--bucket")
    args = parser.parse_args()

    if args.urls:
        for url in args.urls:
            info = fetch_object_metadata(url)
            print(json.dumps(info))
    elif args.bucket:
        aggregated_info = fetch_object_metadata_from_bucket(args.bucket)
        if ":" in aggregated_info:
            del aggregated_info[":"]
        aggregated_info = {k: v for k, v in aggregated_info.items() if not k.endswith("tbi:")}

        sorted_filenames = sorted(
            aggregated_info.keys(),
            key=lambda x: (
                (int(x.split(".")[5][3:]) if x.split(".")[5][3:].isdigit() else float("inf")),
                x.split(".")[3],
            ),
        )

        print(f"Results for {args.bucket}\n")
        print("[")
        for i, filename in enumerate(sorted_filenames):
            if not filename.endswith(".tbi:"):
                line = f"    {{ chrom: '{filename.split('.')[5][3:]}', size: {json.dumps(aggregated_info[filename]['size'])}, md5: {json.dumps(aggregated_info[filename]['md5'])} }}"
                print(line + "," if i < len(sorted_filenames) - 1 else line)
        print("]")


if __name__ == "__main__":
    main()
