import argparse
import os
import sys
import typing

from deployctl.config import config
from deployctl.shell import kubectl, get_most_recent_tag, image_exists


KUSTOMIZATION_TEMPLATE = """---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
images:
  - name: gnomad-blog
    newName: {blog_image_repository}
    newTag: '{blog_tag}'
  - name: gnomad-blog-auth
    newName: {blog_auth_image_repository}
    newTag: '{blog_auth_tag}'
"""


def get_deployment_directory() -> str:
    path = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests/blog/deployment"))
    if not os.path.exists(path):
        os.makedirs(path)
    return path


def update_deployment(tag: str = None, auth_tag: str = None) -> None:
    deployment_directory = get_deployment_directory()

    if tag:
        if not image_exists(config.blog_image_repository, tag):
            raise RuntimeError(f"could not find image {config.blog_image_repository}:{tag}")
    else:
        tag = get_most_recent_tag(config.blog_image_repository)
        print(f"No blog tag provided, using most recent ({tag})")

    if auth_tag:
        if not image_exists(config.blog_auth_image_repository, auth_tag):
            raise RuntimeError(f"could not find image {config.blog_auth_image_repository}:{auth_tag}")
    else:
        auth_tag = get_most_recent_tag(config.blog_auth_image_repository)
        print(f"No auth tag provided, using most recent ({auth_tag})")

    with open(os.path.join(deployment_directory, "kustomization.yaml"), "w") as kustomization_file:
        kustomization = KUSTOMIZATION_TEMPLATE.format(
            blog_image_repository=config.blog_image_repository,
            blog_tag=tag,
            blog_auth_image_repository=config.blog_auth_image_repository,
            blog_auth_tag=auth_tag,
        )

        kustomization_file.write(kustomization)


def apply_deployment() -> None:
    deployment_directory = get_deployment_directory()

    if not os.path.exists(deployment_directory):
        raise RuntimeError("no configuration for blog deployment")

    kubectl(["apply", "-k", deployment_directory])


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    create_parser = subparsers.add_parser("update")
    create_parser.set_defaults(action=update_deployment)
    create_parser.add_argument("--tag")
    create_parser.add_argument("--auth-tag")

    apply_parser = subparsers.add_parser("apply")
    apply_parser.set_defaults(action=apply_deployment)

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
