---
index: gnomad_help
title: 'Relatedness filtering'
---

# Relatedness filtering

Relatedness filtering for this release was done using the [`pc_relate` method in Hail](https://hail.is/docs/devel/methods/genetics.html?highlight=pc_relate#hail.methods.pc_relate) to infer relatedness. Relatedness was computed amongst all samples that passed our hard filters in both exomes and genomes together. The sites we used for inferring relatedness were defined as follows:
- Present in both exomes and genomes
- Autosomal, bi-allelic single nucleotide variants (SNVs) only
- Allele frequency > 0.1%
- Call rate  > 99%
- LD-pruned with a cutoff of r<sup>2</sup> = 0.1

After running `pc_relate`, we used the [`maximal_independent_set` method in Hail](https://hail.is/docs/devel/methods/misc.html?highlight=maximal#hail.methods.maximal_independent_set) to get the largest set of samples with no pair of samples related at the 2nd degree or closer. When we had to select a sample amongst multiple possibilities, we used the same scheme to favor a sample over another:
* Genomes had priority over exomes
* Within genomes
    * PCR free had priority over PCR+
    * In a parent/child pair, the parent was kept
    * Ties broken by the sample with highest mean coverage
* Within exomes
    * Exomes sequenced at the Broad Institute had priority over others
    * More recently sequenced samples were given priority (when information available)
    * In a parent/child pair, the parent was kept
    * Ties broken by the sample with the higher percent bases above 20x
