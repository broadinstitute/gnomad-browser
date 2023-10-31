import os
from pathlib import Path
from typing import List
import hail as hl
from data_pipeline.pipeline import DownloadTask, Pipeline


def make_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


DEFAULT_SCHEMA_DIR = "schemas"


def schema_writer(schema_path):
    def describe_handler(text):
        make_dir(os.path.dirname(schema_path))
        with open(schema_path, "w") as file:
            file.write(text)

    return describe_handler


def write_schemas(pipelines: List[Pipeline], schema_dir: str = DEFAULT_SCHEMA_DIR, task_names: List[str] = []):
    for pipeline in pipelines:
        if pipeline.config:
            pipeline_name = pipeline.config.name
            all_task_names = pipeline.get_all_task_names()
            os.path.join(schema_dir, pipeline_name)

            for task_name in all_task_names:
                if task_name in task_names:
                    task = pipeline.get_task(task_name)
                    if type(task) != DownloadTask:
                        inputs = task.get_inputs()
                        output_path = task.get_output_path()

                        # logger.info(f"task_name: {task}")
                        # logger.info(f"inputs {str(inputs)}")
                        # logger.info(f"output_path {str(output_path)}")

                        tables = {
                            **inputs,
                            "output": output_path,
                        }

                        for table_name, table_path in tables.items():
                            if ".ht" in table_path:
                                ht = hl.read_table(table_path)
                                schema_path = os.path.join(
                                    schema_dir,
                                    pipeline_name,
                                    task_name,
                                    table_name,
                                    f"{os.path.basename(table_path)}.schema",
                                )
                                describe_handler = schema_writer(schema_path)
                                ht.describe(handler=describe_handler)
