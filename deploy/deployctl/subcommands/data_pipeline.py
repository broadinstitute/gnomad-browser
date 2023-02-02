import argparse
import os
import subprocess
import sys
import tempfile
import typing
import zipfile

from deployctl.config import config


DATA_PIPELINE_DIRECTORY = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../data-pipeline/src/data_pipeline")
)


def run_pipeline(
    pipeline: str,
    cluster: str,
    dry_run: bool,
    create_test_datasets: bool,
    other_args: typing.Optional[typing.List[str]] = None,
) -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    if not config.data_pipeline_output:
        raise RuntimeError("data_pipeline_output configuration is required")

    # Zip contents of data_pipeline directory for upload to Dataproc cluster
    with tempfile.NamedTemporaryFile(prefix="pyfiles_", suffix=".zip", delete=False) as tmp_file:
        with zipfile.ZipFile(tmp_file.name, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for root, _, files in os.walk(DATA_PIPELINE_DIRECTORY):
                for name in files:
                    if name.endswith(".py"):
                        zip_file.write(
                            os.path.join(root, name),
                            os.path.relpath(os.path.join(root, name), start=os.path.dirname(DATA_PIPELINE_DIRECTORY)),
                        )

        # `gcloud dataproc jobs submit` is used here because `hailctl dataproc submit`
        # does not support project and region arguments.
        command = [
            "gcloud",
            "dataproc",
            "jobs",
            "submit",
            "pyspark",
            f"--project={config.project}",
            f"--region={config.region}",
            f"--cluster={cluster}",
            f"--py-files={tmp_file.name}",
            os.path.abspath(os.path.join(DATA_PIPELINE_DIRECTORY, "pipelines", f"{pipeline}.py")),
            "--",
            f"--output-root={config.data_pipeline_output}",
        ]

        # TODO:FIXME: (rgrant) added to get the plumbing to work!
        if create_test_datasets:
            command.extend(["--create-test-datasets"])

        if other_args:
            command.extend(other_args)

        print(" ".join(command[:5]) + " \\\n    " + " \\\n    ".join(command[5:]))
        if not dry_run:
            subprocess.check_call(command)


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")
    subparsers = parser.add_subparsers()

    run_parser = subparsers.add_parser("run")
    run_parser.set_defaults(action=run_pipeline)
    pipelines = [f[:-3] for f in os.listdir(os.path.join(DATA_PIPELINE_DIRECTORY, "pipelines")) if f != "__init__.py"]
    run_parser.add_argument("pipeline", choices=pipelines, help="Pipeline to run")
    run_parser.add_argument("--cluster", required=True, help="Dataproc cluster to run the pipeline on")
    run_parser.add_argument("--dry-run", action="store_true", help="Print pipeline command without running it")

    # TODO:FIXME: (rgrant) this is added to work towards allowing subset of data
    #   added as a first class argument, seems to make sense? idk
    run_parser.add_argument(
        "--create-test-datasets",
        action="store_true",
        help="Run pipeline with smaller resulting datasets for development",
    )

    if "--" in argv:
        divider_index = argv.index("--")
        other_args = argv[divider_index + 1 :]
        args = parser.parse_args(argv[:divider_index])
        args.other_args = other_args
    else:
        args = parser.parse_args(argv)

    if "action" not in args:
        parser.print_usage()
        sys.exit(1)

    action = args.action
    del args.action
    try:
        action(**vars(args))
    except Exception as err:  # pylint: disable=broad-except
        print("in here")
        print(f"Error: {err}", file=sys.stderr)
        sys.exit(1)
