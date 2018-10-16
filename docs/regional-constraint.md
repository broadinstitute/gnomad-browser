---
index: gnomad_help
title: 'Regional constraint'
---

# Regional constraint

Important: Currently regional constraint is only available / displayed when selecting the ExAC dataset. In addition, it is only displayed for gene that exhibit regional missense constraint.

## Overall interpretation

We searched for regions within transcripts that were intolerant of missense variation within the ExAC dataset. We used the observed and expected missense variation in each transcript in a likelihood ratio test to identify those transcipts that had two or more regions with significantly different levels of missense constraint (as measured by depletion of expected missense variation). Missense constraint values closer to zero indicate increased intolerance against missense variation.

Note that these data currently reflect the regional constraint seen in the ExAC dataset. They will be updated to gnomAD in the near future.

More details can be found in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).

## Transcripts included in the analyses

Similar to the overall constraint analyses, we used the canonical transcripts of protein-coding genes as defined by GENCODE v19. We removed transcripts that lacked a methionine at the start of the coding sequence, a stop codon at the end of coding sequence, or were indivisible by three, which left 19,621 transcripts. Additionally, we excluded:
* 795 transcripts that had zero observed variants when removing exons with a median depth < 1
* 251 transcripts that had either (1) far too many synonymous and missense variants as determined by a Z score (p < 10<sup>-4</sup> and 10<sup>-3</sup>, respectively) or (2) far too few synonymous and missense variants as determined by a Z score (p < 10<sup>-4</sup> and 10<sup>-3</sup>, respectively)
* 310 transcripts with synonymous Z scores that were significantly high or significantly low (p < 10<sup>-3</sup>)

This left 17,915 transcripts for regional constraint analyses.

## Observed missense variants

The observed number of missense variants per exon was determined by extracting all variants from ExAC that met the following criteria:
* Defined as a missense change by the predicted amino acid substitution. Variants that would be considered “initiator_codon_variants” and “stop_lost” by annotation programs such as Variant Effect Predictor (VEP) are therefore
included in the total.
* Caused by a single nucleotide change.
* Had an adjusted allele count ≤ 123, corresponding to a minor allele frequency (MAF) < 0.1% in ExAC. The adjusted allele count only includes individuals with a depth (DP) ≥ 10 and a genotype quality (GQ) ≥ 20.
* Had a VQSLOD ≥ -2.632.

Variants in exons with a median depth < 1 were removed from the total counts.

## Expected variant count

We used a depth corrected probability of mutation for each gene to predict the expected variant counts. More details can be found in section 4.1 of the supplement in [Lek et al Nature 2016](https://www.nature.com/articles/nature19057) and [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353). Expected variants in exons with a median depth < 1 were removed from the total counts.

## Identification of missense constrained regions

We used likelihood ratio tests to identify regions within transcripts that were intolerant of missense variation. Briefly, we searched for significant breaks between amino acids that would split the transcript into two or more regions with varying levels of missense constraint. We used a likelihood ratio test to determine if spliting a transcript into multiple regions was significantly better at modeling the gene's observed variation than the null model (assuming no regional variability in missense constraint). For these analyses, we assumed that observed counts should follow a Poisson distribution around the expected number. More details of this analysis are included in [Samocha et al bioRxiv 2017](https://www.biorxiv.org/content/early/2017/06/12/148353).
