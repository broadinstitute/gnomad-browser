CREATE TABLE IF NOT EXISTS lr_haplotypes (
    chrom LowCardinality(String),
    position UInt32,
    sample_id LowCardinality(String),
    strand UInt8,
    ref String,
    alt String,
    rsid String,
    qual Float32,
    filters Array(String),
    info_AF Float32,
    info_AC UInt32,
    info_AN UInt32,
    allele_type LowCardinality(String),
    allele_length Int32,
    gnomad_v4_match_type LowCardinality(String),
    info_AF_afr Nullable(Float32),
    info_AF_amr Nullable(Float32),
    info_AF_eas Nullable(Float32),
    info_AF_nfe Nullable(Float32),
    info_AF_sas Nullable(Float32),
    gt_alleles Array(UInt8),
    gt_phased UInt8,
    depth Nullable(UInt16),
    genotype_quality Nullable(UInt16)
) ENGINE = MergeTree()
PARTITION BY chrom
ORDER BY (chrom, position, sample_id, strand);
