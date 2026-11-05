import argparse
import logging
import sys

from data_pipeline.helpers.datasets_config import DATASETS_CONFIG
from data_pipeline.helpers.parquet_export import (
    export_table_to_parquet, export_variants_to_parquet,
)
from data_pipeline.pipeline import _pipeline_config

logger = logging.getLogger("gnomad_data_pipeline")


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--datasets", required=True)
    args = parser.parse_args(argv)

    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    datasets = args.datasets.split(",")
    unknown_datasets = [d for d in datasets if d not in DATASETS_CONFIG.keys()]
    if unknown_datasets:
        raise RuntimeError(f"Unknown datasets: {', '.join(unknown_datasets)}")

    for dataset in datasets:
        logger.info("exporting dataset %s to parquet", dataset)
        output_path = f"{_pipeline_config['output_root']}/parquet/raw/{dataset}"
        logger.info(f"output path: {output_path}")
        dataset_config = DATASETS_CONFIG[dataset]
        table = dataset_config["get_table"]()

        if dataset == "gnomad_v4_variants":
            export_variants_to_parquet(table, output_path)
        else:    
            export_table_to_parquet(table, output_path, **dataset_config.get("parquet_args", {}))


if __name__ == "__main__":
    main(sys.argv[1:])
