#!/usr/bin/env python3

"""
Use this script to get sizes and MD5 hashes for objects listed on the downloads page.

Usage:

./get_object_metadata.py gs://bucket/file_1 gs://bucket/file_2 ...
"""

import argparse
import base64
import json
import subprocess


ONE_GIBIBYTE = 2 ** 30
ONE_MEBIBYTE = 2 ** 20


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("urls", metavar="url", nargs="+")
    args = parser.parse_args()

    for url in args.urls:
        info = fetch_object_metadata(url)
        print(json.dumps(info))


if __name__ == "__main__":
    main()
