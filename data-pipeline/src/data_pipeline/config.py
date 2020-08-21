import json
import typing


# This configuration file will be read in three places:
# 1. By pipelinectl when starting a pipeline
# 2. By pipelines running locally
# 3. By pipelines running on a Dataproc cluster
#
# In the first case, pipelinectl creates its own Configuration instance using an absolute path to pipeline_config.json.
# In the second and third cases, pipeline_config.json should be in the current working directory.
# When running locally, pipelinectl sets the working directory to the directory containing pipeline_config.json.
# When running on a Dataproc cluster, pipeline_config.json is uploaded to the Dataproc cluster using
# `gcloud dataproc jobs submit --files`. This places it in the job's working directory.
_CONFIG_PATH = "pipeline_config.json"


# @dataclasses.dataclass
class Configuration:
    configurable_values = [
        "staging_path",
        "project",
        "cluster_zone",
    ]

    # Output settings
    staging_path: str = None

    # Dataproc cluster settings
    project: str = None
    cluster_zone: str = "us-central1-a"

    def __init__(self, config_path):
        self._config_path = config_path
        try:
            self.load()
        except FileNotFoundError:
            pass

    def dump(self) -> typing.Mapping[str, str]:
        _config = {}
        for field in self.configurable_values:  # pylint: disable=no-member
            _config[field] = getattr(self, field)

        return _config

    def load(self):
        with open(self._config_path, "r") as config_file:
            _config = json.load(config_file)
            for field in self.configurable_values:  # pylint: disable=no-member
                setattr(self, field, _config[field])

    def save(self):
        with open(self._config_path, "w") as config_file:
            json.dump(self.dump(), config_file, indent=2)

    @property
    def cluster_region(self):
        return self.cluster_zone.rsplit("-", maxsplit=1)[0]


config = Configuration(_CONFIG_PATH)  # pylint: disable=invalid-name
