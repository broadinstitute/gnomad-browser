---
question: 'Why is a particular variant found in some versions of ExAC/gnomAD but not others?'
---

Likely because of differences between the projects in sample inclusion and variant quality control.

Sample QC: Not all data from previous call sets is included in each gnomAD release. Most of the samples from prior releases are included during the initial joint calling; however, we make changes to our sample QC process in each release, which always results in the removal of some samples that previously passed. For instance, approximately 10% of the samples in ExAC are missing from gnomAD v2, so we expect some variants in ExAC, particularly those that were found at low frequencies, to be absent in gnomAD v2.

Variant QC: Some variants present in previous releases may now be filtered because we used new filtering strategies. In particular, starting with gnomAD, we filter each allele separately whereas variant QC was done at the site-level (chromosome, position) in ExAC. We also continuously work on improving our filtering strategy: for instance, we used a combination of a random forest classifier and hard filters (only high-confidence genotypes, inbreeding coefficient >= 0.3) for gnomAD v2 rather than the standard GATK site-level Variant Quality Score Recalibration (VQSR) used for ExAC.
