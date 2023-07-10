---
id: regional-constraint
title: 'Regional constraint'
---

**Important**: The regional missense constraint track is currently only available / displayed when selecting the gnomAD v2 dataset. In addition, there are three distinct views:
- Regional missense constraint (RMC) information for genes that exhibit evidence of regional differences in missense constraint
- Transcript-wide missense constraint information for genes that were searched for but did not exhibit any evidence of regional differences in missense constraint
- Text for [outlier genes](https://gnomad.broadinstitute.org/help/why-are-constraint-metrics-missing-for-this-gene-or-annotated-with-a-note) not searched for regional differences in missense constraint

### Overall interpretation

We searched for regions within transcripts that were intolerant of missense variation within the gnomAD v2.1.1 dataset. We used the observed and expected missense variation in each transcript in a likelihood ratio test to identify those transcripts that had two or more regions with significantly different levels of missense constraint (as measured by depletion of expected missense variation). Missense constraint values closer to zero indicate increased intolerance against missense variation.

Note that these data currently reflect the regional constraint seen in gnomAD v2.1.1, which was mapped to GRCh37. We will update to GRCh38 in the near future.

More details can be found in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).

### Transcripts included in the analyses

We used 18,629 canonical transcripts of protein-coding genes as defined by GENCODE v19 for our analysis. For more information about the transcripts included, see our gene constraint help [page](https://gnomad.broadinstitute.org/help/constraint). 

### Observed missense variants

The observed number of missense variants per base was determined by extracting all variants from gnomAD v2.1.1 that met the following criteria:
* Defined as a missense change ("missense_variant") by the Variant Effect Predictor (VEP)
* Had an allele count > 0
* Had an allele frequency of < 0.001 across all genetic ancestry groups in the gnomAD v2.1.1 exomes
* Passed all variant QC filters
* Had a median coverage > 0 in the gnomAD v2.1.1 exomes


### Expected variant count

We used a depth corrected probability of mutation for each gene to predict the expected variant counts. More details can be found in the supplement of [Karczewski et al Nature 2020](https://www.nature.com/articles/s41586-020-2308-7).

### Identification of missense constrained regions

We used likelihood ratio tests to identify regions within transcripts that were intolerant of missense variation. Briefly, we searched for significant breaks between base pairs that would split the transcript into two or more regions with varying levels of missense constraint. We used a likelihood ratio test to determine if splitting a transcript into multiple regions was significantly better at modeling the gene's observed variation than the null model (assuming no regional variability in missense constraint). For these analyses, we assumed that observed counts should follow a Poisson distribution around the expected number. More details of this analysis are included in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).
