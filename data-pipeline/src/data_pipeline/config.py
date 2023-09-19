import os
import attr
from pathlib import Path
from hail import Optional

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
        if "gs://" not in self.data_path:
            Path(self.data_path).mkdir(parents=True, exist_ok=True)


# @attr.define
# class GnomadV4
#     gnomad_v4_exome_variants_sites_ht_path: str = "external_datasets/mock_v4_release.ht"


@attr.define
class PipelineConfig:
    data_paths: DataPaths
    compute_env: str = "local"
    data_env: str = "tiny"


config = PipelineConfig(
    data_env="local",
    data_paths=DataPaths.create(os.path.join("data")),
)


if DATA_ENV == "dataproc":
    config = PipelineConfig(
        data_paths=DataPaths.create(os.path.join("gs://gnomad-matt-data-pipeline")),
    )
