import argparse
import os
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
    render_template_and_apply(os.path.join(deployment_directory(), "elasticsearch.load-balancer.yaml.jinja2"))


def get_elasticsearch_cluster(cluster_name: str) -> None:
    print(kubectl(["get", "elasticsearch", cluster_name]), end="")


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    apply_parser = subparsers.add_parser("apply")
    apply_parser.set_defaults(action=apply_elasticsearch)
    apply_parser.add_argument("--cluster-name", default="gnomad")
    apply_parser.add_argument("--n-data-pods", type=int, default=3)
    apply_parser.add_argument("--n-ingest-pods", type=int, default=0)

    get_parser = subparsers.add_parser("get")
    get_parser.set_defaults(action=get_elasticsearch_cluster)
    get_parser.add_argument("--cluster-name", default="gnomad")

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
