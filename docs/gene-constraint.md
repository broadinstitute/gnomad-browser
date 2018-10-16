---
index: gnomad_help
title: 'Gene constraint'
---

#  Gene constraint

The gene constraint table was generated differently for gnomAD 2.1 and ExAC. Therefore, the metric displayed in the table will change depending on the dataset selected. Below are expanations relative to the constraint numbers shown in the gnomAD and ExAC datasets.

## gnomAD

The constraint score shown in gnomAD is the ratio of the observed / expected (`oe`) number of loss-of-function variants in that gene. The expected counts are based on a mutational model that takes sequence context, coverage and methylation into account. 

### Interpretation
Observed/expected (`oe`) is a continuous measure of how tolerant a gene is to a certain class of variation (e.g. loss-of-function). When a gene has a low `oe` value, it is under stronger selection for that class of variation than a gene with a higher value. Because counts depend on gene size and sample size, the precision of the `oe` values varies a lot from one gene to the next. Therefore in addition to the `oe` value, we also display the 95% confidence interval (CI) for each of the `oe` values. When evaluating how constrained a gene is, it is essential to take the 95% CI into consideration.

Although `oe` is a continuous value,  we understand that it can be useful to use a threshold for certain applications. In particular, for the interpretation of Mendelian diseases cases, we suggest using a threshold of `oe` < 0.35 if needed. Again, ideally `oe` should be used as a continuous value rather than a cutoff and evaluating the `oe` 95% CI is a must.

## ExAC 
### Overall interpretation

We developed metrics to measure a transcript's intolerance to variation by predicting the number of variants expected to be seen in the gnomAD dataset and comparing those expectations to the observed amount of variation. Transcripts that are significantly depleted of their expected variation are considered constrained, or intolerant, of such variation.

More specifically, for synonymous and missense variation, we created a signed Z score of the deviation of observed counts from the expected number. Positive Z scores indicate increased constraint (intolerance to variation) and therefore that the transcript had fewer variants than expected. Negative Z scores were given to transcripts that had more variants than expected.

For protein-truncating variation, we assume that there are three classes of genes with respect to tolerance loss of gene function: null (where loss of both copies of the gene is tolerated), recessive (where loss of a single copy of the gene is tolerated, but not loss of both copies), and haploinsufficient (where loss of a single copy of the gene is not tolerated). We used the observed and expected variant counts to determine the probability that a given transcript is extremely intolerant of loss-of-function variation (e.g. falls into the third category). The closer pLI is to one, the more intolerant of protein-truncating variants the transcript appears to be. We consider pLI ≥ 0.9 as an extremely intolerant set of transcripts.

More details can be found in the supplement of [Lek et al Nature 2016](https://www.nature.com/articles/nature19057).

### Transcripts included in the analyses

We used the canonical transcripts of protein-coding genes as defined by GENCODE v19. We removed transcripts that lacked a methionine at the start of the coding sequence, a stop codon at the end of coding sequence, or were indivisible by three, which left 19,621 transcripts. Additionally, we excluded 795 transcripts that had zero observed variants when removing exons with a median depth < 1 as well as 251 transcripts that had either (1) far too many synonymous and missense variants as determined by a Z score (p < 10<sup>-4</sup> and 10<sup>-3</sup>, respectively) or (2) far too few synonymous and missense variants as determined by a Z score (p < 10<sup>-4</sup> and 10<sup>-3</sup>, respectively). When all outliers were removed, there were 18,225 transcipts left for analyses.

### Observed variant count

The observed variant count is the number of unique single nucleotide variants in the canonical transcript of each gene with 123 or fewer alternative alleles (minor allele frequency < 0.1%). Variants in exons with a median depth < 1 were removed from the total counts.

### Expected variant count

We used a depth corrected probability of mutation for each gene to predict the expected variant counts. More details can be found in section 4.1 of the supplement in [Lek et al Nature 2016](https://www.nature.com/articles/nature19057). Expected variants in exons with a median depth < 1 were removed from the total counts.

### Synonymous and missense Z scores

Higher (more positive) Z scores indicate that the transcript is more intolerant of variation (more constrained).

To generate Z scores, we used a previously described, but slightly modified, sequence-context based mutational model to predict the number of expected rare (minor allele frequency < 0.1%) variants per transcript. We then calculated the chi-squared value for the deviation of observation from expectation for each mutational class (synonymous and missense). The square root of these values was taken and multiplied by -1 if the number of observed variants was greater than expectation or 1 if observed counts were smaller than expected. The synonymous Z scores were then corrected by dividing each score by the standard deviation of all synonymous Z scores in between -5 and 5. For the missense Z scores, we took all Z scores between -5 and 0 and created a mirrored distribution. The missense Z scores were then corrected by dividing each score by the standard deviation of these mirror distributions.

For more information, see [Samocha et al Nature Genetics 2014](https://www.nature.com/articles/ng.3050) and [Lek et al Nature 2016](https://www.nature.com/articles/nature19057).

### pLI (probability of being loss-of-function intolerant)

pLI scores closer to one indicate more intolerance to protein-truncating variation. For a set of transcripts intolerant of protein-truncating variation, we suggest pLI ≥ 0.9.

pLI is based on the underlying premise that we could assign genes to three natural categories with respect to sensitivity to protein-truncating variation: null (where protein-truncating variation – heterozygous or homozygous - is completely tolerated by natural selection), recessive (where heterozygous variants are tolerated but homozygous ones are not), and haploinsufficient (where heterozygous protein-truncating variants are not tolerated). In order to create this metrics, we assumed that tolerant (null) genes would have the expected amount of protein-truncating variation and then took the empirical observed/expected rate of protein-truncating variation for recessive disease genes (0.463) and severe haploinsufficient genes (0.089) to represent the average outcome of the homozygous and heterozygous intolerant scenarios, respectively. We then used an expectation-maximization (EM) algorithm to assign each transcript a probability of belonging to each category. pLI is the probability of belonging to the haploinsufficient class of genes. More details can be found in section 4.4 of the supplement in [Lek et al Nature 2016](https://www.nature.com/articles/nature19057).
