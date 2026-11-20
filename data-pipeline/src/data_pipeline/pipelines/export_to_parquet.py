import argparse
import logging
import sys

from data_pipeline.helpers.datasets_config import DATASETS_CONFIG
from data_pipeline.helpers.parquet_export import export_table_to_parquet
from data_pipeline.pipeline import _pipeline_config

logger = logging.getLogger("gnomad_data_pipeline")


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--datasets", required=True)
    parser.add_argument("--overwrite", action="store_true", help="Replace existing Parquet output")
    args = parser.parse_args(argv)

    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    datasets = args.datasets.split(",")
    unknown_datasets = [d for d in datasets if d not in DATASETS_CONFIG]
    if unknown_datasets:
        raise RuntimeError(f"Unknown datasets: {', '.join(unknown_datasets)}")

    for dataset in datasets:
        config = DATASETS_CONFIG[dataset]
        table = config.get("get_table_for_parquet", config["get_table"])()

        parquet_args = dict(config.get("parquet_args", {}))
        output_name = parquet_args.pop("output_name", dataset)
        output_path = f"{_pipeline_config['output_root']}/parquet/{output_name}"

        logger.info("exporting dataset %s to %s", dataset, output_path)
        export_table_to_parquet(table, output_path, overwrite=args.overwrite, **parquet_args)


if __name__ == "__main__":
    main(sys.argv[1:])
