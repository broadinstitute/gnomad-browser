---
id: call-rate
title: 'Call rate (AN%)'
---

<!-- DRAFT: wording pending methods review. -->

The proportion of alleles that were successfully called at a site, expressed as a percentage of the alleles that could have been called there. It is the same quantity gnomAD publishes as allele number percent (AN%).

The numerator is the allele number (AN): the number of alleles carrying a high-quality<sup>1</sup> genotype call at that site, summed across all samples in the release. The denominator is the largest allele number the site could have had if every sample had been called. For an autosomal site in a release of 10 samples, 5 high-quality genotypes give:

5 genotypes × 2 alleles per genotype ÷ 20 possible alleles = 25%

The denominator accounts for ploidy. Two alleles are counted per sample on the autosomes and in the pseudoautosomal (PAR) regions of chromosome X; two per XX sample and one per XY sample outside the PAR on chromosome X; one per XY sample on chromosome Y, where XX samples contribute nothing at all.

Call rate is a higher-resolution alternative to the read depth metrics on the same track. Depth is measured on a subset of samples and says how well a site was sequenced; call rate is measured on every sample and says how often a genotype at that site actually survived quality control.

Note that the exome and genome series shown for call rate both come from gnomAD v4.1, whereas the genome series shown for the read depth metrics is still the v3.0.1 release. The two are not drawn from the same set of genomes.

<sup>1</sup> A genotype counts towards the allele number when it meets gnomAD's "adj" criteria: genotype quality (GQ) ≥ 20, depth (DP) ≥ 10, and, for heterozygous calls, an allele balance ≥ 0.2.
