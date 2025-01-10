---
id: mitochondrial-regional-constraint
title: 'Mitochondrial gene regional constraint'
---

Regional constraint identifies regions within each gene that are more constrained than the entire gene. Knowing if a variant falls within an interval of regional constraint can help prioritize variants most likely to have a deleterious functional impact. Assessment of regional constraint within the mitochondrial genome (mtDNA) requires a different approach than the nuclear genome, as its distinct features make [nuclear regional constraint](/help/regional-constraint) models unsuitable. Variants in the mtDNA are available for 56,434 genome samples from gnomAD v4.1. For the mitochondrial genome, we provide **regional missense constraint for protein-coding genes** and **regional constraint** for single nucleotide variants in **ribosomal RNA** (rRNA) genes. Our mtDNA regional constraint metrics are detailed below.

The sections below will review:

- [Methods](/help/mitochondrial-regional-constraint#methods)
- [Observed/expected (oe) metric](/help/mitochondrial-regional-constraint#oe)
- [Differences between mitochondrial and nuclear gene constraint metrics](/help/mitochondrial-regional-constraint#differences-from-nuclear)

More details on these methods can be found in the main article and supplement of [Lake et al. Nature 2024](https://www.nature.com/articles/s41586-024-08048-x).

### <a id="methods"></a>Methods

To identify regional missense constraint within protein-coding genes, we calculated the observed / expected (oe) missense ratio for all possible regions ≥ 30 bp within each gene. Regions with an oe ratio significantly lower than the gene’s overall oe ratio were identified using a beta distribution. A greedy algorithm was then applied to prioritize regions with the most significant p-values to produce a list of non-overlapping intervals. The false discovery rate (FDR) of each interval was estimated by applying the same method to 1,000 random permutations of each gene, retaining only regions with FDR <0.1 as high-confidence intervals. Regional constraint in the rRNA genes was evaluated using the same process with minor modifications. We provide the oe ratio of each interval of regional constraint and the 90% confidence interval around these ratios.

#### Genes, transcripts, and variant classes included in the analyses

We provide regional constraint metrics for all protein-coding and ribosomal RNA (rRNA) genes in the mitochondrial genome. Since each human mtDNA gene has only one transcript, distinction between canonical and non-canonical transcripts was not required. For protein-coding genes, we measure regional intolerance to missense variants. For rRNA genes, we assess regional intolerance to all single nucleotide variants. Note regional constraint metrics are not provided for transfer RNA (tRNA) genes due to their small size.

### <a id="oe"></a>Observed/expected (oe) metric

#### Observed values

The observed value is the sum of the maximum observed heteroplasmy level (‘maximum heteroplasmy’) of every possible single nucleotide variant in the gene (or just missense for protein genes). Heteroplasmy refers to the proportion of mtDNA copies that carry the variant. Every possible variant is assigned a maximum heteroplasmy value between 0.0 and 1.0, representing the highest level at which the variant is observed across all individuals in gnomAD. Heteroplasmy is important to account for when detecting selection in mtDNA, as most pathogenic variants have maximum heteroplasmy levels below 1.0 due to selection, reflecting that individuals can carry pathogenic variants but be asymptomatic if heteroplasmy levels are low enough.

#### Expected values

We calculated the expected sum maximum heteroplasmy of single nucleotide variants in each gene using a mitochondrial mutational model that accounts for trinucleotide sequence context. While nuclear constraint models include corrections for coverage and methylation, we do not apply these given the high and even mtDNA coverage in gnomAD and lack of robust data on mtDNA methylation.

### <a id="differences-from-nuclear"></a> Differences between mitochondrial and nuclear regional constraint metrics

The methods for identifying regional constraint differ between the mitochondrial and nuclear genomes due to the unique characteristics of mtDNA. This includes the lack of exons and introns in mtDNA, and using heteroplasmy instead of unique variant counts for calculating observed and expected values. These differences required the development of a specialized method for mtDNA regional constraint analysis. Key differences between mitochondrial and nuclear methods include:

- Observed/Expected Values: Nuclear models assess constraint based on the number of unique variants, whereas mitochondrial models use the sum of maximum heteroplasmy values for every variant.
- Statistical Model: A beta distribution is used to identify regions that are significantly more constrained than the gene, in contrast to the Poisson distribution used for nuclear models.
- Application to RNA Genes: While nuclear regional constraint methods focus on protein-coding genes, the mitochondrial approach extends to RNA genes in the mtDNA.
