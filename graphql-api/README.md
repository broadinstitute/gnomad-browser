# gnomAD API

Since the gnomAD VCF files may be prohibitively large to download, the gnomAD API provides
a quick way to retrieve specific data of interest.

Please note that this resource is under development and the query schema is subject to change.

## Getting started

The gnomAD API uses [GraphQL](https://graphql.org/learn/) for queries.

To get started, open the interactive query editor at https://gnomad.broadinstitute.org/api.

Click the "Docs" button in the top right-hand corner to open up the Documentation Explorer.
GraphQL is self-documenting, so the fields and data described in this section are always
up-to-date. Browsing through the Documentation Explorer is the best way to understand how
to query data and learn which types of data are available to retrieve.

## Examples

Examples of fetching gnomAD allele counts for a specific variant using different languages.

### Python

```python
import json
import requests

QUERY = """
query getVariant($variantId: String!) {
  variant(variantId: $variantId, dataset: gnomad_r2_1) {
    exome {
      ac
      an
    }
    genome {
      ac
      an
    }
  }
}
"""

response = requests.post(
   "https://gnomad.broadinstitute.org/api",
   data=json.dumps({
      "query": QUERY,
      "variables": {"variantId": "1-55516888-G-GA"},
   }),
   headers={
      "Content-Type": "application/json",
   },
).json()
```

### JavaScript

```javascript
const QUERY = `
query getVariant($variantId: String!) {
  variant(variantId: $variantId, dataset: gnomad_r2_1) {
    exome {
      ac
      an
    }
    genome {
      ac
      an
    }
  }
}
`

fetch('https://gnomad.broadinstitute.org/api', {
  method: 'POST',
  body: JSON.stringify({
    query: QUERY,
    variables: {
      variantId: '1-55516888-G-GA',
    },
  }),
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then((response) => response.json())
  .then((data) => console.log(data.data))
```

## Rate Limiting

The GraphQL API includes rate limiting at the IP level, defined in `rate-limiting.ts`.

Certain IPs are whitelisted, allowing them to bypass the rate limits imposed by the API. These are defined in the file `gs://gnomad-browser/whitelist.json`. This json file's format is:

```
{
  "whitelisted_ips": [
    {
      "ip": "123.456.78.90",
      "description": "Example 1",
      "reason": "Lorem ipsum",
      "date_added": "2025-09-30"
    },
    {
      "ip": "234.567.89.0",
      "description": "Example 2",
      "reason": "Lorem ipsum",
      "date_added": "YYYY-MM-DD"
    }
  ]
}
```

To whitelist additional IPs, add another entry to the `whitelisted_ips` array.

## Long-read Y1 mode

Y1 uses one read-only ClickHouse connection and one disposable database at a time. The normal database name is fixed:

```text
gnomad_lr_y1_scratch_v5_current
```

Select the server by port with the launcher:

```bash
./start_lr_dev.sh --y1-clickhouse-port 8126
```

To open the GCP tunnels and use the Y1 server on the default local port `8126`:

```bash
./start_lr_dev.sh --gcp-clickhouse --y1-clickhouse-port 8126
```

Select a different Y1 instance explicitly without changing the existing default:

```bash
./start_lr_dev.sh --gcp-clickhouse \
  --y1-clickhouse-vm gnomad-lr-y1-full-genome-clickhouse \
  --y1-clickhouse-port 8127
```

Advanced use may set `LR_Y1_CLICKHOUSE_URL` and the identifier-validated `LR_Y1_CLICKHOUSE_DATABASE`. With no presentation routing, startup preserves the existing behavior: it resolves one terminal `accepted_frozen` run per present cohort and verifies canonical rows. A presentation process may provide both `LR_Y1_RUN_MAP` (JSON `cohort -> chromosome -> exact run ID`) and `LR_Y1_PRIMARY_MANIFEST_PATH`. The latter must name the bundled, checked manifest projection at `config/y1-presentation-primary-manifests.json`; its 48 entries are pinned to the exact original manifest SHA-256 values. Startup requires one exact manifest entry per route, validates unique gapless one-based intervals through the canonical GRCh38 contig end, and binds every current accepted ledger attempt to the exact task ID, bounds, source/index URI, generation, checksum, and size from that entry. It also requires zero rejects and reconciles accepted receipt counts to canonical physical counts. This presentation path does not require primary finalization. A manifest may explicitly mark an aggregate-only HGSVC/HPRC chromosome as `carrier_loading_status=unavailable_not_loaded`; primary variants remain available while carrier/haplotype capability fails closed.

The GraphQL `lr_cohort` argument defaults to `hgsvc_hprc`. Queries select primary runs by cohort and requested chromosome; an absent mapping remains unavailable and never falls back across cohorts. Every Y1 variant cache key includes cohort, run ID, and chromosome. ALT-expanded browser IDs use `<exact-source-id>~<alt-index>`, while `source_variant_id` preserves the source ID byte-for-byte.

Optional presentation ancillaries use `LR_Y1_ANCILLARY_ROUTES`, mapping modality and cohort to an exact `{database, run_id, receipt_path}`. The receipt is mandatory, deny-unknown-fields JSON with completed expected/accepted task counts, zero failures/rejects, and modality-specific reconciliation. Startup compares it to live physical data before advertising the route: coverage requires every GRCh38 position exactly once on all 24 contigs; STR requires exact mapping/available/unavailable/ambiguous counts, one-to-one mapping/canonical key reconciliation, and canonical row/contig reconciliation; methylation requires an exact roster with no orphan physical samples, each sample's declared rows/contigs and availability, and detail/summary totals by contig. Methylation also accepts the fenced `validated_success` terminal sample-total campaign receipt and derives the exact roster/contig reconciliation from read-only physical queries. Templates requiring execution-time replacement are in `config/y1-ancillary-*-completion-receipt.template.json`. Missing, partial, stale, or mismatched artifacts fail configured startup; unconfigured routes remain unavailable. Coverage and STR may be configured independently for HGSVC/HPRC and AoU; sample-total methylation remains HGSVC/HPRC-only. The ClickHouse client always sets `readonly=1`. Use `long_read_y1_provenance(lr_cohort:, chrom:)` for accepted-Y1 identity and capability labels.

### Retained HG00097 source-phased evaluation

After the coordinator has loaded and retained the fixed evaluation database, restart the dedicated development stack with:

```bash
export LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_URL=http://127.0.0.1:8126
export LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_USER="$Y1_CLICKHOUSE_WORKER_USER"
export LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_PASSWORD="$Y1_CLICKHOUSE_WORKER_PASSWORD"
LR_PHASED_METHYLATION_EVALUATION_ENABLED=true ./start_lr_dev.sh --gcp-clickhouse
```

The coordinator must revoke this principal's evaluation-table `INSERT` grant after the successful load and before restarting development, leaving only the exact database `SELECT` grant used here.

The API pins its read-only client to `gnomad_lr_y1_scratch_phased_methylation_evaluation_v5_hg00097_chr22_47040000_47050000_v1` and table `lr_y1_methylation_phased_staging`; callers cannot select another database, table, sample, source, or interval outside chr22:47,040,000-47,050,000. Startup requires positive rows for both raw source labels and rejects any cross-sample, cross-region, or malformed record. The separate `source_phased_methylation` field always returns `vcf_strand=null`, `phase_set=null`, `joinable_to_vcf=false`, and orientation `UNCONFIRMED`.

Exact evaluation URL:

`http://localhost:8008/region/22-47040000-47050000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true&show_source_phased_methylation=true`

The retained source-phased evaluation remains a separate, explicitly pinned read-only diagnostic source. It does not change Y1 run discovery, provenance, or the configured Y1 database. Variant responses include `data_source`, `source_release`, and the discovered `source_run_id`; the REST haplotype response includes the same generic accepted-Y1 provenance.
