---
id: constraint
title: 'Gene constraint'
---

Genetic constraint is a measure of the amount that a genomic region is under negative selection. Knowing how much a gene is constrained (e.g., intolerant to mutational changes) can help prioritize variants that are more likely to have a deleterious functional impact. In order to measure a gene’s intolerance to variation, we developed a mutational model that predicts the number of variants expected to be seen in the gnomAD dataset for a given transcript based on local sequence context and CpG methylation levels. We then compare those per-transcript expectations to the observed amount of variation, and consider transcripts that are significantly depleted of their expected variation to be constrained against, or intolerant of, such variation. As detailed below, we have developed three gene-level constraint metrics. **We recommend using the `LOEUF` (loss-of-function observed / expected upper bound fraction) score displayed in the constraint table**, though we also display the probability of being loss-of-function intolerant (`pLI`) score and z-score for all genes, when available.

The sections below will review:

- [Methods](/help/constraint#methods)
- [Details on each of the scores](/help/constraint#scores)
  - [LOEUF: loss-of-function observed / expected upper bound fraction](/help/constraint#loeuf)
  - [pLI: probability of being loss-of-function intolerant](/help/constraint#pli)
  - [Z score](/help/constraint#z-score)
- [An explanation of “What is the difference between the LOEUF and pLI score?](/help/constraint#loeuf-vs-pli)”

More details on these methods can be found in the supplement of [Lek _et al._ Nature 2016](https://www.nature.com/articles/nature19057) and [Karczewski _et al._ Nature 2020](https://www.nature.com/articles/s41586-020-2308-7).

### <a id="methods"></a> Methods

#### Transcripts included in the analyses

We used the transcripts of protein-coding genes as defined by GENCODE v39.

We currently flag 599 MANE select transcripts that have (1) no expected variants, (2) far too many synonymous, missense, or pLoF variants as determined by a Z score, or (3) far too few synonymous variants as determined by a Z score. If all outliers are removed, there are 16,863 MANE select transcripts left for analyses.

#### Observed variant count

The observed variant count is the number of unique single nucleotide variants in the transcript with minor allele frequency (MAF) < 0.1% and median depth in the exome samples ≥ 30. Variants with MAFs over 0.1% were not included; the rationale behind this choice is that, for pLoF variants, the total number of false positives far outweighs the number of true common variants.

#### Expected variant count

We calculate the expected number of variants for all bases with median depth ≥ 30 in our exome samples using a mutational model that corrects for local sequence context and CpG methylation levels. Previously, we used this same mutational model, but corrected for depth; more details on the previous approach can be found in section 4.1 of the supplement in [Karczewski _et al._ Nature 2020](https://www.nature.com/articles/s41586-020-2308-7).

#### pLoF Variant types

For pLoF counts, only nonsense, splice donor and acceptor site variants caused by single nucleotide changes and called as high confidence by [LOFTEE](https://gnomad.broadinstitute.org/help/vep#loftee) were counted. This is because the mutation model does not account for insertions and deletions that underlie frameshift variants.

### <a id="scores"></a>Scores

#### <a id="loeuf"></a>Observed / expected (`oe`) and the Loss-of-function Observed / expected upper bound fraction (`LOEUF`) score

We have calculated the ratio of the observed / expected (`oe`) number of loss-of-function variants for all bases of sufficient depth in the MANE Select (v4 on GRCh38) or canonical (ExAC and v2 on GRCh37) and other non-Select/canonical transcript for each gene. The expected counts are based on a mutational model that takes sequence context and methylation into account.

#### Interpretation

Observed/expected (`oe`) is a continuous measure of how tolerant a gene is to a certain class of variation (e.g. loss-of-function). When a gene has a low `oe` value, it is under stronger selection for that class of variation than a gene with a higher value. Because counts depend on gene size and sample size, the precision of the `oe` values varies a lot from one gene to the next. Therefore in addition to the `oe` value, we also display the 90% confidence interval (CI) for each of the `oe` values.

When evaluating how constrained a gene is, it is essential to take the 90% CI into consideration. In particular, we suggest using the upper bound of that CI, which is also known as the `LOEUF` (“loss-of-function observed/expected upper bound fraction”) score. `LOEUF` is therefore a conservative estimate of the observed/expected ratio, based on the upper bound of a Poisson-derived confidence interval around the ratio. Low `LOEUF` scores indicate strong selection against predicted loss-of-function (pLoF) variation in a given gene, while high `LOEUF` scores suggest a relatively higher tolerance to inactivation.

One advantage of `oe` and `LOEUF` compared to `pLI` are that they are more direct measures of biological significance, and can be easily used as continuous values. For example, a doubling of `oe` from 0.2 to 0.4 conveys that 20% vs 40% of the expected number of variants has been observed in gnomAD. By contrast, a doubling of the `pLI` score (e.g., 0.45 to 0.9) is less immediately interpretable as `pLI` is fairly dichotomous with nearly all genes having scores < 0.1 or > 0.9. Intermediate `pLI` scores (0.1-0.9) are typically an indication that the gene was too small to be confidently categorized.

Although `oe` and `LOEUF` are continuous values, we understand that it can be useful to use a threshold for certain applications. In particular, for the interpretation of Mendelian disease cases, we suggest using a `LOEUF` score < 0.6 as a threshold if needed. Again, ideally `oe` and `LOEUF` should be used as a continuous values rather than a cutoff.

As mentioned above, `oe` and `LOEUF` are dependent on sample size and we note that these values are slightly higher in v4 compared to v2 for all genes. The major impact of this is that any `LOEUF` thresholds used on v2 will not give an equivalent number of genes when applied to v4. This rise in `oe` is anticipated, particularly as we are now able to sample variants with a much lower population allele frequency than before (e.g., 1 in ~125,000 individuals vs 1 in ~730,000 individuals).

#### <a id="pli"></a>Probability of being loss-of-function intolerant (`pLI`)

`pLI` is based on the underlying premise that we can assign genes to three natural categories with respect to sensitivity to loss-of-function variation: null (tolerant; where loss-of-function variation – heterozygous or homozygous - is completely tolerated by natural selection), recessive (where heterozygous variants are tolerated but homozygous ones are not), and haploinsufficient (where heterozygous loss-of-function variants are not tolerated). In order to create these metrics, we assumed that tolerant genes would have the expected amount of loss-of-function variation and then took the empirical observed/expected rate of loss-of-function variation for recessive disease genes (0.706) and severe haploinsufficient genes (0.207) to represent the average outcome of the homozygous and heterozygous intolerant scenarios, respectively. We then used an expectation-maximization (EM) algorithm to assign each transcript a probability of belonging to each category. `pLI` is the probability of belonging to the haploinsufficient class of genes. We have updated the empirical observed/expected rate of loss-of-function variants from previous releases. More details on the original formulation of pLI can be found in section 4.4 of the supplement in [Lek _et al._ Nature 2016](https://www.nature.com/articles/nature19057).

#### <a id="z-score"></a>Synonymous and missense (Z scores)

For synonymous and missense variation, we created a signed Z score of the deviation of observed counts from the expected number. Positive Z scores indicate increased constraint (intolerance to variation) and therefore that the transcript had fewer variants than expected. Negative Z scores were given to transcripts that had more variants than expected.

To generate Z scores, we used a previously described, but slightly modified, sequence-context based mutational model to predict the number of expected rare (minor allele frequency < 0.1%) variants per transcript at well covered sites. We then calculated the chi-squared value for the deviation of observation from expectation for each mutational class (synonymous and missense). The square root of these values was taken and multiplied by -1 if the number of observed variants was greater than expectation or 1 if observed counts were smaller than expected. The synonymous Z scores were then corrected by dividing each score by the standard deviation of all synonymous Z scores in between -8 and 8 (-5 and 5 for gnomAD v2). For the missense Z scores, we took all Z scores between -8 and 0 (-5 and 0 for gnomAD v2) and created a mirrored distribution. The missense Z scores were then corrected by dividing each score by the standard deviation of these mirror distributions.

For more information, see [Samocha _et al._ Nature Genetics 2014](https://www.nature.com/articles/ng.3050) and [Lek _et al._ Nature 2016](https://www.nature.com/articles/nature19057).

#### <a id="loeuf-vs-pli"></a>What is the difference between the oe/LOEUF and pLI score?

It is very important to note that `oe` (and thereby `LOEUF`) score is very different from that of `pLI`; in particular low `oe` values are indicative of strong intolerance, whereas high `pLI` scores indicate intolerance. In addition, while `pLI` incorporated the uncertainty around low counts (i.e a gene with low expected count, due to small size or low coverage, could not have a high `pLI`), `oe` does not. Therefore, the `oe` metric comes with a 90% CI. It is important to consider the confidence interval when using `oe`. The change from `pLI` to `oe` was motivated mainly by its easier interpretation and its continuity across the spectrum of selection. As an example, let’s take a gene with a `pLI` of 0.8: this means that this gene cannot be categorized as a highly likely haploinsufficient gene based on our data. However, it is unclear whether this value was obtained because of small sample or gene size or because there were too many loss-of-function (LoF) variants observed in the gene. In addition, if the cause was the latter, `pLI` doesn’t tell much about the overall selection against loss-of-function in this gene. On the other hand, a gene with an LoF `oe` of 0.4 can clearly be interpreted as a gene where only 40% of the expected loss-of-function variants were observed and therefore is likely under selection against LoF variants. In addition, the 90% CI allows us to clearly distinguish cases where there is a lot of uncertainty about the constraint for that gene due to sample size. Since `pLI` > 0.9 is widely used in research and clinical interpretation of Mendelian cases, we suggest using the upper bound of the `oe` confidence interval (which we term the "loss-of-function observed/expected upper bound fraction" or "`LOEUF`") < 0.6 if a hard threshold is needed.
