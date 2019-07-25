---
index: gnomad_help
title: 'Variant QC'
---

# Variant QC
For variants QC, we used all sites present in the 141,456 release samples as well as sites present in family members forming trios (717 trios in genomes, 6,029 trios in exomes) that passed all of the sample QC filters. Including these trios allowed us to look at transmission and Mendelian violations for evaluation purposes. Variant QC was performed on the exomes and genomes separately but using the same pipeline (although different thresholds were used). 

We used a random forests (RF) model using allele-specific annotations as our main tool for variant quality  control. This updated model is described below and performs markedly better than both VQSR and our previous RF model (used on gnomAD v2.0.2) on all the evaluation metrics we used. In addition to our RF filter, we also excluded all sites failing the following two hard filters:
* `InbreedingCoeff`: Excess heterozygotes defined by an inbreeding coefficient < -0.3
* `AC0`: No sample had a high quality genotype (depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes)

Finally, for this release we have moved the information about sites falling in low complexity (‘lcr’), decoy (`decoy`)  and segmental duplication (`segdup`) regions to the `INFO` field. This means that the information is still easily available in the VCF but variants in these regions that pass other filters will have a `PASS` value in the `FILTER` column. In the browser, `lcr`, `decoy` and `segdup` are displayed in the `Flags` column.

### Random forests model

We used a random forests (RF) model developed with Hail and pyspark. Our model was applied to exomes and genomes separately. Our model considered each allele separately and emitted a prediction for each allele. We used a combination of features output by the GATK Haplotype Caller and features that we computed from the genotypes directly.  In particular, we  introduced the following two allele-specific features:
1. `qd`: This metric is inspired by the GATK quality / depth (`QD`) metric, but is computed per-allele, only on the carriers of that allele. So for each allele, `qd` is computed as the sum of the non-reference genotype likelihoods divided by the sum of the depth in all carrier of that allele.
2. `pab_max`: This metric is the highest p-value for sampling the observed allele balance under a binomial model. Because we take the highest value, we effectively consider the "best looking" sample in terms of allele-balance.

#### Random forests features

<table>
  <tr>
    <td>
Feature</td>
    <td>Description</td>
    <td>Allele / site specific</td>
    <td>Genomes feature importance</td>
    <td>Exomes feature importance</td>
  </tr>
  <tr>
    <td>Allele type</td>
    <td>SNV, Indel, complex</td>
    <td>Allele</td>
    <td>0.0012</td>
    <td>0.00027</td>
  </tr>
  <tr>
    <td>qd</td>
    <td>Allelic quality / depth</td>
    <td>Allele</td>
    <td>0.470</td>
    <td>0.62</td>
  </tr>
  <tr>
    <td>pax_max</td>
    <td>Max. p-value of binomial test for allele balance</td>
    <td>Allele</td>
    <td>0.106</td>
    <td>0.065</td>
  </tr>
  <tr>
    <td>variant_type</td>
    <td>SNV, multi-allelic SNV, indel, multi-allelic indel, mixed</td>
    <td>Site</td>
    <td>0.0065</td>
    <td>0.0054</td>
  </tr>
  <tr>
    <td>was_mixed</td>
    <td>Whether there were both SNVs and indels at the site</td>
    <td>Site</td>
    <td>0.0056</td>
    <td>0.00048</td>
  </tr>
  <tr>
    <td>n_alt_alleles</td>
    <td>Number of non-reference alleles</td>
    <td>Site</td>
    <td>0.0060</td>
    <td>0.0061</td>
  </tr>
  <tr>
    <td>has_star</td>
    <td>Whether there is a spanning deletion that overlaps the site</td>
    <td>Site</td>
    <td>0.0115</td>
    <td>0.0023</td>
  </tr>
  <tr>
    <td>InbreedingCoeff</td>
    <td>Inbreeding Coefficient</td>
    <td>Site*</td>
    <td>0.042</td>
    <td>0.123</td>
  </tr>
  <tr>
    <td>MQRankSum
</td>
    <td>Z-score from Wilcoxon rank sum test of Alt vs. Ref read mapping qualities
