import argparse
import datetime
import glob
import os
import string
import sys
import typing

from deployctl.config import config
from deployctl.shell import kubectl, get_most_recent_tag, image_exists, get_k8s_deployments


KUSTOMIZATION_TEMPLATE = """---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
commonLabels:
  deployment: '{deployment_name}'
nameSuffix: '-{deployment_name}'
images:
  - name: gnomad-api
    newName: {api_image_repository}
    newTag: '{api_tag}'
  - name: gnomad-browser
    newName: {browser_image_repository}
    newTag: '{browser_tag}'
replacements:
- source:
    fieldPath: metadata.name
    kind: Service
    name: gnomad-api
    version: v1
  targets:
  - fieldPaths:
    - spec.template.spec.containers.0.env.0.value
    options:
      delimiter: /
      index: 2
    select:
      group: apps
      kind: Deployment
      name: gnomad-browser
      version: v1
patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: gnomad-api
      spec:
        template:
          spec:
            containers:
              - name: app
                env:
                  - name: JSON_CACHE_PATH
                    value: 'gs://{cluster_name}-gene-cache/2023-12-01'
"""


def deployments_directory() -> str:
    path = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests/browser/deployments"))
    if not os.path.exists(path):
        os.makedirs(path)
    return path


def list_deployments() -> None:
    print("Local configurations")
    print("====================")
    paths = reversed(sorted(glob.iglob(f"{deployments_directory()}/*/kustomization.yaml"), key=os.path.getmtime))
    for path in paths:
        print(os.path.basename(os.path.dirname(path)))

    print()

    print("Cluster deployments")
    print("===================")
    for deployment in get_k8s_deployments("component=gnomad-browser"):
        print(deployment[len("gnomad-browser-") :])


def create_deployment(name: str, browser_tag: str = None, api_tag: str = None) -> None:
    if not name:
        name = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    else:
        allowed_characters = set(string.ascii_lowercase) | set(string.digits) | {"-"}
        if set(name).difference(allowed_characters):
            raise ValueError(f"invalid deployment name '{name}'")

        if name == "latest":
            raise ValueError("'latest' cannot be used for a deployment name")

    deployment_directory = os.path.join(deployments_directory(), name)

    if os.path.exists(deployment_directory):
        raise RuntimeError(f"deployment '{name}' already exists")

    if browser_tag:
        if not image_exists(config.browser_image_repository, browser_tag):
            raise RuntimeError(f"could not find image {config.browser_image_repository}:{browser_tag}")
    else:
        browser_tag = get_most_recent_tag(config.browser_image_repository)
        print(f"No browser tag provided, using most recent ({browser_tag})")

    if api_tag:
        if not image_exists(config.api_image_repository, api_tag):
            raise RuntimeError(f"could not find image {config.api_image_repository}:{api_tag}")
    else:
        api_tag = get_most_recent_tag(config.api_image_repository)
        print(f"No API tag provided, using most recent ({api_tag})")

    os.makedirs(deployment_directory)

    with open(os.path.join(deployment_directory, "kustomization.yaml"), "w") as kustomization_file:
        kustomization = KUSTOMIZATION_TEMPLATE.format(
            deployment_name=name,
            browser_image_repository=config.browser_image_repository,
            browser_tag=browser_tag,
            api_image_repository=config.api_image_repository,
            api_tag=api_tag,
            project=config.project,
            cluster_name=config.gke_cluster_name,
        )

        kustomization_file.write(kustomization)

    print(f"configured local deployment manifest '{name}'")


def apply_deployment(name: str) -> None:
    deployment_directory = os.path.join(deployments_directory(), name)

    if not os.path.exists(deployment_directory):
        raise RuntimeError(f"no configuration for deployment '{name}'")

    kubectl(["apply", "-k", deployment_directory])

    print(f"applied deployment '{name}' to new pods in the cluster")


def delete_deployment(name: str, clean: bool = False) -> None:
    deployment_directory = os.path.join(deployments_directory(), name)

    if os.path.exists(deployment_directory):
        kubectl(["delete", "-k", deployment_directory])
        if clean:
            clean_deployment(name)
    else:
        create_deployment(name)
        delete_deployment(name, clean=True)

    print(f"deleted deployment '{name}'s corresponding pods from the cluster")


def clean_deployment(name: str) -> None:
    deployment_directory = os.path.join(deployments_directory(), name)
    os.remove(os.path.join(deployment_directory, "kustomization.yaml"))
    os.rmdir(deployment_directory)

    print(f"removed local deployment manifest '{name}'")


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    list_parser = subparsers.add_parser("list")
    list_parser.set_defaults(action=list_deployments)

    create_parser = subparsers.add_parser("create")
    create_parser.set_defaults(action=create_deployment)
    create_parser.add_argument("--name")
    create_parser.add_argument("--browser-tag")
    create_parser.add_argument("--api-tag")

    apply_parser = subparsers.add_parser("apply")
    apply_parser.set_defaults(action=apply_deployment)
    apply_parser.add_argument("name")

    delete_parser = subparsers.add_parser("delete")
    delete_parser.set_defaults(action=delete_deployment)
    delete_parser.add_argument("name")
    delete_parser.add_argument("--clean", action="store_true")

    clean_parser = subparsers.add_parser("clean")
    clean_parser.set_defaults(action=clean_deployment)
    clean_parser.add_argument("name")

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
