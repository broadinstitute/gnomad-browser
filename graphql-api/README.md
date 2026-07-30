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

## Isolated long-read Y1 pilot

The legacy long-read queries remain the default. To test the cohort-aware Y1 schema against an isolated ClickHouse database, start a separate API process with all of the following variables:

```bash
LR_Y1_ENABLED=true
LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:8126
LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_scratch_1mb_v2
LR_Y1_HGSVC_RUN_ID=y1-hgsvc_hprc-...
LR_Y1_AOU_RUN_ID=y1-aou-...
```

The GraphQL `lr_cohort` argument defaults to `hgsvc_hprc`. Summary queries support `hgsvc_hprc` and `aou`; the browser disables Haplotype View for AoU. Every Y1 query and cache key includes cohort and uses the explicitly pinned run ID. ALT-expanded browser IDs use `<exact-source-id>~<alt-index>`, while `source_variant_id` preserves the source ID byte-for-byte. AoU IDs are rendered as non-links in the pilot.

Schema v3 materializes ALT-specific RSID, CADD, PhyloP, VEP consequence, and short-read-match annotations in `lr_y1_alleles`; serving queries do not parse the retained source INFO JSON. HGSVC/HPRC Haplotype View reads `lr_y1_carriers`. It places phased calls, haploid calls, and unphased homozygous-ALT calls, but does not invent phase for unphased heterozygous or partial calls. The REST payload reports excluded ambiguous rows in `_phase_summary`, and the browser displays that count.

Do not set `LR_Y1_ENABLED` on the legacy API or repoint production until a full-chromosome serving run has been validated and activated.

## Opt-in chr22 mixed-provenance prototype

This mode is separate from the default Y1 pilot and is fail-closed. Start only a dedicated non-production API process. It requires active accepted/published pointers; physical rows or free-form run IDs are not sufficient.

```bash
LR_Y1_ENABLED=true
LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED=true
LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:8126
LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_serving_chr22_r2_rehearsal
LR_Y1_HGSVC_RUN_ID=y1-full-chr22-hgsvc-hprc-20260728-r2-retry1
LR_Y1_AOU_RUN_ID=y1-full-chr22-aou-20260728-r2
LR_Y1_HGSVC_METADATA_RUN_ID=y1-metadata-full-chr22-20260728-r2-retry1
LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_URL=http://127.0.0.1:8127
LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE=gnomad_lr_y1_prototype_ancillary_chr22
LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES=coverage,str_histogram,methylation
LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST=./graphql-api/data/lr-y1-prototype-methylation-available-samples.txt
```

From the repository root, the supported local entrypoint resolves those accepted run IDs and opens three independent IAP tunnels: legacy ClickHouse on `8125`, Y1 serving on `8126`, and isolated prototype ancillary ClickHouse on `8127`:

```bash
./start_lr_dev.sh --gcp-clickhouse
```

The legacy `CLICKHOUSE_URL` remains on `8125`; Y1 primary/metadata and prototype ancillary clients never replace it. The script also exports `LR_Y1_ENABLED=true` and `LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED=true` to both the API and browser. Use `LR_DEV_DRY_RUN=1` to print and statically validate the resolved configuration without starting any process. Tunnel ports, database names, run IDs, ancillary modalities, and the methylation allowlist can be overridden with the environment variables shown by `./start_lr_dev.sh --help`.

The ancillary target must be a distinct, read-only prototype database. Allowed modality names are `coverage`, `methylation`, and `str_histogram`; all three are enabled by the one-command prototype default. Each modality is disabled unless its exact startup schema/count/identity preflight passes: 50,818,468 contiguous `lr_y1_coverage` rows, 35,005 exact-key STR rows, and the canonical methylation detail/summary/availability tables. Methylation uses the checked-in exact 210-available-sample allowlist and requires a 292-row availability roster; every excluded row must have an explicit `unavailable_*` status and non-empty reason. Detail must contain 124,477,729 rows across those 210 samples and reconcile exactly to the 655,358-row canonical summary. mQTL is never allowed. A failed capability preflight is unavailable rather than an empty or zero-valued result.

### Retained HG00097 source-phased evaluation

After the coordinator has loaded and retained the fixed evaluation database, restart the dedicated development stack with:

```bash
export LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_USER="$Y1_CLICKHOUSE_WORKER_USER"
export LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_PASSWORD="$Y1_CLICKHOUSE_WORKER_PASSWORD"
LR_PHASED_METHYLATION_EVALUATION_ENABLED=true ./start_lr_dev.sh --gcp-clickhouse
```

The coordinator must revoke this principal's evaluation-table `INSERT` grant after the successful load and before restarting development, leaving only the exact database `SELECT` grant used here.

The API pins its read-only client to `gnomad_lr_y1_scratch_phased_methylation_evaluation_v5_hg00097_chr22_47040000_47050000_v1` and table `lr_y1_methylation_phased_staging`; callers cannot select another database, table, sample, source, or interval outside chr22:47,040,000-47,050,000. Startup requires positive rows for both raw source labels and rejects any cross-sample, cross-region, or malformed record. The separate `source_phased_methylation` field always returns `vcf_strand=null`, `phase_set=null`, `joinable_to_vcf=false`, and orientation `UNCONFIRMED`.

Exact evaluation URL:

`http://localhost:8008/region/22-47040000-47050000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true&show_source_phased_methylation=true`

Mixed mode validates that both active primary pointers name published full-chromosome Y1/GRCh38/chr22 runs, that the HGSVC active metadata pointer names an accepted 292-row run, and that metadata/carrier rosters each contain 292 samples. Any mismatch prevents the API from listening. HGSVC ancillary preflight failures become explicit unavailable capabilities; they never become empty arrays or zero. AoU is always summary-only and never dispatches metadata, carrier, haplotype, coverage, methylation, STR, or mQTL queries to the ancillary endpoint.

Use `long_read_prototype_provenance(lr_cohort:, chrom:)` for source/capability labels. Variant responses include `data_source`, `source_release`, and `source_run_id`; the REST haplotype response includes `provenance`. Primary cache identities include release, cohort, reference, prototype mode, and accepted run ID. The mode rejects non-chr22 primary/haplotype requests and never falls back to legacy primary data.
