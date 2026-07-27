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

Do not set `LR_Y1_ENABLED` on the legacy API or repoint production until a full-chromosome serving run has been validated and activated.
