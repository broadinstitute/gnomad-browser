import argparse
import json
import os
import subprocess
import sys
import typing
import importlib.metadata

from deployctl.config import config


DATA_PIPELINE_DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data-pipeline"))

# The below regions and properties constantsare specified in
# the hailctl command to start a Dataproc cluster for Hail.
# They are necessary here for starting clusters using a custom OS images,
# in which case they would not use hailctl.
VEP_SUPPORTED_REGIONS = {"us-central1", "europe-west1", "europe-west2", "australia-southeast1"}
DATAPROC_PROPERTIES = (
    # NOTE: ^#^ specifies # as the delimiter
    # Spark properties
    "^#^spark:spark.dynamicAllocation.enabled=true"
    "#spark:spark.executorEnv.PYTHONHASHSEED=0"
    "#spark:spark.app.name=Hail"
    # Per Hail docs: the below are necessary to make 'submit' work
    "#spark:spark.jars=/opt/conda/miniconda3/lib/python3.10/site-packages/hail/backend/hail-all-spark.jar"
    "#spark:spark.driver.extraClassPath=/opt/conda/miniconda3/lib/python3.10/site-packages/hail/backend/hail-all-spark.jar"
    "#spark:spark.executor.extraClassPath=./hail-all-spark.jar"
    # Spark environment variables
    "#spark-env:PYTHONHASHSEED=0"
    "#spark-env:PYTHONPATH=/usr/lib/spark/python/lib/py4j-0.10.9.5-src.zip:/usr/lib/spark/python/lib/pyspark.zip"
    "#spark-env:SPARK_HOME=/usr/lib/spark/"
    "#spark-env:PYSPARK_PYTHON=/opt/conda/default/bin/python"
    "#spark-env:PYSPARK_DRIVER_PYTHON=/opt/conda/default/bin/python"
    "#spark-env:HAIL_LOG_DIR=/home/hail"
    "#spark-env:HAIL_DATAPROC=1"
)


def _parse_flags(flags: typing.List[str]) -> typing.Dict:
    """Parse a list of string cli flags into dict.

    This function checks both the "--flag=value" and
    "--flag value" formats. The former appears in the
    "flags" list as:
        ["--flag1=val1", "--flag2=val2"...]
    which is a little easier to work with than the
    second format, which is:
        ["--flag1", "val1", "--flag2", "val2", ...]

    It will ignore any flags/values that do not follow
    the above two formats.
    """
    flags_dict = {}
    key = ""
    value = ""
    for flag in flags:
        flag_split = flag.split("=")
        if len(flag_split) == 2:
            key = flag_split[0].replace("--", "")
            if len(flag_split) > 1:
                value = flag_split[1]
            else:
                value = None

        elif flag.startswith("--"):
            key = flag.replace("--", "")
        elif key:
            value = flag

        if key and value:
            flags_dict[key] = value
            key = ""
            value = ""

    return flags_dict


def list_clusters() -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    subprocess.run(
        ["hailctl", "dataproc", "list", f"--project={config.project}", f"--region={config.region}"], check=True
    )


def _prep_vep_cluster_options(
    cluster_args_dict: typing.Dict,
) -> typing.Dict:
    """Adjust cluster creation arguments for VEP.

    Recreates steps from hailctl as seen below:
    https://github.com/hail-is/hail/blob/main/hail/python/hailtop/hailctl/dataproc/start.py#L249

    Necessary for when clusters are created using
    custom OS images, which do not use hailctl.
    """
    region = cluster_args_dict.get("region", config.region)
    if region not in VEP_SUPPORTED_REGIONS:
        supported_regions = ", ".join(VEP_SUPPORTED_REGIONS)
        raise RuntimeError(f"VEP is only supported in the following regions: {supported_regions}")

    vep_options_dict = {
        "secondary-worker-boot-disk-size": "200GB",
        "worker-boot-disk-size": "200GB",
        "worker-machine-type": "n1-highmem-8",
    }

    metadata_value = cluster_args_dict.get("metadata", "")
    metadata_list = metadata_value.split(",") if metadata_value else []
    vep_config_path = "/vep_data/vep-gcloud.json"
    metadata_list += [
        f"VEP_CONFIG_PATH={vep_config_path}",
        f"VEP_CONFIG_URI=file://{vep_config_path}",
        f"VEP_REPLICATE={region}",
    ]
    vep_options_dict["metadata"] = ",".join(metadata_list)

    vep = cluster_args_dict["vep"]
    custom_image = cluster_args_dict["image"]
    cli_output = subprocess.run(
        ["gcloud", "compute", "images", "describe", custom_image, "--format=json"],
        capture_output=True,
        text=True,
        check=True,
    )
    image_described = json.loads(cli_output.stdout)
    hail_version = image_described["labels"]["hail-version"].replace("-", ".")
    vep_gcs_path = f"gs://hail-common/hailctl/dataproc/{hail_version}/vep-{vep}.sh"
    init_actions_value = cluster_args_dict.get("initialization-actions", "")
    init_actions_list = init_actions_value.split(",") if init_actions_value else []
    init_actions_list = [val for val in init_actions_list if val]
    init_actions_list.append(vep_gcs_path)
    vep_options_dict["initialization-actions"] = ",".join(init_actions_list)

    return vep_options_dict


def start_custom_image_cluster(
    name: str,
    cluster_args_dict: typing.Dict,
) -> None:
    if "vep" in cluster_args_dict:
        vep_args_dict = _prep_vep_cluster_options(cluster_args_dict)
        cluster_args_dict.update(vep_args_dict)
        del cluster_args_dict["vep"]  # Not an actual valid gcloud flag

    cluster_args_list = []
    for k, v in cluster_args_dict.items():
        cluster_arg = f"--{k}={v}"
        cluster_args_list.append(cluster_arg)

    subprocess.check_output(
        [
            "gcloud",
            "dataproc",
            "clusters",
            "create",
            name,
            f"--project={config.project}",
            f"--region={config.region}",
            f"--zone={config.zone}",
            f"--subnet={config.network_name}-dataproc",
            "--tags=dataproc-node",
            "--max-idle=1h",
            f"--service-account=gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com",
            "--scopes=cloud-platform",
            f"--properties={DATAPROC_PROPERTIES}",
            # Default cluster configs
            "--master-machine-type=n1-highmem-8",
            "--master-boot-disk-size=100GB",
            "--num-masters=1",
            "--worker-machine-type=n1-standard-8",
            "--worker-boot-disk-size=40GB",
            "--num-workers=2",
            "--num-secondary-workers=0",
        ]
        + cluster_args_list  # Image flag is included in this var
    )


def start_cluster(name: str, cluster_args: typing.List[str]) -> None:
    if not config.project:
        raise RuntimeError("project configuration is required")

    cluster_args_dict = _parse_flags(cluster_args)
    if "image" in cluster_args_dict:
        return start_custom_image_cluster(name, cluster_args_dict)
    # TODO: Add "else" block to confirm with user to use legacy hailctl initialization

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
