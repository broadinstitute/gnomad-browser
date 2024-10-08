import argparse
import subprocess
import sys
import typing

from deployctl.shell import kubectl


def get_elasticsearch_password(cluster_name: str, namespace: str) -> None:
    # ECK creates this secret when the cluster is created.
    print(
        kubectl(
            [
                f"-n={namespace}",
                "get",
                "secret",
                f"{cluster_name}-es-elastic-user",
                "-o=go-template={{.data.elastic | base64decode}}",
            ]
        )
    )


def load_datasets(cluster_name: str, namespace: str, dataproc_cluster: str, secret: str, datasets: str):
    # Matches service name in deploy/manifests/elasticsearch.load-balancer.yaml.jinja2
    elasticsearch_load_balancer_ip = kubectl(
        [
            f"-n={namespace}",
            "get",
            "service",
            f"{cluster_name}-elasticsearch-lb",
            "--output=jsonpath={.status.loadBalancer.ingress[0].ip}",
        ]
    )

    subprocess.check_call(
        [
            sys.argv[0],
            "data-pipeline",
            "run",
            "export_to_elasticsearch",
            f"--cluster={dataproc_cluster}",
            "--",
            f"--host={elasticsearch_load_balancer_ip}",
            f"--secret={secret}",
            f"--datasets={datasets}",
        ]
    )


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    get_parser = subparsers.add_parser("get-password")
    get_parser.set_defaults(action=get_elasticsearch_password)
    get_parser.add_argument("--cluster-name", default="gnomad")
    get_parser.add_argument("--namespace", default="default")

    load_parser = subparsers.add_parser("load-datasets")
    load_parser.set_defaults(action=load_datasets)
    load_parser.add_argument("--cluster-name", default="gnomad")
    load_parser.add_argument("--namespace", default="default")
    load_parser.add_argument("--dataproc-cluster", required=True)
    load_parser.add_argument("--secret", default="gnomad-elasticsearch-password")
    load_parser.add_argument("datasets")

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
