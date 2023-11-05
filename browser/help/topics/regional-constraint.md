---
id: regional-constraint
title: 'Regional constraint'
---

Important: The regional missense constraint track is currently only available / displayed when selecting the gnomAD v2.1.1 dataset. In addition, there are three distinct views:

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
