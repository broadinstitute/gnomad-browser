import logging
import os
import tempfile

DATA_DIRECTORY = os.getenv("DATA_DIRECTORY")
if not DATA_DIRECTORY:
    raise EnvironmentError("DATA_DIRECTORY configuration is required")

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

COLLECT_TEMP_DIR = os.getenv("COLLECT_TEMP_DIR", tempfile.gettempdir())

HAIL_LOG_PATH = os.getenv("HAIL_LOG_PATH", "/dev/null")

HAIL_N_CPUS = 1

HAIL_SPARK_CONF = {}
_hail_spark_conf = os.getenv("HAIL_SPARK_CONF", None)
if _hail_spark_conf:
    HAIL_SPARK_CONF = {k: v for k, v in (prop.split(":") for prop in _hail_spark_conf.split(","))}

logging.basicConfig(level=logging.INFO)
