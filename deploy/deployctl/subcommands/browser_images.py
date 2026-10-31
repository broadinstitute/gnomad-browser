import argparse
import os
import subprocess
import sys
import typing

from deployctl.config import config
from deployctl.tag import PARQUET_TAG_SUFFIX, get_tag_from_git_revision


def build_images(tag: str = None, push: bool = False, with_parquet: bool = False) -> None:
    repository_root = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../.."))

    if not tag:
        tag = get_tag_from_git_revision()

    # The Parquet API image must never take the plain tag or `latest`, which deployments of the
    # Elasticsearch-only API resolve to.
    api_tag = f"{tag.removesuffix(PARQUET_TAG_SUFFIX)}{PARQUET_TAG_SUFFIX}" if with_parquet else tag

    frontend_dockerfile_path = "deploy/dockerfiles/browser/browser.dockerfile"
    api_dockerfile_path = "deploy/dockerfiles/browser/api.dockerfile"

    images = [
        (frontend_dockerfile_path, config.browser_image_repository, [tag, "latest"]),
        (api_dockerfile_path, config.api_image_repository, [api_tag] if with_parquet else [tag, "latest"]),
    ]

    for dockerfile_path, image_repository, image_tags in images:
        build_command = [
            "docker",
            "build",
            "--pull",
            f"--file={dockerfile_path}",
            *[f"--tag={image_repository}:{image_tag}" for image_tag in image_tags],
        ]

        if with_parquet and dockerfile_path == api_dockerfile_path:
            build_command.extend(["--target", "parquet-api"])

        build_command.append(".")

        subprocess.check_call(
            build_command,
            cwd=repository_root,
            env=dict(os.environ, DOCKER_BUILDKIT="1"),
        )

    if push:
        for _, image_repository, image_tags in images:
            subprocess.check_call(["docker", "push", f"{image_repository}:{image_tags[0]}"])

    for _, image_repository, image_tags in images:
        for image_tag in image_tags:
            print(f"Tagged {image_repository}:{image_tag}")

    if push:
        for _, image_repository, image_tags in images:
            print(f"Pushed {image_repository}:{image_tags[0]}")


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    build_parser = subparsers.add_parser("build")
    build_parser.set_defaults(action=build_images)
    build_parser.add_argument("--tag")
    build_parser.add_argument("--push", action="store_true")
    build_parser.add_argument(
        "--with-parquet",
        action="store_true",
        help="Build the API image with the native Parquet data store addon, tagged <tag>-parquet and never latest",
    )

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
