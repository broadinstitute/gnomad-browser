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

    # Create a subnet for Dataproc nodes
    gcloud(
        [
            "compute",
            "networks",
            "subnets",
            "create",
            f"{config.network_name}-dataproc",
            f"--network={config.network_name}",
            f"--region={config.region}",
            "--range=192.168.255.0/24",
            "--enable-flow-logs",
            "--enable-private-ip-google-access",
        ]
    )

    # Setup Cloud NAT
    # https://cloud.google.com/nat/docs/using-nat
    # This allows pulling external Docker images for Elastic
    gcloud(
        [
            "compute",
            "routers",
            "create",
            f"{config.network_name}-nat-router",
            f"--network={config.network_name}",
            f"--region={config.region}",
        ]
    )

    gcloud(
        [
            "compute",
            "routers",
            "nats",
            "create",
            f"{config.network_name}-nat",
            f"--router={config.network_name}-nat-router",
            f"--region={config.region}",
            "--auto-allocate-nat-external-ips",
            "--nat-all-subnet-ip-ranges",
            "--enable-logging",
        ]
    )

    # Allow Dataproc machines to talk to each other
    # https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/network
    # Dataproc clusters must be created with --tags=dataproc-node for this to apply
    gcloud(
        [
            "compute",
            "firewall-rules",
            "create",
            f"{config.network_name}-dataproc-internal",
            "--action=ALLOW",
            "--direction=INGRESS",
            f"--network={config.network_name}",
            "--rules=tcp:0-65535,udp:0-65535,icmp",
            "--source-tags=dataproc-node",
            "--target-tags=dataproc-node",
        ]
    )

    # Allow SSH access to Dataproc machines from authorized networks
    # Dataproc clusters must be created with --tags=dataproc-node for this to apply
    gcloud(
        [
            "compute",
            "firewall-rules",
            "create",
            f"{config.network_name}-dataproc-ssh",
            "--action=ALLOW",
            "--direction=INGRESS",
            f"--network={config.network_name}",
            "--rules=tcp:22",
            f"--source-ranges={config.authorized_networks}",
            "--target-tags=dataproc-node",
        ]
    )


def create_ip_address() -> None:
    # Reserve a static external IP address to use with a load balancer.
    gcloud(["compute", "addresses", "create", config.ip_address_name, "--global"])


def create_ssl_certificate() -> None:
    # Create a managed SSL certificate.
    gcloud(["compute", "ssl-certificates", "create", "gnomad-browser-cert", f"--domains={config.domain}", "--global"])


def create_cluster_service_account() -> None:
    # Create a least privilege service account for cluster nodes
    # https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster#use_least_privilege_sa

    try:
        # Do not alter the service account if it already exists.
        # Deleting and recreating a service account with the same name can lead to unexpected behavior
        # https://cloud.google.com/iam/docs/understanding-service-accounts#deleting_and_recreating_service_accounts
        gcloud(
            ["iam", "service-accounts", "describe", config.gke_service_account_full_name],
            stderr=subprocess.DEVNULL,
        )
        print("Service account already exists")
        return
    except subprocess.CalledProcessError:
        pass

    gcloud(
        [
            "iam",
            "service-accounts",
            "create",
            config.gke_service_account_name,
            "--display-name=gnomAD GKE nodes",
        ]
    )

    # GKE requires logging.logWriter, monitoring.metricWriter, and monitoring.viewer
    #
    # stackdriver.resourceMetadata.writer is required for Stackdriver monitoring
    # https://cloud.google.com/monitoring/kubernetes-engine/observing
    # https://cloud.google.com/stackdriver/docs/solutions/gke/troubleshooting#write_permissions
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
    # Enable Cloud Operations for GKE
    # https://cloud.google.com/stackdriver/docs/solutions/gke
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
            "--cluster-version=1.21.14-gke.3000",
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
            "--shielded-integrity-monitoring",
            "--metadata=disable-legacy-endpoints=true",
            "--no-enable-basic-auth",
            "--no-enable-legacy-authorization",
            "--no-issue-client-certificate",
            "--num-nodes=2",
            "--machine-type=e2-standard-4",
        ]
    )

    # Configure kubectl
    gcloud(["container", "clusters", "get-credentials", config.gke_cluster_name, f"--zone={config.zone}"])


