# gnomAD LR Y1 demo ClickHouse

This Terraform root provisions a fresh, isolated ClickHouse VM for Y1 acceptance. It has separate state and does not manage the legacy `gnomad-lr-data-vm` or existing Cloud Run services.

## Measured legacy reference (2026-07-27)

- VM: `e2-standard-4` (4 vCPU, 16 GB RAM)
- Data disk: 500 GB `pd-ssd`; 104 GB used, 366 GB available
- Active application parts: 83.40 GiB / 9.31 billion rows
- ClickHouse system parts: 19.73 GiB
- Trace and text logs alone: 15.87 GiB

The Y1 demo therefore starts at the same compute size, a 300 GB `pd-balanced` data disk, and a 30 GB boot disk. The data disk can be expanded after the 10 kb/1 Mb pilots; it cannot be shrunk.

## Safety properties

- Separate GCS Terraform state prefix: `lr-y1-clickhouse`
- No public IP; dedicated Cloud NAT for outbound package/source access
- Dedicated service account
- Persistent disk protected by `prevent_destroy`
- VM deletion protection
- Daily snapshots retained for 14 days
- ClickHouse default user restricted to localhost/IAP tunnel
- No Cloud Run cutover or legacy resource changes
- Trace/text system logs disabled to avoid the legacy instance's ~16 GB overhead

## Before apply

The source Terra bucket currently returns HTTP 403 to the legacy service account. Arrange a bucket-level grant for the new service account or copy generation-pinned Y1 inputs to an approved immutable bucket. That external grant is intentionally not represented as broad project-level IAM here.

Review the package pin in `clickhouse_version`; the package must remain available from the configured ClickHouse repository.

## Plan

```bash
cp terraform.tfvars.example terraform.tfvars
terraform fmt -check
terraform init
terraform validate
terraform plan -out=y1-clickhouse.tfplan
terraform show y1-clickhouse.tfplan
```

Do not apply until the plan is reviewed and source-access ownership is settled.

## Connect after provisioning

Use the `iap_tunnel_command` output, then:

```bash
curl http://127.0.0.1:8126/ping
clickhouse-client --host 127.0.0.1 --port 9000
```

Deploy the repository-owned `gnomad-lr/sql/y1/` schema and run synthetic publication tests before any real 10 kb source load.
