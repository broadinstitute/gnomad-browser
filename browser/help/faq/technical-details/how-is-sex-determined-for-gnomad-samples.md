---
question: 'How is sex determined for gnomAD samples?'
---

Please note that as of v3.1, we have changed the labels we use to classify individuals by chromosomal sex from "male" and "female" to "XY" and "XX", respectively. While we have always used the terms "male" and "female" to refer to an individual's chromosomal sex and not to gender, we recognize that this terminology is overloaded and could cause confusion to users. We also note that the terms "male" and "female," when referring to chromosomal sex, can be applied to individuals with sex chromosomal aneuploidies, such as 47,XYY or 45,X. Since we remove samples with sex chromosomal aneuploidies from gnomAD during the QC process, we felt the most straightforward sex classification labels were "XX" and "XY". These changes are now reflected in both the v3.1 download files and in the browser.

We used a combination of X-chromosome homozygosity (F-stat, [impute_sex function in Hail](https://hail.is/docs/0.2/methods/genetics.html?highlight=impute_sex#hail.methods.impute_sex) ) and X and Y chromosomes normalized coverage to assign sex for each gnomAD sample. Note that we used different combination of metrics (mostly due to their availability) for the different gnomAD datasets (see below for details). The F-stat was computed for each sample using high-confidence QC SNVs (bi-allelic SNVs, LD-pruned to r<sup>2</sup> < 0.1, with allele frequency > 0.1% and call rate > 99%) on non-pseudoautosomal regions (non-PAR) of the X chromosome. The normalized coverage was computed as the mean coverage on sex chromosomes / mean coverage on chromosome 20. The exact metrics and threshold used for sex assignment were as follows:

- Genomes (gnomAD v3.1):

  - XY: normalized X coverage < 1.29 & normalized Y coverage > 0.1 & normalized Y coverage < 1.16
  - XX: normalized X coverage > 1.45 & normalized X coverage < 2.4 & normalized Y coverage < 0.1
  - Instead of using F-stat as a hardfilter, a rough cutoff of 0.5 was used to separate the XX and XY. The final X and Y ploidy cutoffs are determined from the means and standard deviations of those XX and XY distributions.

- Genomes (gnomAD v3.0):

  - Males: chromosome X (non-PAR) F-stat > 0.2 & 0.5 < normalized X coverage > 1.4 & 1.2 < normalized Y coverage > 0.15
  - Females: chromosome X (non-PAR) F-stat < -0.2 & 1.4 < normalized X coverage > 2.25 & normalized X coverage < 0.1

- Exomes (gnomAD v2):

  - Males: chromosome X (non-PAR) F-stat > 0.6 & normalized Y chromosome coverage >= 0.1
  - Females: chromosome X (non-PAR) F-stat < 0.5 & normalized Y chromosome coverage < 0.1

- Genomes (gnomAD v2):

  - Males: chromosome X (non-PAR) F-stat > 0.8
  - Females: chromosome X (non-PAR) F-stat < 0.5