def create_configmap():
    # Store a list of all IP addresses involved in proxying requests.
    # These are used for determining the real client IP.
    ingress_ip = gcloud(
        ["compute", "addresses", "describe", config.ip_address_name, "--global", "--format=value(address)"]
    )

    # Private/internal networks
    # These ranges match those used for the gnomad-gke subnet.
    # 127.0.0.1
    # 192.168.0.0/20
    # 10.4.0.0/14
    # 10.0.32.0/20
    #
    # Internal IPs for GCE load balancers
    # https://cloud.google.com/load-balancing/docs/https#how-connections-work
    # 35.191.0.0/16
    # 130.211.0.0/22
    ips = f"127.0.0.1,192.168.0.0/20,10.4.0.0/14,10.0.32.0/20,35.191.0.0/16,130.211.0.0/22,{ingress_ip}"
    kubectl(["create", "configmap", "proxy-ips", f"--from-literal=ips={ips}"])


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
            "--shielded-integrity-monitoring",
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

    if not config.domain:
        print("domain configuration is required", file=sys.stderr)
        sys.exit(1)

    print("This will create the following resources:")
    print(f"- VPC network '{config.network_name}'")
    print(f"- IP address '{config.ip_address_name}'")
    print(f"- Router '{config.network_name}-nat-router'")
    print(f"- NAT config '{config.network_name}-nat'")
    print(f"- Service account '{config.gke_service_account_name}'")
    print(f"- GKE cluster '{config.gke_cluster_name}'")
    print("- Service account 'gnomad-es-snapshots'")
    print("- Service account 'gnomad-data-pipeline'")

    if input("Continue? (y/n) ").lower() == "y":
        print("Creating network...")
        create_network()

        print("Reserving IP address...")
        create_ip_address()

        print("Creating SSL certificate...")
        create_ssl_certificate()

        print("Creating service account...")
        create_cluster_service_account()

        print("Creating cluster...")
        create_cluster()

        print("Creating configmap...")
        create_configmap()

        print("Creating node pools...")
        create_node_pool("redis", ["--num-nodes=1", "--machine-type=e2-custom-6-49152"])

        create_node_pool("es-data", ["--machine-type=e2-highmem-8"])

        print("Creating K8S resources...")
        manifests_directory = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../manifests"))

        kubectl(["apply", "-k", os.path.join(manifests_directory, "redis")])

        # Install Elastic Cloud on Kubernetes operator
        # https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html
        kubectl(["apply", "-f", "https://download.elastic.co/downloads/eck/1.2.1/all-in-one.yaml"])

        # Configure firewall rule for ECK admission webhook
        # https://github.com/elastic/cloud-on-k8s/issues/1437
        # https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#add_firewall_rules
        gke_firewall_rule_target_tags = gcloud(
            [
                "compute",
                "firewall-rules",
                "list",
                f"--filter=name~^gke-{config.gke_cluster_name}",
                "--format=value(targetTags.list())",
            ]
        ).splitlines()[0]

        gcloud(
            [
                "compute",
                "firewall-rules",
                "create",
                f"{config.network_name}-es-webhook",
                "--action=ALLOW",
                "--direction=INGRESS",
                f"--network={config.network_name}",
                "--rules=tcp:9443",
                "--source-ranges=172.16.0.0/28",  # Matches GKE cluster master IP range
                f"--target-tags={gke_firewall_rule_target_tags}",
            ]
        )

        # Create a service account for Elasticsearch snapshots
        # https://www.elastic.co/guide/en/cloud-on-k8s/1.2/k8s-snapshots.html#k8s-secure-settings
        try:
            # Do not alter the service account if it already exists.
            # Deleting and recreating a service account with the same name can lead to unexpected behavior
            # https://cloud.google.com/iam/docs/understanding-service-accounts#deleting_and_recreating_service_accounts
            gcloud(
                [
                    "iam",
                    "service-accounts",
                    "describe",
                    f"gnomad-es-snapshots@{config.project}.iam.gserviceaccount.com",
                ],
                stderr=subprocess.DEVNULL,
            )
            print("Snapshot account already exists")
        except subprocess.CalledProcessError:
            gcloud(
                [
                    "iam",
                    "service-accounts",
                    "create",
                    "gnomad-es-snapshots",
                    "--display-name=gnomAD Elasticsearch snapshots",
                ]
            )
        finally:
            # Grant the snapshot service account object admin access to the snapshot bucket.
            # https://cloud.google.com/storage/docs/access-control/using-iam-permissions#bucket-add
            subprocess.check_call(
                [
                    "gsutil",
                    "iam",
                    "ch",
                    f"serviceAccount:gnomad-es-snapshots@{config.project}.iam.gserviceaccount.com:roles/storage.admin",
                    "gs://gnomad-browser-elasticsearch-snapshots",  # TODO: The bucket to use for snapshots should be configurable
                ],
                stdout=subprocess.DEVNULL,
            )

        # Download key for snapshots service account.
        # https://cloud.google.com/iam/docs/creating-managing-service-account-keys
        keys_directory = os.path.realpath(os.path.join(os.path.dirname(__file__), "../../keys"))
        if not os.path.exists(keys_directory):
            os.mkdir(keys_directory)
            with open(os.path.join(keys_directory, ".gitignore"), "w") as gitignore_file:
                gitignore_file.write("*")

        if not os.path.exists(os.path.join(keys_directory, "gcs.client.default.credentials_file")):
            gcloud(
                [
                    "iam",
                    "service-accounts",
                    "keys",
                    "create",
                    os.path.join(keys_directory, "gcs.client.default.credentials_file"),
                    f"--iam-account=gnomad-es-snapshots@{config.project}.iam.gserviceaccount.com",
                ]
            )

        # Create K8S secret with snapshots service account key.
        kubectl(
            [
                "create",
                "secret",
                "generic",
                "es-snapshots-gcs-credentials",
                "--from-file=gcs.client.default.credentials_file",
            ],
            cwd=keys_directory,
        )

        # Create a service account for data pipeline.
        try:
            # Do not alter the service account if it already exists.
            # Deleting and recreating a service account with the same name can lead to unexpected behavior
            # https://cloud.google.com/iam/docs/understanding-service-accounts#deleting_and_recreating_service_accounts
            gcloud(
                [
                    "iam",
                    "service-accounts",
                    "describe",
                    f"gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com",
                ],
                stderr=subprocess.DEVNULL,
            )
            print("Data pipeline service account already exists")
        except subprocess.CalledProcessError:
            gcloud(["iam", "service-accounts", "create", "gnomad-data-pipeline", "--display-name=gnomAD data pipeline"])

            # Grant the data pipeline service account the Dataproc worker role.
            subprocess.check_call(
                [
                    "gcloud",
                    "projects",
                    "add-iam-policy-binding",
                    config.project,
                    f"--member=serviceAccount:gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com",
                    "--role=roles/dataproc.worker",
                ],
                stdout=subprocess.DEVNULL,
            )

            # serviceusage.services.use is necessary to access requester pays buckets
            subprocess.check_call(
                [
                    "gcloud",
                    "projects",
                    "add-iam-policy-binding",
                    config.project,
                    f"--member=serviceAccount:gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com",
                    "--role=roles/serviceusage.serviceUsageConsumer",
                ],
                stdout=subprocess.DEVNULL,
            )

        finally:
            # Grant the data pipeline service account object admin access to the data pipeline bucket.
            # https://cloud.google.com/storage/docs/access-control/using-iam-permissions#bucket-add
            subprocess.check_call(
                [
                    "gsutil",
                    "iam",
                    "ch",
                    f"serviceAccount:gnomad-data-pipeline@{config.project}.iam.gserviceaccount.com:roles/storage.admin",
                    # TODO: This should use the same configuration as data pipeline output.
                    "gs://gnomad-browser-data-pipeline",
                ],
                stdout=subprocess.DEVNULL,
            )
