import argparse
import json
import sys
import typing

from deployctl.shell import kubectl, get_most_recent_k8s_deployment, k8s_deployment_exists


SERVICES_MANIFEST_TEMPLATE = """---
apiVersion: v1
kind: Service
metadata:
  name: gnomad-browser-demo-{name}
  labels:
    tier: demo
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
  name: gnomad-reads-demo-{name}
  labels:
    tier: demo
spec:
  type: NodePort
  selector:
    name: gnomad-reads
    deployment: '{reads_deployment}'
  ports:
    - port: 80
      targetPort: 80
"""

INGRESS_MANIFEST_TEMPLATE = """---
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gnomad-ingress-demo-{name}
  labels:
    tier: demo
spec:
  rules:
    - http:
        paths:
          - path: /reads
            pathType: ImplementationSpecific
            backend:
              service:
                name: gnomad-reads-demo-{name}
                port:
                  number: 80
          - path: /reads/*
            pathType: ImplementationSpecific
            backend:
              service:
                name: gnomad-reads-demo-{name}
                port:
                  number: 80
          - path:
            pathType: ImplementationSpecific
            backend:
              service:
                name: gnomad-browser-demo-{name}
                port:
                  number: 80
"""


def list_demo_ingresses() -> None:
    ingresses = kubectl(
        [
            "get",
            "ingresses",
            "--selector=tier=demo",
            "--sort-by={.metadata.creationTimestamp}",
            "--output=jsonpath={range .items[*]}{.metadata.name}{'\\n'}",
        ]
    ).splitlines()

    for ingress in ingresses:
        print(ingress[len("gnomad-ingress-demo-") :])


def describe_services(name: str) -> None:
    try:
        browser_manifest = json.loads(kubectl(["get", "service", f"gnomad-browser-demo-{name}", "--output=json"]))
        reads_manifest = json.loads(kubectl(["get", "service", f"gnomad-reads-demo-{name}", "--output=json"]))

        browser_deployment = browser_manifest["spec"]["selector"]["deployment"]
        reads_deployment = reads_manifest["spec"]["selector"]["deployment"]

        print("active browser deployment:", browser_deployment)
        print("active reads deployment:", reads_deployment)
    except Exception:  # pylint: disable=broad-except
        print(f"Could not get services for '{name}' demo environment")


def apply_services(name: str, browser_deployment: str = None, reads_deployment: str = None) -> None:
    if browser_deployment:
        if not k8s_deployment_exists(f"gnomad-browser-{browser_deployment}"):
            raise RuntimeError(f"browser deployment {browser_deployment} not found")
    else:
        browser_deployment = get_most_recent_k8s_deployment("component=gnomad-browser")[len("gnomad-browser-") :]

    if reads_deployment:
        if not k8s_deployment_exists(f"gnomad-reads-{reads_deployment}"):
            raise RuntimeError(f"reads deployment {reads_deployment} not found")
    else:
        reads_deployment = get_most_recent_k8s_deployment("component=gnomad-reads")[len("gnomad-reads-") :]

    manifest = SERVICES_MANIFEST_TEMPLATE.format(
        name=name, browser_deployment=browser_deployment, reads_deployment=reads_deployment
    )

    kubectl(["apply", "-f", "-"], input=manifest)


def apply_ingress(name: str, browser_deployment: str = None, reads_deployment: str = None) -> None:
    apply_services(name, browser_deployment, reads_deployment)

    manifest = INGRESS_MANIFEST_TEMPLATE.format(name=name)

    kubectl(["apply", "-f", "-"], input=manifest)

    print(f"applied ingress to deployment '{name}'")


def delete_ingress_and_services(name: str) -> None:
    kubectl(["delete", f"ingress/gnomad-ingress-demo-{name}"])
    kubectl(["delete", f"service/gnomad-reads-demo-{name}"])
    kubectl(["delete", f"service/gnomad-browser-demo-{name}"])


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    list_parser = subparsers.add_parser("list")
    list_parser.set_defaults(action=list_demo_ingresses)

    describe_services_parser = subparsers.add_parser("describe")
    describe_services_parser.set_defaults(action=describe_services)
    describe_services_parser.add_argument("name")

    apply_services_parser = subparsers.add_parser("update")
    apply_services_parser.set_defaults(action=apply_services)
    apply_services_parser.add_argument("name")
    apply_services_parser.add_argument("--browser-deployment")
    apply_services_parser.add_argument("--reads-deployment")

    apply_ingress_parser = subparsers.add_parser("apply-ingress")
    apply_ingress_parser.set_defaults(action=apply_ingress)
    apply_ingress_parser.add_argument("name")
    apply_ingress_parser.add_argument("--browser-deployment")
    apply_ingress_parser.add_argument("--reads-deployment")

    delete_ingress_and_services_parser = subparsers.add_parser("delete")
    delete_ingress_and_services_parser.set_defaults(action=delete_ingress_and_services)
    delete_ingress_and_services_parser.add_argument("name")

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
