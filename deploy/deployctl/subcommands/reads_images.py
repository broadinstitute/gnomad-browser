import argparse
import os
import subprocess
import sys
import typing

from deployctl.config import config
from deployctl.tag import get_tag_from_git_revision


def build_images(tag: str = None, push: bool = False) -> None:
    repository_root = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../.."))

    if not tag:
        tag = get_tag_from_git_revision()

    images = [
        ("deploy/dockerfiles/reads/reads-server.dockerfile", config.reads_server_image_repository),
        ("deploy/dockerfiles/reads/reads-api.dockerfile", config.reads_api_image_repository),
    ]

    for dockerfile_path, image_repository in images:
        subprocess.check_call(
            [
                "docker",
                "build",
                "--pull",
                f"--file={dockerfile_path}",
                f"--tag={image_repository}:{tag}",
                f"--tag={image_repository}:latest",
                ".",
            ],
            cwd=repository_root,
            env=dict(os.environ, DOCKER_BUILDKIT="1"),
        )

    if push:
        for dockerfile_path, image_repository in images:
            subprocess.check_call(["docker", "push", f"{image_repository}:{tag}"])

    for _, image_repository in images:
        print(f"Tagged {image_repository}:{tag}")
        print(f"Tagged {image_repository}:latest")

    if push:
        for _, image_repository in images:
            print(f"Pushed {image_repository}:{tag}")


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    build_parser = subparsers.add_parser("build")
    build_parser.set_defaults(action=build_images)
    build_parser.add_argument("--tag")
    build_parser.add_argument("--push", action="store_true")

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
