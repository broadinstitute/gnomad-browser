# Long-read TR follow-up Phase 0 baseline

Recorded on 2026-08-25 before semantic changes to the long-read tandem-repeat follow-up.

## Repository baseline

- Branch: `gnomad-lr`
- Clean starting HEAD: `2b23cad116c4fe7e2bda3558db4c43b61f08b1cb`
- Compact crosswalk SHA-256: `539ba6668d353c3a6442d9c831bb11a65e4b3b84c1fb8d93ee9bfe25df406f03`
- Catalog transfer digest: `638cb10c4d834af1fced0f73af28f4bd7d7ef018ce50aa218b612ca24bb03a43`

The durable machine fixture is
`graphql-api/src/queries/__fixtures__/long-read-tr-follow-up-phase0.json`.
`graphql-api/src/queries/long-read-tr-follow-up-phase0.spec.ts` binds it to the compact
crosswalk and replays exact, near-match, duplicate, and ambiguous matcher cases.

## Crosswalk reconciliation

| Inventory                       | Count |
| ------------------------------- | ----: |
| Short-read catalog records      |    78 |
| HGSVC/HPRC exact unique matches |    51 |
| AoU exact unique matches        |    58 |
| HGSVC/HPRC absent exact matches |    27 |
| AoU absent exact matches        |    20 |

The implementation baseline's classification-gated dotted outline appears for 48/51
HGSVC/HPRC and 55/58 AoU exact matches. EIF4A3, RFC1, and STARD7 are the three exact
matches omitted in both cohorts because their exact reference repeat unit has the raw
catalog label `benign`. This is characterization only; the fixture does not change that
source meaning.

## Frozen scientific cases

- **EIF4A3 chr17:** exact component 1 motif
  `CCTCGCTGTGCCGCTGCCGA` is `benign`; the distinct one-base-different
  `CCTCGCTGCGCCGCTGCCGA` motif is `pathogenic` and is not the LR component.
- **HTT:** exact CAG component in the six-component locus. The two CCG components have
  different coordinates and are not duplicate identity.
- **ATXN1:** exact stored orientation is `TGC`.
- **RFC1 / STARD7:** exact reference units `AAAAG` / `AAAAT` are `benign`.
- **COMP / NOTCH2NLC:** two-disease fixtures; both are exact in AoU and absent in
  HGSVC/HPRC.
- **BEAN1 / YEATS2:** coordinate-equal rotation and reverse-complement/rotation examples
  remain motif mismatches.
- **AR:** overlap without exact bounds remains a non-match.
- Synthetic duplicate ordered component, duplicate catalog key, duplicate reference
  region, and multiple-containing-locus cases remain explicitly ambiguous/fail-closed.

## Aggregate short-read distribution receipt

The fixture records aggregate `allele_size_distribution` and `genotype_distribution`
receipts from Elasticsearch alias `gnomad_v3_short_tandem_repeats`, resolved at capture
to concrete index `gnomad_v3_short_tandem_repeats-2026-07-29--20-42` (index UUID
`-I0qNVPKSF-xUsIMbCZbqQ`, creation epoch ms `1785357757456`). No sample IDs or carrier
rows were requested or stored. Each per-record digest is SHA-256 over compact UTF-8 JSON
with keys `allele_size_distribution` then `genotype_distribution`, preserving source
array and object-key order.

- 78-record receipt-list SHA-256:
  `4601442c76f0602fa4932896e4b823527b60df542168679ed3b18484c8835a5f`
- Compact distribution bytes: min 13,219; median 114,506; p95 525,348; max 928,685.
- All observed maxima belong to RFC1: 620 allele rows, 740 genotype rows, 4,953 allele
  bins, 6,907 genotype bins, and 11,860 total bins.

Focused receipts:

| Locus     | Distribution SHA-256                                               |   Bytes | Allele rows/bins | Genotype rows/bins |
| --------- | ------------------------------------------------------------------ | ------: | ---------------: | -----------------: |
| EIF4A3    | `1b1a59ebb781961f73c13c40ddc037273608c71276781efd9732e4ed84912001` | 176,539 |        162 / 791 |        162 / 1,206 |
| HTT       | `c3dfc92b9d83fa1246b50f90be1fc33d3fd2fc6674b418b33b1bdc02a08ea8d3` | 166,278 |         71 / 560 |         71 / 1,560 |
| ATXN1     | `1113a1a7469805f46082fc82af7b516a414f70ab0a6f1f0dfce606afe8caafd3` | 155,533 |        114 / 621 |        114 / 1,254 |
| RFC1      | `beb11523d230f22df9c4ea4a230c061a4cb0c67b466a0e70548f53569299d2b7` | 928,685 |      620 / 4,953 |        740 / 6,907 |
| STARD7    | `008c2bd4f37d3c82ff09fdc485c82ec87d15211741ab0e756e0a3a6dc8909363` | 525,348 |      463 / 2,518 |        559 / 3,563 |
| COMP      | `91a6d5d9038a6ea77cd70fe7e0e48875125dfc9ecb910f160114baaddcea6d22` |  13,879 |          35 / 38 |            35 / 35 |
| NOTCH2NLC | `122cda2812a8c1a3ed44f8ccd1a490433969b4f7c14873e2a7eed6a89b900644` | 300,269 |      153 / 1,150 |        153 / 2,678 |
| BEAN1     | `54390a69036b3b2c73e9957ba71f4c9b4d8c23e002e53e5812490fbf2c0e5227` | 630,580 |      323 / 2,794 |        341 / 5,405 |
| YEATS2    | `810a8cb8aa1df48ffc28e1eff4dc9a6675fe495c6e2bb838de086b0a3f41c620` | 529,284 |      316 / 2,617 |        333 / 4,280 |
| AR        | `8a4048536ea4946a8004d9186dcffcc0dab6fc8e0e2557d8c5cb326f73f129f8` | 145,232 |         96 / 614 |         96 / 1,190 |

These hashes are characterization receipts, not a new admission contract. Future code
must continue to fail closed rather than truncate or infer exact LR contributors from
aggregate short-read or LR repeat-count histograms.

## Focused baseline verification

The pre-change targeted Jest run covered matcher, context, histogram/plot interaction,
exact index, help, schema, and crosswalk behavior:

```sh
pnpm exec jest --runInBand \
  graphql-api/src/queries/build-long-read-tr-reference-crosswalk.spec.ts \
  graphql-api/src/queries/long_read_tr_reference.spec.ts \
  graphql-api/src/queries/short-tandem-repeat-queries.exact-match.spec.ts \
  graphql-api/src/graphql/long-read-identity-schema.spec.ts \
  graphql-api/src/queries/long_read_tr_histograms.spec.ts \
  browser/src/LongReadTandemRepeatPage/LongReadTrVisualizations.spec.tsx \
  browser/src/LongReadTandemRepeatPage/LongReadTandemRepeatPage.spec.tsx \
  browser/src/LongReadTandemRepeatPage/ShortReadKnownLocusContext.spec.tsx
```

Result at the clean baseline: **8 suites, 98 tests passed**. The focused current-HEAD
Playwright file passed **3/3 tests**, covering the simple-locus plot/index path and HTT
selection, history, legacy redirect, 72-HGSVC/497-AoU exact-index reachability, plot
filtering, and responsive layouts. After adding the freeze, the final focused Jest run
passed **9 suites / 116 tests**, including all 18 new freeze assertions. Test outcomes
are retained here and in the Phase 0 report rather than encoded as scientific fixture
data.
