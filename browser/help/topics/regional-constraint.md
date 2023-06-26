---
id: regional-constraint
title: 'Regional constraint'
---

**Important**: The regional missense constraint track is currently only available / displayed when selecting the gnomAD v2 dataset. In addition, there are three distinct views:
- Regional constraint information for genes that exhibit evidence of regional missense constraint (RMC)
- Transcript-wide missense information for genes that were searched for but did not exhibit any evidence of RMC
- Text for [outlier genes](https://gnomad.broadinstitute.org/help/why-are-constraint-metrics-missing-for-this-gene-or-annotated-with-a-note) not searched for evidence of RMC

### Overall interpretation

We searched for regions within transcripts that were intolerant of missense variation within the gnomAD v2.1.1 dataset. We used the observed and expected missense variation in each transcript in a likelihood ratio test to identify those transcripts that had two or more regions with significantly different levels of missense constraint (as measured by depletion of expected missense variation). Missense constraint values closer to zero indicate increased intolerance against missense variation.

Note that these data currently reflect the regional constraint seen in gnomAD v2.1.1, which was mapped to GRCh37. We will update to GRCh38 in the near future.

More details can be found in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).

### Transcripts included in the analyses

We used 18,629 canonical transcripts of protein-coding genes as defined by GENCODE v19 for our analysis. For more information about the transcripts included, see our gene constraint help [page](https://gnomad.broadinstitute.org/help/constraint). 

### Observed missense variants

The observed number of missense variants per exon was determined by extracting all variants from ExAC that met the following criteria:
* Defined as a missense change by the predicted amino acid substitution. Variants that would be considered “initiator_codon_variants” and “stop_lost” by annotation programs such as Variant Effect Predictor (VEP) are therefore
included in the total.
* Caused by a single nucleotide change.
* Had an adjusted allele count ≤ 123, corresponding to a minor allele frequency (MAF) < 0.1% in ExAC. The adjusted allele count only includes individuals with a depth (DP) ≥ 10 and a genotype quality (GQ) ≥ 20.
* Had a VQSLOD ≥ -2.632.

Variants in exons with a median depth < 1 were removed from the total counts.

### Expected variant count

We used a depth corrected probability of mutation for each gene to predict the expected variant counts. More details can be found in section 4.1 of the supplement in [Lek et al Nature 2016](https://www.nature.com/articles/nature19057) and [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353). Expected variants in exons with a median depth < 1 were removed from the total counts.

### Identification of missense constrained regions

We used likelihood ratio tests to identify regions within transcripts that were intolerant of missense variation. Briefly, we searched for significant breaks between amino acids that would split the transcript into two or more regions with varying levels of missense constraint. We used a likelihood ratio test to determine if splitting a transcript into multiple regions was significantly better at modeling the gene's observed variation than the null model (assuming no regional variability in missense constraint). For these analyses, we assumed that observed counts should follow a Poisson distribution around the expected number. More details of this analysis are included in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).
