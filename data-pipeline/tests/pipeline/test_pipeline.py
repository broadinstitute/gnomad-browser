from loguru import logger
import pytest
import tempfile
import hail as hl


data_1 = [
    {"a": 5, "b": 10},
    {"a": 0, "b": 200},
    {"a": 66, "b": 500},
]

ht_1 = hl.Table.parallelize(hl.literal(data_1, "array<struct{a: int, b: int}>"))
ht_1 = ht_1.key_by("a")
ht_1_globals = {
    "metadata": {"color": "green", "date": "yesterday", "release": "2"},
}
ht_1 = ht_1.annotate_globals(**ht_1_globals)

data_2 = [
    {"a": 5, "c": "foo"},
    {"a": 2, "c": "bar"},
    {"a": 66, "c": "baz"},
]

ht_2 = hl.Table.parallelize(hl.literal(data_2, "array<struct{a: int, c: str}>"))
ht_2 = ht_2.key_by("a")


@pytest.fixture
def input_dir():
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def output_dir():
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


def test_config(input_dir, output_dir):
    logger.info(input_dir)
    logger.info(output_dir)
    pass


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
