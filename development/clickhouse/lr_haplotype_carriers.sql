CREATE TABLE IF NOT EXISTS lr_haplotype_carriers (
  chrom LowCardinality(String),
  position UInt32,
  ref String,
  alt String,
  sample_id LowCardinality(String),
  strand UInt8,
  gt_alleles Array(UInt8),
  gt_phased UInt8,
  depth Nullable(UInt16),
  genotype_quality Nullable(UInt16),
  allele_methylation Nullable(Float32),
  allele_purity Nullable(Float32),
  tr_struc String DEFAULT '',
  motif_counts Array(UInt16)
) ENGINE = MergeTree()
ORDER BY (chrom, position, sample_id, strand);
