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

### Full-genome source-labelled hap1/hap2 methylation

Configure the exact source-only route separately from sample-total methylation:

```bash
export LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE="$(jq -cn \
  --arg database gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3 \
  --arg run_id y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1 \
  --arg receipt_path "$PWD/graphql-api/config/y1-source-phased-methylation-serving-receipt.json" \
  '{database:$database,run_id:$run_id,receipt_path:$receipt_path}')"
```

The deny-unknown-fields receipt binds completion receipt SHA-256 `f259273f...d23f85`,
the exact 12,162,269,986-row product, 10,392 accepted tasks, 231 source-present samples,
23 nonempty contigs, the frozen source manifest, and the exact browser primary VCF manifest
bundle. Startup admits the route only when the table's eight-column MergeTree schema,
constraints, partition/sort keys, and every physical partition row count match the receipt.
AoU and samples absent from the 231-sample source roster are rejected; there is no
sample-total fallback.

The operator confirmation available for this change did not name an immutable VCF object or
the exact browser primary VCF bundle. Therefore this route is intentionally
`source_labelled_only`: `source_haplotype` remains HAP1/HAP2, while `vcf_strand` and
`phase_set` remain null and `joinable_to_vcf=false`. The browser shows separate VCF GT rows
and source BED tracks, explicitly without visual or contract alignment. That historical raw
receipt is not rewritten. The separate additive receipt below supplies the later operator
assumption binding 1→GT1 and 2→GT2 to the exact browser VCF manifest bundle and immutable
VCF/TBI identities.

### Operator-approved joined phased methylation (local only)

The additive joined query uses the raw route above plus a distinct, hash-pinned orientation
receipt. For local startup, also set:

```bash
export LR_Y1_JOINED_PHASED_METHYLATION_ROUTE="$(jq -cn \
  --arg database gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3 \
  --arg run_id y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1 \
  --arg raw_receipt_path "$PWD/graphql-api/config/y1-source-phased-methylation-serving-receipt.json" \
  --arg orientation_receipt_path "$PWD/graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json" \
  --arg expected_orientation_receipt_sha256 e3d7c819e0cb8fb759d8ce1611eec1228ae3a40d6f9407cbbfbe50551809e460 \
  '{database:$database,run_id:$run_id,raw_receipt_path:$raw_receipt_path,orientation_receipt_path:$orientation_receipt_path,expected_orientation_receipt_sha256:$expected_orientation_receipt_sha256}')"
```

Startup fails closed unless the exact raw product, orientation receipt, primary manifest
bundle, all chr1-chr22 immutable VCF/TBI identities, and active primary carrier runs agree.
The approved semantics are chromosome-wide direct HAP1→GT1 and HAP2→GT2; `phase_set` is
therefore null. This is an explicit operator assumption, not independently machine-verified
lineage and not a maternal/paternal claim. The receipt binds the exact statement, scope,
operator role, decision timestamp, and SHA-256 of the recorded Flow user-request artifact.
It explicitly records that this is not a cryptographic human signature. Production release
review must accept that assumption as a release gate rather than treating it as scientific
lineage verification. `chrX`, `chrY`, AoU, source-absent samples, sample-total data, and all
fallback behavior are excluded.

The joined region arguments and records use an explicit browser coordinate contract:
`start` and `stop` are an inclusive one-based range and `start >= 1`. The source table remains
raw BED 0-based half-open. A one-base source row `[start0,end0)` is selected when `start0` is
in `[start-1,stop-1]`, and the joined response exposes `pos1=start0+1` and `pos2=end0+1`
(`pos2=pos1+1`). Any non-one-base row or row outside the canonical request fails the response
closed. The historical source-labelled endpoint retains its raw source coordinates.

Each joined region field costs 25 and each roster-bearing capability field costs 10 against
the default maximum query cost of 35. Independent validation caps allow only one of each joined
field per GraphQL document. The bounded ClickHouse
query also applies a 30-second execution limit, result/read row limits, and a 1 GiB read limit;
the existing 250,001-row overflow sentinel remains authoritative.

No release packaging is changed here. A future release must explicitly add the orientation
receipt to the API image allowlist/artifact manifest and set the joined route environment;
Terraform, Docker, and deployed configuration intentionally remain untouched in this phase.
