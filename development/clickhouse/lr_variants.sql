CREATE TABLE IF NOT EXISTS lr_variants (
    chrom LowCardinality(String),
    position UInt32,
    ref String,
    alt String,
    variant_id String,
    xpos Float64,

    rsids Array(String),
    allele_type LowCardinality(String),
    filters Array(String),
    intergenic UInt8,
    gene_region LowCardinality(String),
    major_consequence LowCardinality(String),

    end Nullable(UInt32),
    length Nullable(Int32),
    cadd_phred Nullable(Float32),
    phylop Nullable(Float32),

    -- Short Read Match
    short_read_match_id String DEFAULT '',
    short_read_match_type String DEFAULT '',
    short_read_match_source String DEFAULT '',

    -- Tandem Repeats
    enveloping_tr_id String DEFAULT '',
    enveloped_ids Array(String),
    motifs Array(String),
    is_likely_tr UInt8,
    gnomad_str String DEFAULT '',

    -- JSON Payloads for complex GraphQL types
    freq_json String DEFAULT '{}',
    transcript_consequences_json String DEFAULT '[]',
    genes_json String DEFAULT '[]',
    main_reference_region_json String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY (chrom, position, ref, alt);
