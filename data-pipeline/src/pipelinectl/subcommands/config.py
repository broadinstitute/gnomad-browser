import argparse
import sys
import typing

from pipelinectl.config import config


def list_config_values() -> None:
    for key, value in config.dump().items():
        display_value = value if value is not None else ""
        print(f"{key} = {display_value}")


def get_config_value(key: str) -> None:
    try:
        value = getattr(config, key)
        if value is not None:
            print(value)
    except AttributeError:
        raise AttributeError(f"invalid configuration key '{key}'")


def set_config_value(key: str, value: str) -> None:
    try:
        setattr(config, key, value)
        config.save()
    except AttributeError:
        raise AttributeError(f"invalid configuration key '{key}'")


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="pipelinectl config")
    subparsers = parser.add_subparsers()

    list_parser = subparsers.add_parser("list")
    list_parser.set_defaults(action=list_config_values)

    get_parser = subparsers.add_parser("get")
    get_parser.set_defaults(action=get_config_value)
    get_parser.add_argument("key")

    set_parser = subparsers.add_parser("set")
    set_parser.set_defaults(action=set_config_value)
    set_parser.add_argument("key")
    set_parser.add_argument("value")

    args = parser.parse_args(argv)

    if "action" not in args:
        parser.print_usage()
        sys.exit(1)

    action = args.action
    del args.action
    try:
        action(**vars(args))
    except Exception as err:  # pylint: disable=broad-except
        print(f"Error: {err}", file=sys.stderr)
        sys.exit(1)
