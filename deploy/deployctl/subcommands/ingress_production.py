import argparse
import json
import os
import sys
import typing

from deployctl.shell import kubectl, get_most_recent_k8s_deployment, k8s_deployment_exists


SERVICES_MANIFEST_TEMPLATE = """---
apiVersion: v1
kind: Service
metadata:
  name: gnomad-browser
  labels:
    tier: production
  annotations:
    cloud.google.com/backend-config: '{{"ports": {{"80":"gnomad-backend-config"}}}}'
spec:
  type: NodePort
  selector:
    name: gnomad-browser
    deployment: '{browser_deployment}'
  ports:
    - port: 80
      targetPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: gnomad-reads
  labels:
    tier: production
spec:
  type: NodePort
  selector:
    name: gnomad-reads
    deployment: '{reads_deployment}'
  ports:
    - port: 80
      targetPort: 80
"""


def manifests_directory() -> str:
    return os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests/ingress"))


def get_current_browser_deployment() -> str:
    browser_manifest = json.loads(kubectl(["get", "service", "gnomad-browser", "--output=json"]))
    return browser_manifest["spec"]["selector"]["deployment"]


def get_current_reads_deployment() -> str:
    reads_manifest = json.loads(kubectl(["get", "service", "gnomad-reads", "--output=json"]))
    return reads_manifest["spec"]["selector"]["deployment"]


def describe_services() -> None:
    browser_deployment = get_current_browser_deployment()
    reads_deployment = get_current_reads_deployment()

    print("active browser deployment:", browser_deployment)
    print("active reads deployment:", reads_deployment)


def apply_services(browser_deployment: str = None, reads_deployment: str = None) -> None:
    if browser_deployment:
        if not k8s_deployment_exists(f"gnomad-browser-{browser_deployment}"):
            raise RuntimeError(f"browser deployment {browser_deployment} not found")
    else:
        try:
            browser_deployment = get_current_browser_deployment()
        except Exception:  # pylint: disable=broad-except; FIXME: Use a more specific exception class
            browser_deployment = get_most_recent_k8s_deployment("component=gnomad-browser")[len("gnomad-browser-") :]

    if reads_deployment:
        if not k8s_deployment_exists(f"gnomad-reads-{reads_deployment}"):
            raise RuntimeError(f"reads deployment {reads_deployment} not found")
    else:
        try:
            reads_deployment = get_current_reads_deployment()
        except Exception:  # pylint: disable=broad-except; FIXME: Use a more specific exception class
            reads_deployment = get_most_recent_k8s_deployment("component=gnomad-reads")[len("gnomad-reads-") :]

    manifest = SERVICES_MANIFEST_TEMPLATE.format(
        browser_deployment=browser_deployment, reads_deployment=reads_deployment
    )

    kubectl(["apply", "-f", "-"], input=manifest)

    print(f"Updated production ingresses. browser: '{browser_deployment}', reads: '{reads_deployment}' ")


def apply_ingress(browser_deployment: str = None, reads_deployment: str = None, quiet: bool = False) -> None:
    apply_services(browser_deployment, reads_deployment)

    if quiet or input("Apply changes to production ingress (y/n) ").lower() == "y":
        kubectl(["apply", "-f", os.path.join(manifests_directory(), "gnomad.backendconfig.yaml")])
        kubectl(["apply", "-f", os.path.join(manifests_directory(), "gnomad.frontendconfig.yaml")])
        kubectl(["apply", "-f", os.path.join(manifests_directory(), "gnomad.ingress.yaml")])


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    describe_services_parser = subparsers.add_parser("describe")
    describe_services_parser.set_defaults(action=describe_services)

    apply_services_parser = subparsers.add_parser("update")
    apply_services_parser.set_defaults(action=apply_services)
    apply_services_parser.add_argument("--browser-deployment")
    apply_services_parser.add_argument("--reads-deployment")

    apply_ingress_parser = subparsers.add_parser("apply-ingress")
    apply_ingress_parser.set_defaults(action=apply_ingress)
    apply_ingress_parser.add_argument("--browser-deployment")
    apply_ingress_parser.add_argument("--reads-deployment")
    apply_ingress_parser.add_argument("--quiet", action="store_true")

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
