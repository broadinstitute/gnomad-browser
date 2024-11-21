import subprocess
import typing

from deployctl.config import config


def gcloud(args: typing.List[str], **kwargs) -> str:
    if not config.project:
        raise RuntimeError("project configuration is required")

    return subprocess.check_output(["gcloud", f"--project={config.project}"] + args, encoding="utf-8", **kwargs).strip()


def get_most_recent_tag(gcr_image_repository: str) -> str:
    tag = gcloud(["container", "images", "list-tags", gcr_image_repository, "--format=value(tags[0])", "--limit=1"])
    if not tag:
        raise RuntimeError(f"no tags found for '{gcr_image_repository}'")
    return tag


def image_exists(gcr_image_repository: str, tag: str) -> bool:
    try:
        gcloud(["container", "images", "describe", f"{gcr_image_repository}:{tag}"])
        return True
    except subprocess.CalledProcessError:
        return False


def kubectl(args: typing.List[str], **kwargs) -> str:
    if not config.kubectl_context:
        raise RuntimeError("kubectl context configuration is required")

    return subprocess.check_output(
        ["kubectl", f"--context={config.kubectl_context}"] + args, encoding="utf-8", **kwargs
    )


def get_k8s_deployments(selector: str) -> typing.List[typing.Tuple[str, str]]:
    result = kubectl(
        [
            "get",
            "deployments",
            f"--selector={selector}",
            "--sort-by={.metadata.creationTimestamp}",
            "--output=jsonpath={range .items[*]}{.metadata.name} {.spec.template.spec.nodeSelector.cloud\\.google\\.com/gke-nodepool}{'\\n'}",
        ]
    )
    return [
        (parts[0], parts[1]) for line in result.splitlines() for parts in [line.split(maxsplit=1)] if len(parts) == 2
    ]


def get_most_recent_k8s_deployment(selector: str) -> str:
    deployments = get_k8s_deployments(selector)
    if not deployments:
        raise RuntimeError(f"No deployment matching '{selector}' found")
    return deployments[len(deployments) - 1][0]


def k8s_deployment_exists(k8s_deployment_name: str) -> bool:
    try:
        kubectl(["get", "deployment", k8s_deployment_name], stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        return False
