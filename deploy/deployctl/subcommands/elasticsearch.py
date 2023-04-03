import argparse
import os
import subprocess
import sys
import typing

import jinja2

from deployctl.shell import kubectl


def deployment_directory() -> str:
    return os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests/elasticsearch"))


def render_template_and_apply(
    template_path: str, context: typing.Optional[typing.Dict[str, typing.Any]] = None
) -> None:
    if not context:
        context = {}

    with open(template_path) as template_file:
        template = jinja2.Template(template_file.read())
        manifest = template.render(**context)

        kubectl(["apply", "-f", "-"], input=manifest)


def apply_elasticsearch(**kwargs) -> None:
    render_template_and_apply(os.path.join(deployment_directory(), "elasticsearch.yaml.jinja2"), kwargs)
    render_template_and_apply(os.path.join(deployment_directory(), "elasticsearch.load-balancer.yaml.jinja2"), kwargs)


def get_elasticsearch_cluster(cluster_name: str) -> None:
    print(kubectl(["get", "elasticsearch", cluster_name]), end="")


def get_elasticsearch_password(cluster_name: str) -> None:
    # ECK creates this secret when the cluster is created.
    print(
        kubectl(["get", "secret", f"{cluster_name}-es-elastic-user", "-o=go-template={{.data.elastic | base64decode}}"])
    )


def load_datasets(cluster_name: str, dataproc_cluster: str, secret: str, datasets: str):
    # Matches service name in deploy/manifests/elasticsearch.load-balancer.yaml.jinja2
    elasticsearch_load_balancer_ip = kubectl(
        ["get", "service", f"{cluster_name}-elasticsearch-lb", "--output=jsonpath={.status.loadBalancer.ingress[0].ip}"]
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

    apply_parser = subparsers.add_parser("apply")
    apply_parser.set_defaults(action=apply_elasticsearch)
    apply_parser.add_argument("--cluster-name", default="gnomad")
    apply_parser.add_argument("--n-ingest-pods", type=int, default=0)

    get_parser = subparsers.add_parser("get")
    get_parser.set_defaults(action=get_elasticsearch_cluster)
    get_parser.add_argument("--cluster-name", default="gnomad")

    get_parser = subparsers.add_parser("get-password")
    get_parser.set_defaults(action=get_elasticsearch_password)
    get_parser.add_argument("--cluster-name", default="gnomad")

    load_parser = subparsers.add_parser("load-datasets")
    load_parser.set_defaults(action=load_datasets)
    load_parser.add_argument("--cluster-name", default="gnomad")
    load_parser.add_argument("--dataproc-cluster", required=True)
    # TODO:FIXME: (rgrant) for dev cluster -- manually use rgrant secret for dev cluster
    # load_parser.add_argument("--secret", default="gnomad-elasticsearch-password")
    load_parser.add_argument("--secret", default="gnomad-elasticsearch-password-rgrant")
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
