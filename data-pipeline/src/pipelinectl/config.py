import os

from data_pipeline.config import Configuration


# Use absolute path to configuration file
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../pipeline_config.json")

config = Configuration(_CONFIG_PATH)
