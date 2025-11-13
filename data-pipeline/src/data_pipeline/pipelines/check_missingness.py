import argparse
import sys

import hail as hl

from data_pipeline.helpers.datasets_config import DATASETS_CONFIG
from data_pipeline.pipeline import _pipeline_config


def get_n_columns(table):
    return len(list(table.row.items()))


def decompose_table(table):
    table = table.flatten()
    for column in table.row.items():
        column_name = column[0]
        column_type = str(column[1].dtype)
        if column_type.startswith("array<") or column_type.startswith("set<"):
            table = table.explode(column_name)
    return table


def extract_missingness(dataset, columns):
    dataset_config = DATASETS_CONFIG[dataset]
    table = dataset_config["get_table"]()
    table = table.key_by()

    if columns != None:
        select_params = {name: name for name in columns}
        table = table.select(**select_params)

    table = table.expand_types()

    previous_n_columns = -1
    n_columns = get_n_columns(table)
    while n_columns > previous_n_columns:
        previous_n_columns = n_columns
        table = decompose_table(table)
        n_columns = get_n_columns(table)

    aggregation_params = {
        column_name: hl.agg.any(hl.is_missing(table[column_name])) for column_name in table.row.keys()
    }

    missingness = table.aggregate(hl.struct(**aggregation_params))
    return missingness


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--datasets", required=True)
    parser.add_argument("--columns", required=False)
    parser.add_argument("--output-root", required=False)

    args = parser.parse_args(argv)
    # TODO: clean this up
    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    datasets = args.datasets.split(",")
    unknown_datasets = [d for d in datasets if d not in DATASETS_CONFIG.keys()]
    if unknown_datasets:
        raise RuntimeError(f"Unknown datasets: {', '.join(unknown_datasets)}")

    columns = args.columns.split(",") if args.columns else None

    for dataset in datasets:
        print(extract_missingness(dataset, columns))


if __name__ == "__main__":
    main(sys.argv[1:])
