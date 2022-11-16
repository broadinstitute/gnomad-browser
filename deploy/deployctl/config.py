import dataclasses
import json
import os
import typing


_CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../deploy_config.json"))


@dataclasses.dataclass
class Configuration:
    project: str = None
    zone: str = "us-central1-a"
    domain: str = None
    environment_tag: str = None
    authorized_networks: str = "0.0.0.0/0"
    data_pipeline_output: str = "gs://gnomad-browser-data-pipeline"
    data_snapshot_bucket: str = "gs://gnomad-browser-elasticsearch-snapshots"

    def __init__(self, config_path):
        self._config_path = config_path
        try:
            self.load()
        except FileNotFoundError:
            pass

    def config_keys(self):
        return self.__dataclass_fields__.keys()  # pylint: disable=no-member

    def dump(self) -> typing.Mapping[str, str]:
        _config = {}
        for field in self.config_keys():
            _config[field] = getattr(self, field)

        return _config

    def load(self):
        with open(self._config_path, "r") as config_file:
            _config = json.load(config_file)
            for field in self.config_keys():
                setattr(self, field, _config.get(field, None))

    def save(self):
        with open(self._config_path, "w") as config_file:
            json.dump(self.dump(), config_file, indent=2)

    @property
    def region(self):
        return self.zone.rsplit("-", maxsplit=1)[0]

    @property
    def network_name(self):
        if self.environment_tag:
            return f"gnomad-{self.environment_tag}"

        return "gnomad"

    @property
    def ip_address_name(self):
        if self.environment_tag:
            return f"gnomad-browser-{self.environment_tag}"

        return "gnomad-browser"

    @property
    def gke_service_account_name(self):
        return "gnomad-gke"

    @property
    def gke_service_account_full_name(self):
        return f"{self.gke_service_account_name}@{self.project}.iam.gserviceaccount.com"

    @property
    def gke_cluster_name(self):
        if self.environment_tag:
            return f"gnomad-{self.environment_tag}"

        return "gnomad"

    @property
    def kubectl_context(self):
        return f"gke_{self.project}_{self.zone}_{self.gke_cluster_name}"

    @property
    def api_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-api"

    @property
    def browser_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-browser"

    @property
    def reads_server_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-reads-server"

    @property
    def reads_api_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-reads-api"

    @property
    def blog_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-blog"

    @property
    def blog_auth_image_repository(self):
        return f"gcr.io/{self.project}/gnomad-blog-auth"


config = Configuration(_CONFIG_PATH)  # pylint: disable=invalid-name
