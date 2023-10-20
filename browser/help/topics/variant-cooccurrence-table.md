---
id: variant-cooccurrence-table
title: 'Variant co-occurrence tables'
---

Our variant co-occurrence tables tabulate the number of individuals with two rare variants co-occurring in the same gene by functional consequence and allele frequency. This feature builds off our variant co-occurrence (inferred phasing) work (see ["Variant Co-Occurrence (Phasing) Information in gnomAD"](https://gnomad.broadinstitute.org/news/2021-07-variant-co-occurrence-phasing-information-in-gnomad/)) and displays the count of individuals by predicted variant phase. By providing background frequencies of rare predicted damaging variant co-occurrence, our resource can be used to assess the probability that an observation of this kind, detected in a patient’s sample, may have occurred by chance. For more information, see [our blog post](https://gnomad.broadinstitute.org/news/) on the same topic.

Variant phase (in _trans_, unphased, or in _cis_) was inferred [as previously described](https://gnomad.broadinstitute.org/news/2021-07-variant-co-occurrence-phasing-information-in-gnomad/). All singleton-singleton variant pairs (i.e., variant pairs where both variants in the pair are only seen in one individual in gnomAD) and all variant pairs with indeterminate phase predictions were annotated as unphased.

The displayed consequence is the least severe consequence of both variants in the variant pair (e.g., pLoF + moderate missense also includes all individuals with pLoF + strong missense and pLoF + pLoF). All pLoF variants were deemed “high confidence” by [LOFTEE](https://github.com/konradjk/loftee). Missense category is determined by REVEL score (strong ≥ 0.932, moderate ≥ 0.773, weak ≥ 0.644) in line with [ClinGen recommendation](<https://www.cell.com/ajhg/pdfExtended/S0002-9297(22)00461-X>) for strong, moderate, and supporting strength of evidence of variant pathogenicity, respectively.

Allele frequency threshold is applied as determined by [popmax](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/). For variants without popmax values, the global allele frequency was used. Variant pairs containing a variant with an allele frequency >5% in any bottlenecked population (Ashkenazi Jewish, European Finnish, and "Other" populations) were excluded from the analysis.

In very rare cases an individual will be counted in both the homozygous variant table and in the two-heterozygous-variant table, e.g., if they carry a rare homozygous variant in addition to a rare heterozygous/heterozygous variant pair in the same gene with the same consequence. Users should keep this in mind if adding these numbers together to indicate how many individuals have bi-allelic variants.

These data are from gnomAD v2 exomes only (n=125,748).
