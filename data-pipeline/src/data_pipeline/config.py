import os
import attr
from enum import Enum
from pathlib import Path

DATA_ENV = os.getenv("DATA_ENV", "local")


@attr.define
class DataPaths:
    root: str

    @classmethod
    def create(cls, root=None, **kwargs):
        dataset_paths = {}

        if root:
            dataset_attrs = attr.fields(DataPaths)

            for ds in dataset_attrs:
                if ds.name == "root":
                    dataset_paths.update({"root": root})

        for item, path in kwargs.items():
            if item in dataset_paths:
                dataset_paths.update({item: path})

        return cls(**dataset_paths)

    def make_local_folder(self):
        if "gs://" not in self.root:
            Path(self.root).mkdir(parents=True, exist_ok=True)


class ComputeEnvironment(Enum):
    local = "local"
    cicd = "cicd"
    dataproc = "dataproc"


class DataEnvironment(Enum):
    tiny = "tiny"
    full = "full"


def is_valid_fn(cls):
    def is_valid(instance, attribute, value):
        if not isinstance(value, cls):
            raise ValueError(f"Expected {cls} enum, got {type(value)}")

    return is_valid


@attr.define
class PipelineConfig:
    name: str
    input_paths: DataPaths
    output_paths: DataPaths
    data_env: DataEnvironment = attr.field(validator=is_valid_fn(DataEnvironment))
    compute_env: ComputeEnvironment = attr.field(validator=is_valid_fn(ComputeEnvironment))

    @classmethod
    def create(
        cls,
        name: str,
        input_root: str,
        output_root: str,
        data_env=DataEnvironment.tiny,
        compute_env=ComputeEnvironment.local,
    ):
        input_paths = DataPaths.create(input_root)
        output_paths = DataPaths.create(output_root)
        return cls(name, input_paths, output_paths, data_env, compute_env)


# config = PipelineConfig.create(
#     name=
#     input_root="data_in",
#     output_root="data_out",
#     compute_env=ComputeEnvironment.local,
#     data_env=DataEnvironment.tiny,
# )


# if DATA_ENV == "dataproc":
#     config = PipelineConfig(
#         output_path=DataPaths.create(os.path.join("gs://gnomad-matt-data-pipeline")),
#     )
