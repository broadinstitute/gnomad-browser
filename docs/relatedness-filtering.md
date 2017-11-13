---
index: gnomad_help
title: 'Relatedness filtering'
---

# Relatedness filtering

We used [KING](http://people.virginia.edu/~wc9c/KING/) to infer relatedness amongst individuals that passed the hard filters thresholds.

KING was run on all samples (exomes and genomes) together on a set of well behaved sites selected as follows:

+ Autosomal, bi-allelic SNVs only (excluding CpG sites)
+ Call rate across all samples > 99%
+ Allele frequency > 0.1%
+ LD-pruned to r2 = 0.1

We then selected the largest set of samples such that no two individuals are 2nd degree relative or closer. When we had to select between two samples to be kept in, we used the following criteria to select which one to keep:

Genomes had priority over exomes

Within genomes:

+ PCR free had priority over PCR+
+ In a parent/child pair, the parent was kept
+ Ties broken by the sample with highest mean coverage

Within exomes:

+ Exomes sequenced at the Broad Institute had priority over others
+ More recently sequenced samples were given priority (when information available)
+ In a parent/child pair, the parent was kept
+ Ties broken by the sample with the higher percent bases above 20x
