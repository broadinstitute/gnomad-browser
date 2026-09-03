---
id: callrate
title: Callrate (Allele Number %)
---

The fraction of people with a realized genotype call at a site, shown as a percentage of the total possible allele number.

Callrate is the total number of alleles called across all samples divided by the maximum number of alleles attainable in the dataset. For example, if an autosomal locus has 5 high-quality<sup>1</sup> genotypes in a dataset containing 10 samples, the callrate would be:

5 genotypes \* 2 alleles per person / 20 maximum alleles = 0.50

This metric accounts for ploidy: two alleles are counted per person in autosomal and pseudoautosomal (PAR) regions, two alleles are counted per XX individual in non-pseudoautosomal (non-PAR) regions of chromosome X, one allele is counted per XY individual in non-PAR regions of chromosomes X and Y, and only alleles from XY individuals are counted in non-PAR regions of chromosome Y.

<sup>1</sup>A call is counted when it meets gnomAD's "adj" (high-quality) criteria: genotype quality (GQ) ≥ 20, depth (DP) ≥ 10, and, for heterozygous calls, an allele balance ≥ 0.2. In v5, homozygous reference calls from All of Us are published only at GQ ≥ 20 and carry no DP, so all homozygous reference calls are counted; the full adj criteria apply to calls at variant sites.
