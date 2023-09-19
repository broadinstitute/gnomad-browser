import os
from pathlib import Path
import hail as hl
from loguru import logger

from data_pipeline.pipelines.gnomad_v4_variants import (
    pipeline as gnomad_v4_variant_pipeline,
)

from data_pipeline.pipeline import Task

from data_pipeline.config import config


def make_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


SCHEMA_PATH = "schemas"

pipelines = [gnomad_v4_variant_pipeline]


def schema_writer(schema_path):
    def describe_handler(text):
        make_dir(os.path.dirname(schema_path))
        with open(schema_path, "w") as file:
            file.write(text)

    return describe_handler


for pipeline in pipelines:
    pipeline_name = pipeline.name
    task_names = pipeline.get_all_task_names()
    out_dir = os.path.join(SCHEMA_PATH, pipeline_name)

    for task_name in task_names:
        task = gnomad_v4_variant_pipeline.get_task(task_name)
        inputs = task.get_inputs()
        output_path = task.get_output_path()

        # logger.info(f"out dir {out_dir}")
        logger.info(f"task_name: {task}")
        logger.info(f"inputs {str(inputs)}")
        logger.info(f"output_path {str(output_path)}")

        tables = {
            **inputs,
            "output": output_path,
        }

        logger.info(tables)

        for table_name, table_path in tables.items():
            ht = hl.read_table(table_path)
            schema_path = os.path.join(
                SCHEMA_PATH, pipeline_name, task_name, table_name, f"{os.path.basename(table_path)}.schema"
            )
            describe_handler = schema_writer(schema_path)
            ht.describe(handler=describe_handler)
