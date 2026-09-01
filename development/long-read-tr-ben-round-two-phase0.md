# Ben round-two long-read TR Phase 0 baseline

Recorded from a clean `gnomad-lr` worktree at
`29fc595d970e88992e06061ec56594ba8da5a41f`. The corresponding backend planning
baseline is `4d38525fba925b0956b94e484bc03a600a75c5d1`.

This phase freezes current behavior; it does not implement the later presentation,
GraphQL, filtering, length-axis, disease-context, or sequence-coloring changes. Canonical
identity remains the complete ordered vector of exact GRCh38 zero-based half-open
component tuples.

## Candidate status

The held API revision `gnomad-lr-api-00026-gej` and browser revision
`gnomad-lr-browser-00020-top`, tagged `fg-29fc595d-20260901t191003z`, both had **0%
traffic** when reviewed. They are retained only as superseded evidence. They are not an
approved cutover pair and are not a rollback target. Any rollback remains the exact
pre-cutover public API/browser pair.

## Machine fixture

`graphql-api/src/queries/__fixtures__/ben-round-two-tr-phase0.json` freezes only
aggregate/public locus and source-ALT observations. It contains no sample identifiers,
carrier rows, raw genotypes, or person-level linkage. The companion
`graphql-api/src/queries/ben-round-two-tr-phase0.spec.ts` checks:

- exact ordered identity, stored motif orientation, duplicate coordinate-distinct motifs,
  overlaps, gaps, envelopes, and cohort-scoped source ALT identity;
- simple T, ARX_1, ATXN1, RFC1, HTT, and sparse compound cases;
- the cohort-distinct chr16 ALT `chr16-85400249-TRV-93~6` bytes and represented lengths;
- both 24-component records, the exact 2,880-character 103-component identity, and a
  deterministic synthetic 180-component density contract;
- > 600-ALT typed-unavailable characterization without relaxing current guards; and
- later-contract scaffolds for duplicate ALT bytes and represented-length disagreement.

The fixture is characterization, not a positive scientific classification receipt.
Specifically, component count does not establish `VARIATION_CLUSTER`, exact ALT identity
count does not establish unique byte count, and an envelope does not establish represented
allele length.

## Exhaustive round-two feedback disposition

Disposition meanings: **stale** is already addressed at the frozen baseline; **new** is
implementation work; **blocker** must be fixed or fail closed before a replacement
candidate; **follow-up** is deliberately outside the safe replacement scope.

