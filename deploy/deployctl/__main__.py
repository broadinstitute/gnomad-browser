#!/usr/bin/env python3

import argparse
import sys

from deployctl.subcommands import browser_deployments
from deployctl.subcommands import browser_images
from deployctl.subcommands import config
from deployctl.subcommands import data_pipeline
from deployctl.subcommands import dataproc_cluster
from deployctl.subcommands import elasticsearch
from deployctl.subcommands import ingress_demo
from deployctl.subcommands import ingress_production


def main():
    parser = argparse.ArgumentParser(prog="deployctl")

    subcommands = {
        "config": config,
        "deployments": browser_deployments,
        "images": browser_images,
        "production": ingress_production,
        "demo": ingress_demo,
        "data-pipeline": data_pipeline,
        "dataproc-cluster": dataproc_cluster,
        "elasticsearch": elasticsearch,
    }

    parser.add_argument("subcommand", choices=list(subcommands.keys()))

    args = parser.parse_args(sys.argv[1:2])

    subcommand = subcommands[args.subcommand]
    subcommand.main(sys.argv[2:])


if __name__ == "__main__":
    main()
