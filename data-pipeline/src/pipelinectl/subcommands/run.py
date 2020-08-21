import argparse
import os
import subprocess
import sys
import tempfile
import typing
import zipfile

from pipelinectl.config import config


def main(argv: typing.List[str]) -> None:
    data_pipeline_dir = os.path.join(os.path.dirname(__file__), "../../data_pipeline")
    pipelines = [f[:-3] for f in os.listdir(os.path.join(data_pipeline_dir, "pipelines")) if f != "__init__.py"]

    parser = argparse.ArgumentParser(prog="pipelinectl run")
    parser.add_argument("pipeline", choices=pipelines, help="Pipeline to run")
    parser.add_argument("--cluster", help="Dataproc cluster to run the pipeline on")
    parser.add_argument("--dry-run", action="store_true", help="Print pipeline command without running it")
    args, other_args = parser.parse_known_args(argv)

    if not config.staging_path:
        print("staging_path configuration is required", file=sys.stderr)
        sys.exit(1)

    elif args.cluster:
        if not config.project:
            print("project configuration is required", file=sys.stderr)
            sys.exit(1)

        # Zip contents of data_pipeline directory for upload to Dataproc cluster
        with tempfile.NamedTemporaryFile(prefix="pyfiles_", suffix=".zip", delete=False) as tmp_file:
            with zipfile.ZipFile(tmp_file.name, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for root, _, files in os.walk(data_pipeline_dir):
                    for name in files:
                        if name.endswith(".py"):
                            zip_file.write(
                                os.path.join(root, name),
                                os.path.relpath(os.path.join(root, name), start=os.path.dirname(data_pipeline_dir)),
                            )

            # `gcloud dataproc jobs submit` is used here because `hailctl dataproc submit`
            # does not support project/region arguments.
            command = [
                "gcloud",
                "dataproc",
                "jobs",
                "submit",
                "pyspark",
                f"--project={config.project}",
                f"--region={config.cluster_region}",
                f"--cluster={args.cluster}",
                f"--py-files={tmp_file.name}",
                f"--files={os.path.abspath(os.path.join(data_pipeline_dir, '..', '..', 'pipeline_config.json'))}",
                os.path.abspath(os.path.join(data_pipeline_dir, "pipelines", f"{args.pipeline}.py")),
            ]

            if other_args:
                command.extend(["--"] + other_args)

            print(" ".join(command[:5]) + " \\\n    " + " \\\n    ".join(command[5:]))
            if not args.dry_run:
                subprocess.check_call(command)

    else:
        command = ["python3", f"data_pipeline/pipelines/{args.pipeline}.py"]

        if other_args:
            command.extend(other_args)

        print(" ".join(command[:2]) + " \\\n    " + " \\\n    ".join(command[2:]))
        if not args.dry_run:
            try:
                subprocess.check_call(command, env={"PYTHONPATH": ":".join(sys.path + [os.getcwd()]),})
            except subprocess.CalledProcessError:
                print(f"Error running data_pipeline/pipelines/{args.pipeline}.py")
                sys.exit(1)