| ID    | Ben item                                                                           | Disposition                             | Required handling / gate                                                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B2-01 | Are canonical variant/TR pages planned?                                            | stale                                   | `/tandem-repeat/:id` exists; retain canonical route and exact identity.                                                                                                                              |
| B2-02 | Make the LR TR page match the short-read TR page.                                  | stale/superseded                        | Do not copy one assay-specific page. Use the two-layout plan while reusing exact known-locus context.                                                                                                |
| B2-03 | Distinguish a simple repeat from an adjacent/multi-motif variation cluster.        | new blocker                             | API-backed scientific kind plus independent visual layout; **G-SCIENCE-KIND**. Neutral multi-component fallback while pending.                                                                       |
| B2-04 | Use a repeat-focused presentation for reviewed primary loci such as HTT.           | new blocker                             | Receipt-backed override only; retain all six HTT components and compound badge; **G-BEN-PRESENTATION**.                                                                                              |
| B2-05 | Give cluster-like records a coherent compact overview and appropriate space.       | new blocker                             | Cluster-focused layout, 180–220 px overview, whole-record plots, closed bounded component disclosure.                                                                                                |
| B2-06 | Clarify region size / repeat span / cluster length.                                | new blocker                             | Name component envelope, source REF span, represented length, and source cluster bounds separately; never infer equivalence.                                                                         |
| B2-07 | Stop concatenating every motif in gene/region rows.                                | new blocker                             | Compact simple/reviewed/cluster labels; preserve complete canonical identity in export/provenance.                                                                                                   |
| B2-08 | Keep large 24-component rows usable.                                               | new blocker                             | Numbered overview plus bounded component table; acceptance also covers exact 103 and synthetic 180 components.                                                                                       |
| B2-09 | Sort the allele/sequence index by AC.                                              | new blocker                             | Current-filter AC descending, null last, stable source record/ALT-index ties. Gene/region rows remain position sorted; **G-BEN-PRESENTATION**.                                                       |
| B2-10 | Rename “Select” to “Details.”                                                      | new blocker                             | Preserve in-place URL/history/focus; selected state becomes “Details shown.”                                                                                                                         |
| B2-11 | Use “unique allele sequences” and improve ALT counters.                            | new blocker                             | Add source-identity versus byte-unique counts. Say **Source ALT alleles** until byte completeness is proven; **G-SEQUENCE-TERM**.                                                                    |
| B2-12 | Keep primary row wording simple (for example, Sequence 17).                        | new                                     | Show technical source ALT identity secondarily without changing `alt_index`, route, or provenance; **G-BEN-PRESENTATION**.                                                                           |
| B2-13 | Do not fabricate one repeat count for compounds.                                   | stale                                   | Existing compound repeat-count path fails closed; regression fixture remains.                                                                                                                        |
| B2-14 | Preserve all source components, overlaps, gaps, duplicate motifs, and orientation. | stale                                   | Existing canonical parser/API do this; frozen HTT/sparse/extreme identities guard it.                                                                                                                |
| B2-15 | Simplify “Short-read known-locus context.”                                         | new blocker                             | Rename to **Known disease-associated TR locus**, ordinary unboxed section, exact-only.                                                                                                               |
| B2-16 | Remove matched LR component and catalog repeat-unit/motif redundancy.              | new blocker                             | Remove prominent redundant fields while retaining exact matching and provenance internally.                                                                                                          |
| B2-17 | Keep disease, OMIM, inheritance, and repeat-count ranges.                          | new blocker                             | Four-column table; locus reference context only, never LR allele/person classification; **G-CLINICAL-SAFETY**.                                                                                       |
| B2-18 | Keep one useful known-locus link and clarify whether STRipy was intended.          | new / owner blocker                     | Keep known disease-associated TR link. Do not add STRipy/STRchive without clarification; **G-BEN-PRESENTATION**.                                                                                     |
| B2-19 | Keep short-read distributions but isolate loading/failure.                         | stale plus regression                   | Existing lazy, independently failing data flow remains; only its outer presentation changes.                                                                                                         |
| B2-20 | Correct HGSVC/HPRC ancestry names (`afr/nfe` vs `AFR/EUR`).                        | new blocker                             | API vocabulary artifact; do not lowercase/guess `nfe ↔ EUR`; **G-DATA-ANCESTRY**.                                                                                                                    |
| B2-21 | Hide redundant AoU ancestry selector/coloring.                                     | new blocker                             | Only when API proves sole-stratum/global reconciliation; otherwise retain distinction/remainder.                                                                                                     |
| B2-22 | Fix sex/ancestry filter plus same-dimension color leakage.                         | confirmed defect / blocker              | Segments must use active filters and sum to filtered totals; explicit Unknown differs from Unstratified.                                                                                             |
| B2-23 | Derive supported sex options instead of always offering Unknown.                   | new blocker                             | API capabilities own options; never silently reset an unsupported selection.                                                                                                                         |
| B2-24 | Add Change-from-REF versus absolute represented-length toggle to all three views.  | new blocker                             | One synchronized control, canonical delta state, exact sequence/padding reconciliation; delta-only fallback; **G-LENGTH**.                                                                           |
| B2-25 | Handle compounds correctly in absolute length.                                     | new blocker                             | Whole represented source record only; never envelope + delta or component sum. Multiple baselines fail closed.                                                                                       |
| B2-26 | Show longest pure motif segment.                                                   | follow-up                               | Separate versioned scientific product after motif/scope/tie/interrupt rules; never infer from total length, AP, or MC.                                                                               |
| B2-27 | Fix chr16 blue interruption/component coloring.                                    | confirmed defect / blocker              | Neutral compound strip immediately when projection is unavailable. No whole-record motif heuristic may imply component membership.                                                                   |
| B2-28 | Define exact component-local interruption coloring.                                | follow-up                               | Versioned REF↔ALT projection with immutable digests and ambiguity handling; **G-PROJECTION-FUTURE**.                                                                                                 |
| B2-29 | Simplify selected sequence detail.                                                 | new blocker                             | Remove prominent anchor prose/glyph, separate exact-sequence heading, token/DP/RE/method clutter; retain copyable identity, represented length, delta, motifs, aggregates, and technical provenance. |
| B2-30 | Use IGV/reference context.                                                         | follow-up                               | Complementary GRCh38/component context only; IGV cannot establish ALT projection.                                                                                                                    |
| B2-31 | Use a BED file (“bed file that has …”).                                            | owner blocker/follow-up                 | Request is incomplete; no current LR-TR BED contract. Do not invent one.                                                                                                                             |
| B2-32 | Keep every component/sequence reachable at extreme scale.                          | new blocker plus follow-up              | Component table must cover 24/103/180 now. Preserve 600-ALT guard; paged source-identity service is a later product.                                                                                 |
| B2-33 | Keep the full huge canonical ID from harming rows/screen readers/routes.           | new blocker for labels; route follow-up | Bounded visible/accessibility names now; opaque stable route key later, preserving legacy canonical route/export.                                                                                    |
| B2-34 | Update help to distinguish alleles, sequences, people, and plot behavior.          | stale plus new copy                     | Existing distinctions are sound; revise nouns only after uniqueness/filter/length contracts exist.                                                                                                   |
| B2-35 | Ensure plots filter the index rather than selecting/navigating.                    | stale                                   | Existing behavior and URL/focus contracts remain regression requirements.                                                                                                                            |
| B2-36 | Keep AoU aggregate-only and cohorts isolated.                                      | invariant/blocker                       | No sample IDs or person linkage; the chr16 fixture proves identical source ID/ALT index can have different cohort sequences.                                                                         |
| B2-37 | Keep optional/unavailable products local and fail closed.                          | stale/invariant                         | No valid canonical locus may disappear because an optional product is absent, stale, inconsistent, or over bound.                                                                                    |

