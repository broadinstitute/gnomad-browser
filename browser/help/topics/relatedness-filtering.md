---
id: relatedness-filtering
title: 'Relatedness filtering'
---

Relatedness filtering for the v4 release was done using [cuKING](https://github.com/populationgenomics/cuKING/tree/1d29d72a184da33cf2500f8b537ae56ce66a7e96). Relatedness was computed amongst all samples that passed our hard filters (both exomes and genomes in gnomAD v4) together. We used 1.1 million autosomal SNVs with an allele frequency > 0.01% and a call rate of > 95% in the combined gnomAD v3.1.2 and CCDG genome data, a call rate > 99% in both CCDG and UKBB exome data and LD-pruned with a cutoff of r<sup>2</sup> = 0.1 for inferring relatedness.

After running `cuKING`, we used the [`maximal_independent_set` method in Hail](https://hail.is/docs/0.2/methods/misc.html#hail.methods.maximal_independent_set) to get the largest set of samples with no pair of samples related at the 2nd degree or closer. When we had to select a sample amongst multiple possibilities, we used the same scheme to favor a sample over another:

- Genomes had priority over exomes in gnomAD v4.1
- Within genomes
  - PCR free had priority over PCR+
  - In a parent/child pair, the parent was kept
  - Ties broken by the sample with highest mean coverage
- Within exomes
  - In a parent/child pair, the parent was kept
  - Ties broken by the sample with the higher mean coverage on chromosome 20
