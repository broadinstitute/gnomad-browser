import argparse
import os
import subprocess
import sys
import typing
import importlib.metadata

from deployctl.config import config


DATA_PIPELINE_DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data-pipeline"))


def list_clusters() -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    subprocess.run(
        ["hailctl", "dataproc", "list", f"--project={config.project}", f"--region={config.region}"], check=True
    )


def start_cluster(name: str, cluster_args: typing.List[str]) -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    with open(os.path.join(DATA_PIPELINE_DIRECTORY, "requirements.txt")) as requirements_file:
        requirements_hail_version = next(
            (line.strip().split("==")[1] for line in requirements_file if line.strip().startswith("hail==")), None
        )
        try:
            local_hail_version = importlib.metadata.version("hail")
        except importlib.metadata.PackageNotFoundError as package_not_found:
            raise RuntimeError("Hail must be installed locally") from package_not_found

        if not requirements_hail_version:
            raise RuntimeError("Hail must be pinned in data-pipeline/requirements.txt")
        if requirements_hail_version != local_hail_version:
            raise RuntimeError(
                f"Local hail version differs from version pinned in data-pipeline/requirements.txt\nRequired version {requirements_hail_version}\nLocal version {local_hail_version}"
            )

        requirements_file.seek(0)
        requirements = [line.strip() for line in requirements_file.readlines()]

    subprocess.check_output(
        [
            "hailctl",
            "dataproc",
            "start",
            name,
            f"--project={config.project}",
            f"--region={config.region}",
            f"--zone={config.zone}",
            f"--subnet={config.network_name}-dataproc",
            "--tags=dataproc-node",
            "--max-idle=1h",
            f"--packages={','.join(requirements)}",
            f"--service-account=gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com",
            # Required to access Secret Manager
            # https://cloud.google.com/secret-manager/docs/accessing-the-api#enabling_api_access
            "--scopes=cloud-platform",
        ]
        + cluster_args
    )


def stop_cluster(name: str) -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    subprocess.check_output(
        ["hailctl", "dataproc", "stop", name, f"--project={config.project}", f"--region={config.region}"]
    )


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    list_parser = subparsers.add_parser("list")
    list_parser.set_defaults(action=list_clusters)

    start_parser = subparsers.add_parser("start")
    start_parser.set_defaults(action=start_cluster)
    start_parser.add_argument("name")
    start_parser.add_argument("cluster_args", nargs=argparse.REMAINDER)

    stop_parser = subparsers.add_parser("stop")
    stop_parser.set_defaults(action=stop_cluster)
    stop_parser.add_argument("name")

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
