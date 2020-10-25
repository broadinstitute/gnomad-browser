export default {
  BaseQRankSum: 'Z-score from Wilcoxon rank sum test of alternate vs. reference base qualities.',
  ClippingRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference number of hard clipped bases.',
  DP:
    'Depth of informative coverage for each sample; reads with MQ=255 or with bad mates are filtered.',
  FS: "Phred-scaled p-value of Fisher's exact test for strand bias.",
  InbreedingCoeff:
    'Inbreeding coefficient as estimated from the genotype likelihoods per-sample when compared against the Hardy-Weinberg expectation.',
  MQ: 'Root mean square of the mapping quality of reads across all samples.',
  MQRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.',
  pab_max:
    'Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of AB=0.5.',
  QD: 'Variant call confidence normalized by depth of sample reads supporting a variant.',
  ReadPosRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.',
  // Info field is `rf_tp_probability`
  RF: 'Random forest prediction probability for a site being a true variant.',
  SiteQuality: undefined, // TODO
  SOR: 'Strand bias estimated by the symmetric odds ratio test.',
  VarDP: 'Depth over variant genotypes (does not include depth of reference samples).',
  VQSLOD:
    'Log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.',
}
