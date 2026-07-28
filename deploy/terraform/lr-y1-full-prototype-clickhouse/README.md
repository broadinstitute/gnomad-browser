# Isolated Y1 full-prototype ClickHouse

This independent Terraform root plans the third ClickHouse environment for the full-genome prototype. It does not import, reference, resize, or manage either `gnomad-lr-data-vm` or `gnomad-lr-y1-clickhouse`.

## Isolation and sizing

- State: `gs://gnomadev-terraform-state/lr-y1-full-prototype-clickhouse`
- VM/data disk: `gnomad-lr-y1-full-prototype-clickhouse` and a protected 3 TB `pd-balanced` disk
- Compute: `n2-highmem-32`, 50 GB boot disk, ClickHouse `26.3.9.8`
- Network: dedicated `192.168.16.0/23` subnet, router, and NAT; private IP only, with replacement headroom for 128 workers
- Access: IAP SSH to the ClickHouse tag and dedicated pool identities; private TCP 3000 only from workers to the coordinator; TCP 8123 only from workers to ClickHouse, with ClickHouse itself restricted to the dedicated `/24`
- Identity: separate ClickHouse, coordinator, and worker service accounts; the dormant 128-worker profile explicitly selects private-only instances, external firewall management, the dedicated subnet, and both pool identities
- Recovery: pristine bootstrap snapshot plus a dedicated daily 30-day snapshot policy
- Labels/tags: `dataset=gnomad-lr-y1`, `purpose=full-prototype`

The shared VPC and source/evidence buckets are data sources, so this state does not own their lifecycles. **This is not a zero-existing-scope plan:** it intentionally adds IAM members to the existing project, buckets, and worker service-account policy. The additive effects are three project bindings (`logWriter` and `metricWriter` for ClickHouse, plus `compute.instanceAdmin.v1` for the coordinator), three `gnomad-lr-data` bucket bindings (ClickHouse and worker `objectViewer`; coordinator `objectUser` conditionally limited to `pool-ops/full-genome-128/`), one `gnomad-lr-y1-reports` binding (ClickHouse `objectCreator`), and one worker-service-account binding (`iam.serviceAccountUser` for the coordinator). The compute role is held only by the dedicated coordinator, while actAs is scoped only to the dedicated worker identity. Workers receive no project-level role and cannot mutate the source bucket. `*_iam_member` preserves other members, but applying it still changes those existing IAM policies and requires explicit review.

The prototype subnet is outside the chr22 `192.168.0.0/20` ClickHouse allowlist, so prototype workers do not gain a network path to chr22. The dedicated worker identity is also the firewall source. GCP rejects subnet overlap at plan/apply; reviewers must verify the candidate CIDR against the plan before approval.

The VM, data disk, bootstrap snapshot, and snapshot policy use deletion protection and/or `prevent_destroy`. Fresh schemas must be installed after provisioning; no existing ClickHouse snapshot is restored.

## Plan only

```bash
cd deploy/terraform/lr-y1-full-prototype-clickhouse
cp terraform.tfvars.example terraform.tfvars # optional; defaults match it
terraform fmt -check
terraform init
terraform validate
terraform plan -out=full-prototype.tfplan
terraform show -json full-prototype.tfplan > full-prototype.tfplan.json
```

Do **not** apply until the saved plan is reviewed. Its action list must contain zero update, delete, or replacement actions, and no address may identify either existing ClickHouse instance, disk, firewall, or snapshot policy. Reviewers must separately classify every planned `google_project_iam_member` and `google_storage_bucket_iam_member` create as an additive policy effect on an existing scope rather than as a new isolated cloud scope.

A concise JSON safety check is:

```bash
jq '{actions: [.resource_changes[].change.actions] | group_by(.) | map({actions: .[0], count: length}), forbidden: [.resource_changes[] | select(.change.actions | index("update") or index("delete")) | .address]}' full-prototype.tfplan.json
```
