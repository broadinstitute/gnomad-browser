# gnomAD LR managed Redis

This is the independent Terraform root for the private Memorystore replacement
for Redis on `gnomad-lr-data-vm`. Its state is intentionally separate from the
broad `lr-viewer` root:

```text
gs://gnomadev-terraform-state/lr-redis/default.tfstate
```

The root owns only:

- enablement of `redis.googleapis.com` (left enabled on destroy), and
- the Basic 1 GiB Redis 7.2 instance `gnomad-lr-redis` in `us-east1`.

The instance uses `DIRECT_PEERING` to `gnomad-v4-dev` and a dedicated
`10.252.0.0/29` producer range. This avoids creating or changing shared Private
Service Access allocations. It exposes no public endpoint. Plaintext/no-AUTH is
intentional compatibility with the existing private-VPC ioredis clients, which
select logical DB 1 for cache entries and DB 2 for rate limits.

This root does **not** update Cloud Run environment variables or traffic and does
not manage or stop `gnomad-lr-data-vm`.

## Apply

```sh
terraform init
terraform plan -out=redis.tfplan
terraform show redis.tfplan
terraform apply redis.tfplan
```

The instance has Terraform `prevent_destroy`; remove that guard only in a
separately reviewed retirement change.
