import argparse
import os
import subprocess
import sys
import typing

from deployctl.config import config
from deployctl.shell import gcloud, kubectl


def create_network() -> None:
    # Create a VPC network
    # https://cloud.google.com/vpc/docs/using-vpc
    gcloud(["compute", "networks", "create", config.network_name, "--subnet-mode=custom"])

    # Create a subnet for the GKE cluster
    # https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#custom_subnet
    gcloud(
        [
            "compute",
            "networks",
            "subnets",
            "create",
            f"{config.network_name}-gke",
            f"--network={config.network_name}",
            f"--region={config.region}",
            "--range=192.168.0.0/20",
            "--secondary-range=gke-pods=10.4.0.0/14,gke-services=10.0.32.0/20",
            "--enable-flow-logs",
            "--enable-private-ip-google-access",
        ]
    )


def create_ip_address() -> None:
    # Reserve a static external IP address to use with a load balancer.
    gcloud(["compute", "addresses", "create", config.ip_address_name, "--global"])


def create_cluster_service_account() -> None:
    # Create a least privilege service account for cluster nodes
    # https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster#use_least_privilege_service_accounts_for_your_nodes

    try:
        # Do not alter the service account if it already exists.
        # Deleting and recreating a service account with the same name can lead to unexpected behavior
        # https://cloud.google.com/iam/docs/understanding-service-accounts#deleting_and_recreating_service_accounts
        gcloud(
            ["iam", "service-accounts", "describe", config.gke_service_account_full_name], stderr=subprocess.DEVNULL,
        )
        print("Service account already exists")
        return
    except subprocess.CalledProcessError:
        pass

    gcloud(
        ["iam", "service-accounts", "create", config.gke_service_account_name, "--display-name=gnomAD GKE nodes",]
    )

    # GKE requires logging.logWriter, monitoring.metricWriter, and monitoring.viewer
    #
    # stackdriver.resourceMetadata.writer is required for Stackdriver monitoring
    # https://cloud.google.com/monitoring/kubernetes-engine/observing
    #
    # storage.objectViewer is required to use private images in the Container Registry
    roles = [
        "logging.logWriter",
        "monitoring.metricWriter",
        "monitoring.viewer",
        "stackdriver.resourceMetadata.writer",
        "storage.objectViewer",
    ]

    for role in roles:
        subprocess.check_call(
            [
                "gcloud",
                "projects",
                "add-iam-policy-binding",
                config.project,
                f"--member=serviceAccount:{config.gke_service_account_full_name}",
                f"--role=roles/{role}",
            ],
            stdout=subprocess.DEVNULL,
        )


def create_cluster() -> None:
    # Create a private cluster
    # https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters
    # https://cloud.google.com/kubernetes-engine/docs/how-to/protecting-cluster-metadata
    #
    # Restrict access to K8S master to IP addresses listed in MASTER_AUTHORIZED_NETWORKS
    # https://cloud.google.com/kubernetes-engine/docs/how-to/authorized-networks
    #
    # Enable Stackdriver Kubernetes monitoring and logging
    # https://cloud.google.com/monitoring/kubernetes-engine/
    #
    # Use shielded nodes
    # https://cloud.google.com/kubernetes-engine/docs/how-to/shielded-gke-nodes
    #
    # Disable authentication with static password and client certificate
    # https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster#restrict_authn_methods
    #
    # Disable legacy metadata API
    #
    # Set nodes to automatically repair and upgrade
    # https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-repair
    # https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-upgrades
    #
    gcloud(
        [
            "container",
            "clusters",
            "create",
            config.gke_cluster_name,
            f"--zone={config.zone}",
            "--release-channel=stable",
            "--enable-autorepair",
            "--enable-autoupgrade",
            "--maintenance-window=7:00",
            f"--service-account={config.gke_service_account_full_name}",
            f"--network={config.network_name}",
            f"--subnetwork={config.network_name}-gke",
            "--cluster-secondary-range-name=gke-pods",
            "--services-secondary-range-name=gke-services",
            "--enable-ip-alias",
            "--enable-master-authorized-networks",
            "--enable-private-nodes",
            f"--master-authorized-networks={config.authorized_networks}",
            "--master-ipv4-cidr=172.16.0.0/28",
            "--enable-stackdriver-kubernetes",
            "--enable-shielded-nodes",
            "--shielded-secure-boot",
            "--metadata=disable-legacy-endpoints=true",
            "--no-enable-basic-auth",
            "--no-enable-legacy-authorization",
            "--no-issue-client-certificate",
            "--num-nodes=1",
            "--machine-type=n1-standard-4",
        ]
    )

    # Configure kubectl
    gcloud(["container", "clusters", "get-credentials", config.gke_cluster_name, f"--zone={config.zone}"])


def create_configmap():
    # Store the IP address used for the ingress load balancer in a configmap so that the browser
    # can use it for determining the real client IP.
    ingress_ip = gcloud(
        ["compute", "addresses", "describe", config.ip_address_name, "--global", "--format=value(address)"]
    )

    kubectl(["create", "configmap", "ingress-ip", f"--from-literal=ip={ingress_ip}"])


def create_node_pool(node_pool_name: str, node_pool_args: typing.List[str]) -> None:
    gcloud(
        [
            "container",
            "node-pools",
            "create",
            node_pool_name,
            f"--cluster={config.gke_cluster_name}",
            f"--zone={config.zone}",
            "--enable-autorepair",
            "--enable-autoupgrade",
            f"--service-account={config.gke_service_account_full_name}",
            "--shielded-secure-boot",
            "--metadata=disable-legacy-endpoints=true",
        ]
        + node_pool_args
    )


def main(argv: typing.List[str]) -> None:
    parser = argparse.ArgumentParser(prog="deployctl")

    parser.parse_args(argv)

    if not config.project:
        print("project configuration is required", file=sys.stderr)
        sys.exit(1)

    print("This will create the following resources:")
    print(f"- VPC network '{config.network_name}'")
    print(f"- IP address '{config.ip_address_name}'")
    print(f"- Service account '{config.gke_service_account_name}'")
    print(f"- GKE cluster '{config.gke_cluster_name}'")

    if input("Continue? (y/n) ").lower() == "y":
        print("Creating network...")
        create_network()

        print("Reserving IP address...")
        create_ip_address()

        print("Creating service account...")
        create_cluster_service_account()

        print("Creating cluster...")
        create_cluster()

        print("Creating configmap...")
        create_configmap()

        print("Creating node pools...")
        create_node_pool("redis", ["--num-nodes=1", "--machine-type=n1-highmem-8"])

        print("Creating K8S resources...")
        manifests_directory = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests"))
        kubectl(["apply", "-k", os.path.join(manifests_directory, "redis")])
