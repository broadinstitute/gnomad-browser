#!/usr/bin/env python3

# Get file size and MD5 hash for a file in a Google Storage bucket.

import argparse
import base64
import json
import subprocess

ONE_GIBIBYTE = 2 ** 30
ONE_MEBIBYTE = 2 ** 20


def fetch_metadata(url):
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
    parser.add_argument("url", nargs="+")
    args = parser.parse_args()

    for url in args.url:
        info = fetch_metadata(url)
        print(json.dumps(info))


if __name__ == "__main__":
    main()
