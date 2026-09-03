---
id: allele-number
title: Allele number (AN)
---

The number of alleles with a realized genotype call<sup>1</sup> at a site. Each person contributes one count per called allele, so a diploid call adds 2 and a haploid call adds 1. Note that allele number (AN) is a count and not a rate.

Because this is an absolute count, it scales with the number of samples and is not comparable between data types of different size. To compare callability across sites or between exomes and genomes, use [Callrate (Allele Number %)](/help/callrate), which divides by the maximum allele number attainable at the site.

<sup>1</sup>A call is counted when it meets gnomAD's "adj" (high-quality) criteria: genotype quality (GQ) ≥ 20, depth (DP) ≥ 10, and, for heterozygous calls, an allele balance ≥ 0.2. In v5, homozygous reference calls from All of Us are published only at GQ ≥ 20 and carry no DP, so all homozygous reference calls are counted; the full adj criteria apply to calls at variant sites.
