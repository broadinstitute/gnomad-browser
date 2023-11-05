---
question: 'How is sex determined for gnomAD samples?'
---

We used normalized coverage across the X and Y chromosomes to assign sex for each gnomAD sample.The normalized coverage was computed as the mean coverage on sex chromosomes / mean coverage on chromosome 20. The metrics and thresholds used for sex assignment were as follows:

### gnomAD v4:

#### Exomes

Due to the heterogeneity of the v4 exome data, we calculated sex cutoffs for each exome capture platform separately. You can access the sex inference files on our [downloads page](/downloads#v4-resources).

- Normalized X coverage was calculated using depth of only variant sites in non-pseudoautosomal regions using Hail's impute_sex_chromosome_ploidy function
- Normalized Y coverage was calculated using depth of only reference sites in non-pseudoautosomal regions using Hail's impute_sex_chromosome_ploidy function
- We fit Gaussian mixture models per exome platform for relative X and Y chromosome ploidy
- Samples assigned to the cluster with lower mean chrX relative ploidy are assigned a chrX ploidy of “X” and samples in the higher mean cluster are assigned “XX”
- Samples assigned to the cluster with lower mean chrY relative ploidy are assigned a chrY ploidy of “” and samples in the higher mean cluster are assigned “Y”
- The two karyotypes are combined to give the following options for sex karyotype: X, XX, XY, XXY
- We then computed the mean and standard deviations of chrX and chrY ploidies across samples assigned to XX and XY ploidies to determine cutoffs for sex aneuploidies
- Finally, we computed the fraction of homozygous alternate genotypes on chrX to inform the adjustment of individuals inferred to have X0 karyotypes

#### Genomes

- XY: normalized X coverage < 1.29 & normalized Y coverage > 0.1 & normalized Y coverage < 1.16
- XX: normalized X coverage > 1.45 & normalized X coverage < 2.4 & normalized Y coverage < 0.1
- Normalized X and Y coverage were calculated using depth at both variant and reference sites in non-pseudoautosomal regions
- We used an F-stat cutoff of 0.5 to separate samples with likely XX and XY into two distinct groups. The final X and Y ploidy cutoffs were determined from the means and standard deviations of the ploidy distributions per group.

<br/><br/>

<details>

<summary>Expand to see details for past versions</summary>

Please note that as of v3.1, we have changed the labels we use to classify individuals by chromosomal sex from "male" and "female" to "XY" and "XX", respectively. While we have always used the terms "male" and "female" to refer to an individual's chromosomal sex and not to gender, we recognize that this terminology is overloaded and could cause confusion to users. We also note that the terms "male" and "female," when referring to chromosomal sex, can be applied to individuals with sex chromosomal aneuploidies, such as 47,XYY or 45,X. Since we remove samples with sex chromosomal aneuploidies from gnomAD during the QC process, we felt the most straightforward sex classification labels were "XX" and "XY". These changes are now reflected in both the v3.1 download files and in the browser.

We used a combination of X-chromosome homozygosity (F-stat, [impute_sex function in Hail](https://hail.is/docs/0.2/methods/genetics.html?highlight=impute_sex#hail.methods.impute_sex) ) and X and Y chromosomes normalized coverage to assign sex for each gnomAD sample. Note that we used different combinations of metrics (mostly due to their availability) for the different gnomAD datasets (see below for details). The F-stat was computed for each sample using high-confidence QC SNVs (bi-allelic SNVs, LD-pruned to r<sup>2</sup> < 0.1, with allele frequency > 0.1% and call rate > 99%) on non-pseudoautosomal regions (non-PAR) of the X chromosome. The normalized coverage was computed as the mean coverage on sex chromosomes / mean coverage on chromosome 20. The exact metrics and threshold used for sex assignment were as follows:

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

  </details>
