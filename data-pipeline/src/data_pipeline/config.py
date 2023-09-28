import attr
from enum import Enum


class DataEnvironment(Enum):
    mock = "mock"
    full = "full"


def get_data_environment(env_value: str) -> DataEnvironment:
    try:
        # Using the Enum's name to get the actual enum item.
        return DataEnvironment[env_value]
    except KeyError:
        valid_options = ", ".join([e.name for e in DataEnvironment])
        raise ValueError(f"Invalid value '{env_value}'. Allowed values are: {valid_options}")


def is_valid_fn(cls):
    def is_valid(instance, attribute, value):
        if not isinstance(value, cls):
            raise ValueError(f"Expected {cls} enum, got {type(value)}")

    return is_valid


@attr.define
class PipelineConfig:
    name: str
    input_root: str
    output_root: str
