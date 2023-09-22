import json
import sys

from cattrs import unstructure
from loguru import logger


def create_logger():
    config = {
        "handlers": [
            {
                "sink": sys.stdout,
                "format": "<level>{time:YYYY-MM-DDTHH:mm}</level> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",  # noqa
            },
        ]
    }

    logger.configure(**config)
    logger.level("CONFIG", no=38, icon="🐍")

    # clear log file after each run
    open("out.log", "w")
    logger.add("out.log", backtrace=True, diagnose=True)


def log_json(obj):
    logger.info(json.dumps(unstructure(obj), indent=2))
