# from loguru import logger
import os
import pytest
import tempfile
import attr

from data_pipeline.config import ComputeEnvironment, DataEnvironment, DataPaths, PipelineConfig
from data_pipeline.pipeline import Pipeline

# from data_pipeline.pipeline import Pipeline


@pytest.fixture
def input_tmp():
    with tempfile.TemporaryDirectory() as temp_dir:
        with open(os.path.join(temp_dir, "sample_tiny.txt"), "w") as f:
            f.write("tiny dataset")
        with open(os.path.join(temp_dir, "sample_full.txt"), "w") as f:
            f.write("full dataset")
        yield temp_dir


@pytest.fixture
def output_tmp():
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.mark.only
def test_config_created(input_tmp, output_tmp):
    config = PipelineConfig.create(name="test", input_root=input_tmp, output_root=output_tmp)
    assert isinstance(config, PipelineConfig)
    assert isinstance(config.input_paths, DataPaths)
    assert isinstance(config.output_paths, DataPaths)
    assert isinstance(config.compute_env, ComputeEnvironment)
    assert isinstance(config.data_env, DataEnvironment)


@pytest.mark.only
def test_config_read_input_file(input_tmp, output_tmp):
    config = PipelineConfig.create(
        name="test",
        input_root=input_tmp,
        output_root=output_tmp,
    )
    sample = os.path.join(config.input_paths.root, "sample_tiny.txt")
    with open(sample, "r") as f:
        assert f.read() == "tiny dataset"


@attr.define
class WritableFile:
    text: str = "Hi"

    def update_text(self, text: str):
        self.text = text

    def write(self, path, overwrite=False):
        with open(path, "w") as f:
            f.write(self.text)


@pytest.mark.only
def test_pipeline_tasks(input_tmp, output_tmp):
    def task_1_fn(input_file_path):
        with open(input_file_path, "r") as f:
            input_data = f.read()
            output_data = WritableFile()
            output_data.update_text(f"{input_data} processed")
            return output_data

    config = PipelineConfig.create(name="pipeline1", input_root=input_tmp, output_root=output_tmp)

    pipeline = Pipeline(config=config)

    pipeline.add_task(
        name="process_data",
        task_function=task_1_fn,
        output_path="my_output.txt",
        inputs={
            "input_file_path": "sample_tiny.txt",
        },
    )

    pipeline.run()

    with open(os.path.join(output_tmp, "my_output.txt"), "r") as f:
        assert f.read() == "tiny dataset processed"
