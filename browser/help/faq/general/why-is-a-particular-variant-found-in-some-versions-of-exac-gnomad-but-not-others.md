---
question: 'Why is a particular variant found in some versions of gnomAD but not others?'
---

Likely because of differences between the projects in sample inclusion and variant quality control.

**Sample QC**: Not all data from previous call sets are included in each gnomAD release. Most of the samples from prior releases are included during the initial joint calling; however, we make changes to our sample QC process in each release, which always results in the removal of some samples that previously passed QC. For instance, some of the samples in gnomAD v2 were not included in v4, due to data quality issues so we expect some variants in v2 particularly those that were found at low frequencies, to be absent in gnomAD v4.

**Variant QC**: Some variants present in previous releases may now be filtered because we used new filtering strategies: we also continuously work on improving our filtering strategy, which could result in a variant being included in one version but not another. We update our variant QC processes with each release. This means that a variant that was in a previous release could be filtered in our current release. For example, in gnomAD v4, we used a combination of hard filters and an allele-specific version of GATK's Variant Quality Score Recalibration (VQSR) to filter variants rather than the random forest classifier used in v2.
