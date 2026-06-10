---
id: regional-constraint
title: 'Regional constraint'
---

This track shows regional (sub-genic) missense constraint scores for genes, calculated from the gnomAD v4.1.1 dataset.

The impact of a missense variant depends on both the specific amino acid substitution it causes and its position within the gene. By highlighting regions that are intolerant to missense variation, this track is designed to aid in missense variant interpretation and classification.

### Methods

#### Transcripts included in this analysis

We used the MANE Select (v0.95) or canonical transcripts of protein-coding genes as defined by GENCODE v39. For high quality transcripts, we excluded transcripts that had outlier variant counts: zero expected or too many observed pLoF, missense, or synonymous variants; or too few observed synonymous variants. This totaled 17,841 transcripts, 96% from MANE Select and 4% canonical. We also make MCR and MPC information available for the 1,534 transcripts with outlier counts, but caution that scores may be less accurate in these sequences.

### Coverage

[Coverage](https://gnomad.broadinstitute.org/help/how-was-coverage-calculated) for gnomAD v4.1.1 was calculated using information from [sample genomic VCF (gVCF)](https://gatk.broadinstitute.org/hc/en-us/articles/360035531812-GVCF-Genomic-Variant-Call-Format) data rather than from read data. As a result, coverage information for gnomAD v4.1.1 is not as granular due to the reference block structure within gVCFs. To remedy this, we used [allele number](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1/#allele-numbers-across-all-possible-sites) percent (%AN) to proxy coverage for all analyses to improve our ability to capture constraint in lower-coverage sites. Sites with %AN < 20 (0.68% of all possible missense sites with %AN > 0) were excluded from analysis.

Note that all low coverage (%AN < 90) sub-genic regions are displayed on the gene pages using a gray color to indicate lower confidence in these regions.

#### Observed and expected rare missense variants

The proportion of observed and expected rare missense variants were calculated following the same methods described in calculating [gene-level constraint](https://gnomad.broadinstitute.org/help/constraint).

#### Identification of missense constrained regions

We searched for regions within transcripts that were differentially intolerant of missense variation within the v4.1.1 dataset. We used likelihood ratio tests to identify transcripts that had two or more regions with significantly different levels of missense constraint (as measured by depletion of observed rare missense variation compared to expected). Missense constraint values closer to zero indicate increased intolerance against missense variation.

More details can be found in [Wang _et al._ bioRxiv 2026](https://www.biorxiv.org/content/10.1101/2024.04.11.588920v3), or the open-source [GitHub repository](https://github.com/broadinstitute/regional_missense_constraint/tree/main).

<summary>Expand to see details for past versions</summary>

Important: There are three distinct views for the regional missense constraint track on the gnomAD v2.1.1 dataset:

- Regional constraint information for genes that exhibit evidence of regional missense constraint (RMC)
- Transcript-wide missense information for genes that were searched for but did not exhibit any evidence of RMC
- Text for [outlier genes](https://gnomad.broadinstitute.org/help/why-are-constraint-metrics-missing-for-this-gene-or-annotated-with-a-note) not searched for evidence of RMC

### Methods

We searched for regions within transcripts that were differentially intolerant of missense variation within the v2.1.1 dataset. We used likelihood ratio tests to identify transcripts that had two or more regions with significantly different levels of missense constraint (as measured by depletion of observed rare missense variation compared to expected). Missense constraint values closer to zero indicate increased intolerance against missense variation.

Note that these data currently reflect the regional constraint seen in the gnomAD v2.1.1, which was mapped to GRCh37. We will update to gnomAD v4 (GRCh38) in the near future.

More details can be found in [Samocha _et al._ bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353), or the open-source [GitHub repository](https://github.com/broadinstitute/regional_missense_constraint/tree/main).

### Transcripts included in the analyses

We used the canonical transcripts of protein-coding genes as defined by GENCODE v19. We removed transcripts that lacked a methionine at the start of the coding sequence, a stop codon at the end of coding sequence, or were indivisible by three, which left 19,704 transcripts. Additionally, we excluded 517 transcripts that had zero observed variants when removing exons with a median depth < 1 as well as 556 transcripts that had either (1) far too many synonymous and missense variants as determined by a Z score (p < 10-4 and 10-3, respectively) or (2) far too few synonymous and missense variants as determined by a Z score (p < 10-4 and 10-3, respectively). When all outliers were removed, there were 18,629 transcripts left for analyses.

### Observed missense variants

The observed number of rare missense variants per base in gnomAD v2.1.1 was determined by extracting all variants that met the following criteria:

- Defined as a missense change ("missense_variant") by the Variant Effect Predictor (VEP)
- Had an allele count > 0
- Had an allele frequency of < 0.001 across gnomAD v2.1.1 exomes
- Had a median coverage > 0 across gnomAD v2.1.1 exomes
- Passed all variant QC filters

### Expected variant count

We used a depth corrected probability of mutation for each gene to predict the expected variant counts. More details can be found in the supplement of [Karczewski _et al._ Nature 2020](https://www.nature.com/articles/s41586-020-2308-7).

### Identification of missense constrained regions

We used likelihood ratio tests to identify regions within transcripts that were differentially intolerant of missense variation. Briefly, we searched for breaks between base pairs that would split a transcript into two or more regions with significantly different levels of missense constraint. We used a likelihood ratio test to determine if splitting a transcript into multiple regions was significantly better at modeling the gene's observed pattern of missense variation than the null model that assumes no regional variability in missense constraint. For these analyses, we assumed that observed counts should follow a Poisson distribution around the product of the expected counts and the model-specific observed / expected proportion. More details of this analysis are included in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).

</details>
