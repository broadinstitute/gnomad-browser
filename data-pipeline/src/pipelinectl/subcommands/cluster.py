import argparse
import subprocess
import sys
import typing

from pipelinectl.config import config


def start_cluster(cluster_name: str, dry_run: bool = False, cluster_args: typing.Optional[typing.List[str]] = None) -> None:
    if not config.project:
        print("project configuration is required", file=sys.stderr)
        sys.exit(1)

    command = [
        "hailctl",
        "dataproc",
        "start",
        cluster_name,
        f"--project={config.project}",
        f"--region={config.cluster_region}",
        f"--zone={config.cluster_zone}",
        # Larger disk size needed for variants pipeline.
        # With default size, all workers fail.
        "--master-boot-disk-size=100",
        "--worker-boot-disk-size=100",
        "--secondary-worker-boot-disk-size=100",
        "--max-idle=1h",
        "--requester-pays-allow-buckets=gnomad-public-requester-pays",
    ]

    if cluster_args:
        command.extend(cluster_args)

    print(" ".join(command[:4]) + " \\\n    " + " \\\n    ".join(command[4:]))
    if not dry_run:
        subprocess.check_call(command)


def stop_cluster(cluster_name: str) -> None:
    if not config.project:
        print("project configuration is required", file=sys.stderr)
        sys.exit(1)

    command = [
        "hailctl",
        "dataproc",
        "stop",
        cluster_name,
        f"--project={config.project}",
        f"--region={config.cluster_region}",
    ]

    print(" ".join(command[:4]) + " \\\n    " + " \\\n    ".join(command[4:]))
    subprocess.check_call(command)


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="pipelinectl cluster")
    subparsers = parser.add_subparsers()

    start_parser = subparsers.add_parser("start")
    start_parser.set_defaults(action=start_cluster)
    start_parser.add_argument("cluster_name", help="Name of Dataproc cluster")
    start_parser.add_argument("--dry-run", action="store_true", help="Print hailctl command without running it")
    start_parser.add_argument("cluster_args", nargs=argparse.REMAINDER)

    stop_parser = subparsers.add_parser("stop")
    stop_parser.set_defaults(action=stop_cluster)
    stop_parser.add_argument("cluster_name", help="Name of Dataproc cluster")

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
