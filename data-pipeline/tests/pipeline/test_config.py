# from loguru import logger
import os
import pytest
import tempfile

from data_pipeline.config import ComputeEnvironment, DataEnvironment, DataPaths, PipelineConfig

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


# @pytest.mark.only
# def test_pipeline_tasks(ht_1_fixture: TestHt, ht_2_fixture: TestHt):
#     def task_1_fn():
#         pass

#     pipeline = Pipeline("p1")

#     pipeline.add_task(
#         name="task_1_join_hts",
#         task_function=task_1_fn,
#         output_path="/gnomad_v4/gnomad_v4_exome_variants_base.ht",
#         inputs={
#             "input_ht_1": ht_1_fixture.path,
#         },
#     )
