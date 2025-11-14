# Run this pipeline with `deployctl elasticsearch load-datasets`

import argparse
import logging
import subprocess
import sys

from data_pipeline.helpers.elasticsearch_export import export_table_to_elasticsearch
from data_pipeline.pipeline import _pipeline_config

from data_pipeline.helpers.datasets_config import DATASETS_CONFIG

logger = logging.getLogger("gnomad_data_pipeline")


def export_datasets(elasticsearch_host, elasticsearch_auth, datasets):
    base_args = {
        "host": elasticsearch_host,
        "auth": elasticsearch_auth,
    }

    for dataset in datasets:
        logger.info("exporting dataset %s", dataset)
        dataset_config = DATASETS_CONFIG[dataset]
        table = dataset_config["get_table"]()
        export_table_to_elasticsearch(table, **base_args, **dataset_config.get("args", {}))


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True)
    parser.add_argument("--secret", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--datasets", required=True)
    args = parser.parse_args(argv)

    # TODO: clean this up
    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    elasticsearch_password = subprocess.check_output(
        ["gcloud", "secrets", "versions", "access", "latest", f"--secret={args.secret}"]
    ).decode("utf8")

    datasets = args.datasets.split(",")
    unknown_datasets = [d for d in datasets if d not in DATASETS_CONFIG.keys()]
    if unknown_datasets:
        raise RuntimeError(f"Unknown datasets: {', '.join(unknown_datasets)}")

    export_datasets(
        elasticsearch_host=args.host, elasticsearch_auth=("elastic", elasticsearch_password), datasets=datasets
    )


if __name__ == "__main__":
    main(sys.argv[1:])