</td>
    <td>Site*</td>
    <td>0.031</td>
    <td>0.019</td>
  </tr>
  <tr>
    <td>ReadPosRankSum</td>
    <td>Z-score from Wilcoxon rank sum test of Alt vs. Ref read position bias</td>
    <td>Site*</td>
    <td>0.060</td>
    <td>0.061</td>
  </tr>
  <tr>
    <td>SOR</td>
    <td>Symmetric Odds Ratio of 2×2 contingency table to detect strand bias</td>
    <td>Site*</td>
    <td>0.266</td>
    <td>0.10</td>
  </tr>
</table>

*: These features should ideally be computed for each allele separately but they were generated for each site in our callset and it was impractical to re-generate them for each allele.

Note that since random forests doesn’t tolerate missing data, we have naively imputed all missing values using the median value for that feature. 

#### Random forest training examples

Our strategy for selecting training sites was the same as for gnomAD v2.0.2; however, because we had an increase in our number of trios, we had more positive transmitted singletons alleles than previously. The table below summarizes our training examples. 

<table>
  <tr>
    <td>Name</td>
    <td>Description</td>
    <td>Class</td>
    <td>Number of alleles in genomes</td>
    <td>Number of alleles in exomes</td>
  </tr>
  <tr>
    <td>omni</td>
    <td>SNVs present on the Omni 2.5 genotyping array and found in 1000 genomes (available in the GATK bundle)</td>
    <td>TP</td>
    <td>2.3Mln</td>
    <td>95k</td>
  </tr>
  <tr>
    <td>mills</td>
    <td>Indels present in the Mills and Devine data (available in the GATK bundle)</td>
    <td>TP</td>
    <td>1.3Mln</td>
    <td>12k</td>
  </tr>
  <tr>
    <td>1000 Genomes high-quality sites</td>
    <td>Sites discovered in 1000 Genomes with high confidence (available in the GATK bundle)</td>
    <td>TP</td>
    <td>29Mln</td>
    <td>560k</td>
  </tr>
  <tr>
    <td>transmitted_singletons</td>
    <td>variants found in two and only two individuals, which were a parent-offspring pair</td>
    <td>TP</td>
    <td>116k</td>
    <td>106k</td>
  </tr>
  <tr>
    <td>fail_hard_filters</td>
    <td>variants failing traditional GATK hard filters: QD < 2 || FS > 60 || MQ < 30</td>
    <td>FP</td>
    <td>31Mln</td>
    <td>789k</td>
  </tr>
</table>


Note that for training the model, we used a balanced training set by randomly downsampling the class that had more training examples to match the number of training examples in the other class.

#### Random forests filtering thresholds

In order to set a threshold for the PASS / RF filter in the release, we have used a slightly different set of evaluation metrics. The reason being that some of the classical metrics such as transition/transversion ratio and insertion:deletion ratio are very difficult to interpret in large callsets. On the other hand, we have additional data and resources that can serve as useful proxy for callset quality, such as large number of trios, validated variants (e.g. validated _de novo_ mutations in our exomes) or public databases such as ClinVar. We used the following metrics to determine a cutoff on the random forests model output, to build what we believed to be a high quality set of variants:
* Precision / recall against two well characterized samples:
    * NA12878 from [genome in a bottle](https://github.com/genome-in-a-bottle/giab_latest_release)
    * CHM1_CHM13: A mixture of DNA (est. 50.7% / 49.3%) from two haploid CHM cell lines, deep sequenced with PacBio and _de novo_ assembled, available [here](https://github.com/lh3/CHM-eval). Note that indels of size 1 were removed because of PacBio-specific problems.
* Number of singleton Mendelian violations in our evaluation trios (N=1 amongst all samples and is found in a child)
* Singleton transmission ratio in trios
* Sensitivity to validated _de novo_ mutations (exomes only)
* Sensitivity to singleton ClinVar variants

For exomes, our filtration process removes 12.2% of SNVs (RF probability >= 0.1) and  24.7% of indels (RF probability >= 0.2). For genomes, we filtered 10.7% of SNVs (RF probability >= 0.4) and 22.3% of indels (RF probability >= 0.4).

