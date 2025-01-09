---
id: mitochondrial-constraint
title: 'Mitochondrial gene constraint'
---

Variants in the mitochondrial genome (mtDNA) are available for 56,434 genome samples from gnomAD v4.1. Assessment of [constraint](/help/constraint) within the mtDNA requires a different approach than the nuclear genome, as its unique features make nuclear constraint models unsuitable. To measure intolerance to variation within the mtDNA, we developed a mitochondrial mutational model that predicts the level of variation expected to be seen in the gnomAD dataset for a given gene based on local sequence context. We then compare the expected values for each gene to the observed amount of variation and consider genes that are significantly depleted of their expected variation to be constrained, or intolerant of this variation. Our gene-level constraint metrics for the mtDNA are detailed below.

The sections below will review:

- [Methods](/help/mitochondrial-constraint#methods)
- [Observed/expected (oe) metric](/help/mitochondrial-constraint#oe)
- [Differences between mitochondrial and nuclear gene constraint metrics](/help/mitochondrial-constraint#differences-from-nuclear)

More details on these methods can be found in the main article and supplement of [Lake et al. Nature 2024](https://www.nature.com/articles/s41586-024-08048-x).

### <a id="methods"></a>Methods

#### Genes, transcripts, and variant classes included in the analyses

We provide gene constraint metrics for all protein-coding, ribosomal RNA (rRNA), and transfer RNA (tRNA) genes in the mitochondrial genome. Since each human mtDNA gene has only one transcript, distinction between canonical and non-canonical transcripts was not required. In the protein-coding genes, metrics are provided for (i) synonymous, (ii) missense and (iii) stop gain variants caused by single nucleotide changes. Note that splice site variants are not applicable to genes in mtDNA. In the rRNA and tRNA genes, metrics are provided for all single nucleotide variants.

#### Observed value

The observed value is the sum of the maximum observed heteroplasmy level (‘maximum heteroplasmy’) of every possible single nucleotide variant in the gene. Heteroplasmy refers to the proportion of mtDNA copies that carry the variant. Every possible variant is assigned a maximum heteroplasmy value between 0.0 and 1.0, representing the highest level at which the variant is observed across all individuals in gnomAD. Heteroplasmy is important to account for when detecting selection in mtDNA, as most pathogenic variants have maximum heteroplasmy levels below 1.0 due to selection, reflecting that individuals can carry pathogenic variants but be asymptomatic if heteroplasmy levels are low enough.

#### Expected value

We calculated the expected sum maximum heteroplasmy of single nucleotide variants in each gene using a mitochondrial mutational model that accounts for trinucleotide sequence context. While nuclear constraint models include corrections for coverage and methylation, we do not apply these given the high and even mtDNA coverage in gnomAD and lack of robust data on mtDNA methylation.

### <a id="oe"></a>Observed / expected (oe) metric

We calculated the ratio of observed to expected (oe) sum maximum heteroplasmy of variants in each gene in the mitochondrial genome and the 90% confidence interval (CI) around these ratios. These values provide an inference on the strength of selection against variation in each gene. Observed/expected (oe) ratios are a continuous measure of how tolerant a gene is to a certain class of variation (e.g. missense). Genes with lower oe values are under stronger selection pressure, while higher oe values indicate greater tolerance.

We calculated the 90% CI around each oe ratio using a beta distribution, adapting methods previously used for nuclear genome constraint. The CI captures uncertainty around the ratio estimate, which can vary depending on sample size. When evaluating how constrained a gene is, it is important to take the 90% CI into consideration. We suggest using the upper bound of this confidence interval, termed the OEUF (observed to expected upper bound fraction), which provides a conservative measure of constraint. A lower OEUF indicates stronger selection, while a higher value suggests greater tolerance.

### <a id="differences-from-nuclear"></a> Differences between mitochondrial and nuclear gene constraint metrics

The gene constraint metrics for the mitochondrial and nuclear genome differ due to the unique characteristics of the mtDNA. This includes its smaller size, lack of introns, high copy number, presence of heteroplasmy, distinct mutational mechanisms, and higher rate of mutation. These unique features precluded the application of nuclear constraint models to the mtDNA, necessitating a mitochondrial genome constraint model. Key differences between the mitochondrial and nuclear constraint models include:

- Mutational Model: A mitochondrial mutational model was developed and applied, as nuclear mutational models could not be used due to distinct mutational mechanisms and signatures between the genomes.
- Observed/Expected Calculation: Nuclear constraint models assess the number of unique variants, while mitochondrial constraint models evaluate the sum of maximum heteroplasmy for variants.
- Confidence Interval: A beta distribution, rather than a Poisson distribution, is used to calculate confidence intervals for the observed/expected ratios based on maximum heteroplasmy values.
