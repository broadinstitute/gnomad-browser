# Dedicated LR beta ingress (plan first)

Isolated, additive Terraform root for
`https://long-read-beta.gnomad.broadinstitute.org` in **gnomadev**. State:
`gs://gnomadev-terraform-state/lr-beta-ingress/default.tfstate`.
Do not run the broader `lr-viewer` root to deploy this edge.

## Scope

Owns 11 new resources, all named `gnomad-lr-beta-*`:

- Premium global external static IPv4 (`gnomad-lr-beta-ip`, `prevent_destroy`).
- Global external managed HTTP/HTTPS forwarding rules and target proxies.
- Compute Google-managed certificate for this **exact hostname** only.
- Separate HTTP redirect and HTTPS URL maps.
- Regional serverless NEG in `us-east1` targeting existing `gnomad-lr-browser`.
- Global backend explicitly attached to a dedicated Cloud Armor policy;
  load-balancer request logging at sample rate 1.0 (also carries Armor results).

No Run services, revisions, ingress, IAM, images, environment, traffic, API
routing, DB/Redis, DNS, shared WAF, API enablement or production resources are
managed here. There are no VM-style health checks. The NEG targets current
browser service traffic; **all paths, including `/api/`, go to the browser**,
preserving its existing nginx proxy and pinned API revision. This root does not
pin or change the browser service's traffic allocation.

### Host routing and redirects

HTTPS serves the backend only for the exact beta host. Other Host headers go to
a fixed canonical HTTPS root with query removed (301), never to the application.
The certificate covers only the beta name: other SNI names/IP requests normally
fail TLS validation before an HTTP redirect can be seen.

HTTP never serves the backend. The exact host gets a 308 redirect to the fixed
HTTPS hostname, preserving method, path and query. Other hosts get a 308 to the
fixed canonical HTTPS root, stripping query. No redirect reflects an untrusted
Host header. This is not a promise to make HTTP POSTs confidential; clients must
use HTTPS directly.

### Conservative beta WAF

- Enforced per-client **IP**, not a user-supplied forwarding header: throttle at
  **600 requests per 60 seconds**, excess returns 429, no ban. Ten requests/sec
  on average leaves headroom for assets/GraphQL and shared institutional NATs
  compared with production's stricter policy. This is an initial operational
  choice, not a capacity guarantee; rate limiting is approximate/distributed.
- SQLi and XSS stable v3.3 sensitivity-1 signatures are **preview only**. Review
  GraphQL and shared-NAT traffic/logs before changing enforcement or thresholds.
- Default allow; no inherited production geo/ASN restrictions.
- **Direct Run and tagged URLs still bypass this WAF.** Ingress/IAM changes are
  deliberately out of scope; this does not establish an exclusive protected
  origin or fix API availability. Request logging can incur cost and contain
  URL metadata; no verbose request-body logging is enabled here.

## Review / plan

Requires existing Compute and Cloud Run APIs, bucket access/locking, and
permissions to create these dedicated Compute/Armor resources. No credentials
are stored here. Uses ambient ADC, not necessarily the gcloud active account;
check the intended deployment identity. Do not change global gcloud config or
relogin automatically. Google provider **7.30.0** and checksums were copied from
`../lr-viewer/.terraform.lock.hcl`; no existing roots were upgraded. Tested CLI:
Terraform 1.5.7.

Save plans outside the repository in a private artifact directory:

```sh
umask 077
terraform init -input=false -lockfile=readonly
terraform fmt -check
terraform validate
terraform plan -input=false -lock-timeout=60s -out="$ARTIFACT_DIR/ingress.tfplan"
terraform show -json "$ARTIFACT_DIR/ingress.tfplan" > "$ARTIFACT_DIR/ingress.tfplan.json"
```

Review must show **11 creates, zero updates, zero deletes**, with only this
root's dedicated resources. If matching resources or prior state exist, stop
and reconcile ownership; do not duplicate, import or migrate them blindly.
Plans/state can contain sensitive metadata: keep artifacts private, out of git.
`prevent_destroy` protects the address while its resource remains configured;
it is not a cloud deletion lock or protection against removing the whole block.

**No apply is authorized by this README.** A separately authorized operator
must review the saved plan, current identity/state and intervening changes.
Plan/validation success does not prove create permissions, quotas, organization
policy compatibility, server-side WAF validation, or application health.

## After separately approved apply: BITS handoff and readiness

```sh
terraform output -raw bits_dns_record
terraform output -json bits_dns_request
```

These outputs give the **actual newly allocated IPv4**, e.g. the record shape
`long-read-beta.gnomad.broadinstitute.org. 300 IN A <allocated IPv4>`.
There is no actual IP before apply: do not hand BITS an invented address or one
of the existing production/dev frontend addresses. BITS owns the DNS change;
this root does not perform it. Request only the new A record, initial TTL 300.
Check inherited CAA permits Google issuance and no conflicting CNAME/AAAA exists;
this frontend is IPv4-only. Certificate issuance requires public DNS pointing
to this frontend and the certificate attached to its HTTPS proxy.

After DNS propagates, check Compute certificate `gnomad-lr-beta-cert` with
explicit `--project=gnomadev`; both managed status and the hostname status must
be ACTIVE. Terraform apply can finish while the certificate is PROVISIONING.
Before ACTIVE, HTTP redirects can send users to an unusable HTTPS endpoint.
Do not announce readiness solely because the IP exists or apply succeeds.

Before launch, verify correct-host HTTP redirects preserve path/query, unknown
HTTP hosts canonicalize safely, SNI/TLS validation, browser assets/deep links,
`/api/` GraphQL and modality queries, backend/Armor attachment and request logs,
preview false positives and realistic rate-limit behavior. Test unknown HTTPS
Host handling using valid beta SNI. Earlier investigation observed API/GraphQL
timeouts: end-to-end availability remains a gate independent of this edge.
Origin-bypass closure needs a separately reviewed change that preserves the
browser's pinned API path; it is explicitly **not completed by this root**.