## Pending owner gates

- **G-SCIENCE-KIND — TR catalog/science owner:** immutable standalone/variation-cluster
  source fields, release/digest, cluster bounds, and HTT reviewed-primary authority.
- **G-BEN-PRESENTATION — Ben/product:** HTT override, visible terminology, Sequence/source
  ALT wording, AC scope, STRipy ambiguity, and anonymous-cluster unavailable copy.
- **G-SEQUENCE-TERM — Ben + science:** byte-unique definition, REF exclusion, cohort/run
  scope, and duplicate source identity display.
- **G-DATA-ANCESTRY — frequency/metadata owner:** full mapping (especially `nfe ↔ EUR`),
  source labels, denominator compatibility, remainder policy, and AoU redundancy proof.
- **G-LENGTH — science/data owner:** shared-padding rule and stored-delta disagreement policy.
- **G-CLINICAL-SAFETY — science/product reviewer:** minimal non-classifying disease copy and
  HTT/ATXN1/RFC1 attribution.
- **G-PROJECTION-FUTURE — science owner:** versioned component-local projection algorithm
  and fixtures. Safe replacement behavior is neutral compound coloring.
- **G-RELEASE — release owner:** replacement paired build, zero-traffic evidence, blocker
  closure, and explicit cutover. Held `00026/00020` remains evidence only.
