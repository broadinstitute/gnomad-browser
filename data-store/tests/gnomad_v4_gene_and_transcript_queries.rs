#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{
    GenomicInterval, GnomadV4Reader, GnomadV4Subset, GnomadV4VariantListEntry, ParquetDataset,
};
use serde_json::{Value, json};

mod fixtures;

const SYNTHETIC_CONSEQUENCE: &str = r"
named_struct(
    'gene_id', gene_id, 'transcript_id', transcript_id,
    'gene_version', CASE WHEN has_values THEN 'gene-version' END,
    'transcript_version', CASE WHEN has_values THEN 'transcript-version' END,
    'gene_symbol', CASE WHEN has_values THEN 'SuppliedSymbol' END,
    'biotype', CASE WHEN has_values THEN 'protein_coding' END,
    'consequence_terms', CASE WHEN has_values THEN ['missense_variant', 'splice_region_variant'] END,
    'major_consequence', CASE WHEN has_values THEN 'missense_variant' END,
    'hgvsc', CASE WHEN has_values THEN 'c.10A>G' END,
    'hgvsp', CASE WHEN has_values THEN 'p.Lys4Arg' END,
    'is_canonical', CASE WHEN has_values THEN consequence_order = 1 END,
    'is_mane_select', CASE WHEN has_values THEN false END,
    'is_mane_select_version', CASE WHEN has_values THEN true END,
    'refseq_id', CASE WHEN has_values THEN 'NM_supplied' END,
    'refseq_version', CASE WHEN has_values THEN 'refseq-version' END,
    'domains', CASE WHEN NOT has_values THEN NULL
                    WHEN annotation_state = 'populated' THEN ['domain-b', 'domain-a'] ELSE [] END,
    'lof', CASE WHEN has_values THEN 'LC' END,
    'lof_filter', CASE WHEN has_values THEN 'supplied-lof-filter' END,
    'lof_flags', CASE WHEN has_values THEN 'supplied-lof-flag' END
)
";

const SYNTHETIC_VARIANT_SELECT: &str = r#"
SELECT
    chromosome AS chrom,
    CAST((position - 1) / 1000000 AS BIGINT) AS posbin,
    CAST(position AS INT) AS pos,
    'C' AS "ref",
    variant_id AS alt,
    CASE WHEN NOT has_values THEN NULL
         WHEN annotation_state = 'populated' THEN ['rs-b', 'rs-a'] ELSE [] END AS rsids,
    named_struct(
        'freq', named_struct(
            'all', named_struct(
                'ac', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 11 END AS INT) END,
                'ac_raw', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 13 END AS INT) END,
                'an', CASE WHEN has_values THEN CAST(101 AS INT) END,
                'hemizygote_count', CASE WHEN has_values THEN CAST(2 AS INT) END,
                'homozygote_count', CASE WHEN has_values THEN CAST(4294967300 AS BIGINT) END,
                'ancestry_groups', CASE WHEN NOT has_values THEN NULL
                    WHEN annotation_state <> 'populated' THEN [] ELSE [
                        named_struct('id', 'pop-b', 'ac', CAST(3 AS INT), 'an', CAST(31 AS INT),
                            'hemizygote_count', CAST(0 AS INT), 'homozygote_count', CAST(1 AS BIGINT)),
                        named_struct('id', 'XX', 'ac', CAST(0 AS INT), 'an', CAST(21 AS INT),
                            'hemizygote_count', CAST(0 AS INT), 'homozygote_count', CAST(0 AS BIGINT)),
                        named_struct('id', 'pop-a_XX', 'ac', CAST(NULL AS INT), 'an', CAST(51 AS INT),
                            'hemizygote_count', CAST(NULL AS INT), 'homozygote_count', CAST(NULL AS BIGINT))
                    ] END
            ),
            'non_ukb', named_struct(
                'ac', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 3 END AS INT) END,
                'ac_raw', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 5 END AS INT) END,
                'an', CASE WHEN has_values THEN CAST(61 AS INT) END,
                'hemizygote_count', CASE WHEN has_values THEN CAST(1 AS INT) END,
                'homozygote_count', CASE WHEN has_values THEN CAST(2 AS BIGINT) END,
                'ancestry_groups', CASE WHEN has_values THEN [] END
            )
        ),
        'filters', CASE WHEN NOT has_values THEN NULL
                        WHEN annotation_state = 'populated' THEN ['AC0', 'source-filter'] ELSE [] END,
        'flags', CASE WHEN NOT has_values THEN NULL
                      WHEN annotation_state = 'populated' THEN ['segdup', 'source-flag'] ELSE [] END,
        'fafmax', named_struct(
            'gnomad', named_struct(
                'faf95_max', CASE WHEN has_values THEN CAST(0.125 AS DOUBLE) END,
                'faf95_max_gen_anc', CASE WHEN has_values THEN 'faf95-pop' END,
                'faf99_max', CASE WHEN has_values THEN CAST(0.25 AS DOUBLE) END,
                'faf99_max_gen_anc', CASE WHEN has_values THEN 'faf99-pop' END
            ),
            'non_ukb', named_struct(
                'faf95_max', CASE WHEN has_values THEN CAST(0.375 AS DOUBLE) END,
                'faf95_max_gen_anc', CASE WHEN has_values THEN 'non-ukb-faf95-pop' END,
                'faf99_max', CASE WHEN has_values THEN CAST(0.5 AS DOUBLE) END,
                'faf99_max_gen_anc', CASE WHEN has_values THEN 'non-ukb-faf99-pop' END
            )
        )
    ) AS exome,
    named_struct(
        'freq', named_struct('all', named_struct(
            'ac', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 7 END AS INT) END,
            'ac_raw', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 9 END AS INT) END,
            'an', CASE WHEN has_values THEN CAST(81 AS INT) END,
            'hemizygote_count', CASE WHEN has_values THEN CAST(0 AS INT) END,
            'homozygote_count', CASE WHEN has_values THEN CAST(4 AS INT) END,
            'ancestry_groups', CASE WHEN has_values THEN [] END
        )),
        'filters', CASE WHEN NOT has_values THEN NULL ELSE [] END,
        'flags', CASE WHEN NOT has_values THEN NULL
                      WHEN annotation_state = 'populated' THEN ['genome-flag'] ELSE [] END
    ) AS genome,
    named_struct(
        'freq', named_struct('all', named_struct(
            'ac', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 17 END AS INT) END,
            'ac_raw', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 19 END AS INT) END,
            'an', CASE WHEN has_values THEN CAST(181 AS INT) END,
            'hemizygote_count', CASE WHEN has_values THEN CAST(0 AS INT) END,
            'homozygote_count', CASE WHEN has_values THEN CAST(6 AS INT) END,
            'ancestry_groups', CASE WHEN has_values THEN [] END
        )),
        'fafmax', named_struct(
            'faf95_max', CASE WHEN has_values THEN CAST(0.625 AS DOUBLE) END,
            'faf95_max_gen_anc', CASE WHEN has_values THEN 'joint-faf95-pop' END,
            'faf99_max', CASE WHEN has_values THEN CAST(0.75 AS DOUBLE) END,
            'faf99_max_gen_anc', CASE WHEN has_values THEN 'joint-faf99-pop' END
        )
    ) AS joint,
    CASE WHEN annotation_state = 'empty_consequences' THEN []
         WHEN annotation_state = 'null_consequences' THEN NULL
         ELSE transcript_consequences END AS transcript_consequences,
    named_struct(
        'cadd', named_struct(
            'phred', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 1.25 END AS FLOAT) END,
            'raw_score', CASE WHEN has_values THEN CAST(-0.25 AS FLOAT) END
        ),
        'revel_max', CASE WHEN has_values THEN CAST(CASE WHEN is_zero THEN 0 ELSE 0.5 END AS DOUBLE) END,
        'spliceai_ds_max', CASE WHEN has_values THEN CAST(0.25 AS FLOAT) END,
        'pangolin_largest_ds', CASE WHEN has_values THEN CAST(0.75 AS DOUBLE) END,
        'phylop', CASE WHEN has_values THEN CAST(-1.25 AS DOUBLE) END,
        'sift_max', CASE WHEN has_values THEN CAST(0.125 AS DOUBLE) END,
        'polyphen_max', CASE WHEN has_values THEN CAST(0.875 AS DOUBLE) END
    ) AS in_silico_predictors
FROM inputs
"#;

const EXPECTED_POPULATED_SOURCE: &str = r#"{
    "variant_id": "1-100-C-source-id",
    "locus": {"contig": "chr1", "position": 100},
    "alleles": ["C", "source-id"],
    "rsids": ["rs-b", "rs-a"],
    "exome": {
        "freq": {"all": {
            "ac": 11, "ac_raw": 13, "an": 101, "hemizygote_count": 2,
            "homozygote_count": 4294967300,
            "ancestry_groups": [
                {"id": "pop-b", "ac": 3, "an": 31, "hemizygote_count": 0, "homozygote_count": 1},
                {"id": "XX", "ac": 0, "an": 21, "hemizygote_count": 0, "homozygote_count": 0},
                {"id": "pop-a_XX", "an": 51}
            ]
        }},
        "filters": ["AC0", "source-filter"],
        "flags": ["segdup", "source-flag"],
        "fafmax": {
            "gnomad": {"faf95_max": 0.125, "faf95_max_gen_anc": "faf95-pop",
                       "faf99_max": 0.25, "faf99_max_gen_anc": "faf99-pop"},
            "non_ukb": {"faf95_max": 0.375, "faf95_max_gen_anc": "non-ukb-faf95-pop",
                        "faf99_max": 0.5, "faf99_max_gen_anc": "non-ukb-faf99-pop"}
        }
    },
    "genome": {
        "freq": {"all": {"ac": 7, "ac_raw": 9, "an": 81, "hemizygote_count": 0,
                         "homozygote_count": 4, "ancestry_groups": []}},
        "filters": [], "flags": ["genome-flag"]
    },
    "joint": {
        "freq": {"all": {"ac": 17, "ac_raw": 19, "an": 181, "hemizygote_count": 0,
                         "homozygote_count": 6, "ancestry_groups": []}},
        "fafmax": {"faf95_max": 0.625, "faf95_max_gen_anc": "joint-faf95-pop",
                   "faf99_max": 0.75, "faf99_max_gen_anc": "joint-faf99-pop"}
    },
    "transcript_consequences": [{
        "gene_id": "ENSG001", "gene_version": "gene-version", "gene_symbol": "SuppliedSymbol",
        "transcript_id": "ENST001", "transcript_version": "transcript-version",
        "biotype": "protein_coding", "consequence_terms": ["missense_variant", "splice_region_variant"],
        "major_consequence": "missense_variant", "hgvsc": "c.10A>G", "hgvsp": "p.Lys4Arg",
        "is_canonical": true, "is_mane_select": false, "is_mane_select_version": true,
        "refseq_id": "NM_supplied", "refseq_version": "refseq-version",
        "domains": ["domain-b", "domain-a"], "lof": "LC",
        "lof_filter": "supplied-lof-filter", "lof_flags": "supplied-lof-flag"
    }],
    "in_silico_predictors": {
        "cadd": {"phred": 1.25, "raw_score": -0.25}, "revel_max": 0.5,
        "spliceai_ds_max": 0.25, "pangolin_largest_ds": 0.75,
        "phylop": -1.25, "sift_max": 0.125, "polyphen_max": 0.875
    }
}"#;

/// Supply consequence rows as (variant ID, chromosome, position, gene ID, transcript ID, order, state).
async fn create_synthetic_reader(variant_annotations: &str) -> Result<GnomadV4Reader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::GnomadVariantsV4.name();
    let query = format!(
        "CREATE TABLE {table_name} AS
        WITH annotations AS (
            SELECT *, annotation_state <> 'missing' AS has_values,
                annotation_state = 'zero' AS is_zero
            FROM ({variant_annotations}) AS supplied(
                variant_id, chromosome, position, gene_id, transcript_id,
                consequence_order, annotation_state
            )
        ), inputs AS (
            SELECT variant_id, chromosome, position, annotation_state, has_values, is_zero,
                array_agg({SYNTHETIC_CONSEQUENCE} ORDER BY consequence_order) AS transcript_consequences
            FROM annotations
            GROUP BY variant_id, chromosome, position, annotation_state, has_values, is_zero
        )
        {SYNTHETIC_VARIANT_SELECT}"
    );
    context.sql(&query).await?.collect().await?;
    Ok(GnomadV4Reader::new(context))
}

async fn create_single_variant_reader(state: &str) -> Result<GnomadV4Reader> {
    create_synthetic_reader(&format!(
        "VALUES ('source-id', '1', 100, 'ENSG001', 'ENST001', 1, '{state}')"
    ))
    .await
}

fn collect_variant_ids(variants: &[GnomadV4VariantListEntry]) -> Vec<&str> {
    variants
        .iter()
        .map(|variant| variant.variant_id.splitn(4, '-').last().unwrap_or_default())
        .collect()
}

fn collect_transcript_ids(variant: &GnomadV4VariantListEntry) -> Vec<Option<&str>> {
    variant
        .transcript_consequences
        .iter()
        .map(|consequence| consequence.transcript_id.as_deref())
        .collect()
}

fn single_interval() -> Result<[GenomicInterval; 1]> {
    GenomicInterval::new("1", 100, 100)
        .map(|interval| [interval])
        .map_err(|error| DataFusionError::Plan(format!("Invalid test interval: {error:?}")))
}

#[tokio::test]
async fn gene_query_reads_real_parquet_source_records() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let intervals = [
        GenomicInterval::new("22", 37_011_030, 37_011_325).expect("valid TST CDS"),
        GenomicInterval::new("22", 37_018_138, 37_018_732).expect("valid TST CDS"),
    ];
    let variants = reader
        .fetch_variants_in_gene("ENSG00000128311", &intervals, GnomadV4Subset::All)
        .await?;
    assert_eq!(variants.len(), 1_241);
    let variant = variants.first().expect("fixture variant exists");
    assert_eq!(variant.variant_id, "22-37010956-G-T");
    assert_eq!(variant.locus.contig, "chr22");
    assert_eq!(variant.locus.position, 37_010_956);
    assert_eq!(variant.alleles, ["G", "T"]);
    assert!(variant.rsids.is_none());
    assert!(variant.flags.is_none());
    let frequency = variant
        .exome
        .freq
        .all
        .as_ref()
        .expect("all exome frequency");
    assert_eq!(
        (frequency.ac, frequency.ac_raw, frequency.an),
        (Some(0), Some(2), Some(1_389_260))
    );
    assert_eq!(
        variant.exome.filters.as_deref(),
        Some(["AC0".to_owned()].as_slice())
    );
    assert_eq!(
        variant
            .genome
            .freq
            .all
            .as_ref()
            .expect("genome frequency")
            .ac_raw,
        None
    );
    assert_eq!(
        variant.joint.freq.all.as_ref().expect("joint frequency").an,
        Some(1_541_602)
    );
    assert!(variant.joint.filters.is_none());
    assert_eq!(
        variant
            .in_silico_predictors
            .spliceai_ds_max
            .map(f32::to_bits),
        Some(0.0_f32.to_bits())
    );
    assert_eq!(
        collect_transcript_ids(variant),
        [
            Some("ENST00000249042"),
            Some("NM_003312.6"),
            Some("ENST00000403892"),
            Some("ENST00000622841"),
            Some("NM_001270483.1"),
        ]
    );
    let consequence = variant
        .transcript_consequences
        .first()
        .expect("first consequence");
    assert_eq!(consequence.hgvsc.as_deref(), Some("c.*71C>A"));
    assert!(consequence.hgvsp.is_none());
    assert_eq!(consequence.is_mane_select, Some(true));
    Ok(())
}

#[tokio::test]
async fn transcript_query_reads_real_parquet_without_pruning_other_consequences() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let intervals =
        [GenomicInterval::new("22", 37_018_361, 37_018_732).expect("valid TST transcript CDS")];
    let variants = reader
        .fetch_variants_in_transcript("ENST00000438203", &intervals, GnomadV4Subset::NonUkb)
        .await?;
    assert_eq!(variants.len(), 572);
    let variant = variants.first().expect("fixture variant exists");
    assert_eq!(variant.variant_id, "22-37018362-A-G");
    assert_eq!(variant.locus.position, 37_018_362);
    assert_eq!(variant.alleles, ["A", "G"]);
    assert!(variant.exome.freq.all.is_none());
    assert_eq!(
        variant
            .exome
            .freq
            .non_ukb
            .as_ref()
            .expect("non-UKB frequency")
            .ac_raw,
        Some(2)
    );
    assert_eq!(
        collect_transcript_ids(variant),
        [
            Some("ENST00000249042"),
            Some("NM_003312.6"),
            Some("ENST00000403892"),
            Some("ENST00000438203"),
            Some("ENST00000622841"),
            Some("NM_001270483.1"),
        ]
    );
    let consequence = variant
        .transcript_consequences
        .iter()
        .find(|consequence| consequence.transcript_id.as_deref() == Some("ENST00000438203"))
        .expect("requested consequence");
    assert_eq!(consequence.hgvsc.as_deref(), Some("c.371T>C"));
    assert_eq!(consequence.hgvsp.as_deref(), Some("p.Val124Ala"));
    assert_eq!(consequence.is_mane_select, Some(false));
    assert!(variants.iter().all(|variant| {
        variant
            .transcript_consequences
            .iter()
            .any(|consequence| consequence.transcript_id.as_deref() == Some("ENST00000438203"))
    }));
    Ok(())
}

#[tokio::test]
async fn gene_membership_matches_later_consequences_and_preserves_the_full_ordered_list()
-> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('match', '1', 100, 'ENSG002', 'ENST002', 1, 'populated'),
        ('match', '1', 100, 'ENSG001', 'ENST001', 2, 'populated'),
        ('match', '1', 100, 'ENSG001', 'ENST003', 3, 'populated'),
        ('other-gene', '1', 110, 'ENSG002', 'ENST002', 1, 'populated')
    ",
    )
    .await?;
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["match"]);
    let variant = variants.first().expect("matching record");
    assert_eq!(
        collect_transcript_ids(variant),
        [Some("ENST002"), Some("ENST001"), Some("ENST003")]
    );
    assert_eq!(
        variant
            .transcript_consequences
            .first()
            .expect("first consequence")
            .gene_id
            .as_deref(),
        Some("ENSG002")
    );
    Ok(())
}

#[tokio::test]
async fn transcript_membership_distinguishes_transcripts_of_the_same_gene() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('match', '1', 100, 'ENSG001', 'ENST002', 1, 'populated'),
        ('match', '1', 100, 'ENSG001', 'ENST001', 2, 'populated'),
        ('other-transcript', '1', 110, 'ENSG001', 'ENST002', 1, 'populated')
    ",
    )
    .await?;
    let variants = reader
        .fetch_variants_in_transcript("ENST001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["match"]);
    assert_eq!(
        collect_transcript_ids(variants.first().expect("matching record")),
        [Some("ENST002"), Some("ENST001")]
    );
    Ok(())
}

#[tokio::test]
async fn missing_or_empty_consequence_lists_do_not_match() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('empty', '1', 100, 'ENSG001', 'ENST001', 1, 'empty_consequences'),
        ('missing', '1', 100, 'ENSG001', 'ENST001', 1, 'null_consequences'),
        ('match', '1', 100, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let gene = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    let transcript = reader
        .fetch_variants_in_transcript("ENST001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&gene), ["match"]);
    assert_eq!(collect_variant_ids(&transcript), ["match"]);
    Ok(())
}

#[tokio::test]
async fn padding_includes_both_boundaries_but_not_adjacent_bases_or_a_second_padding() -> Result<()>
{
    let reader = create_synthetic_reader(
        r"VALUES
        ('before', '1', 124, 'ENSG001', 'ENST001', 1, 'populated'),
        ('start', '1', 125, 'ENSG001', 'ENST001', 1, 'populated'),
        ('stop', '1', 300, 'ENSG001', 'ENST001', 1, 'populated'),
        ('after', '1', 301, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 200, 225).expect("valid interval")];
    let gene = reader
        .fetch_variants_in_gene("ENSG001", &intervals, GnomadV4Subset::All)
        .await?;
    let transcript = reader
        .fetch_variants_in_transcript("ENST001", &intervals, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&gene), ["start", "stop"]);
    assert_eq!(collect_variant_ids(&transcript), ["start", "stop"]);
    Ok(())
}

#[tokio::test]
async fn disjoint_unsorted_intervals_exclude_gap_records() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('left', '1', 125, 'ENSG001', 'ENST001', 1, 'populated'),
        ('gap', '1', 350, 'ENSG001', 'ENST001', 1, 'populated'),
        ('right', '1', 500, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let intervals = [
        GenomicInterval::new("1", 500, 500).expect("valid interval"),
        GenomicInterval::new("1", 200, 200).expect("valid interval"),
    ];
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &intervals, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["left", "right"]);
    Ok(())
}

#[tokio::test]
async fn overlapping_repeated_intervals_and_multiple_matches_do_not_duplicate_records() -> Result<()>
{
    let reader = create_synthetic_reader(
        r"VALUES
        ('match', '1', 100, 'ENSG001', 'ENST001', 1, 'populated'),
        ('match', '1', 100, 'ENSG001', 'ENST002', 2, 'populated')
    ",
    )
    .await?;
    let intervals = [
        GenomicInterval::new("1", 100, 100).expect("valid interval"),
        GenomicInterval::new("1", 110, 110).expect("valid interval"),
        GenomicInterval::new("1", 100, 100).expect("valid interval"),
    ];
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &intervals, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["match"]);
    assert_eq!(
        variants
            .first()
            .expect("matching record")
            .transcript_consequences
            .len(),
        2
    );
    Ok(())
}

#[tokio::test]
async fn chromosome_filtering_excludes_other_chromosomes_at_the_same_position() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('chr-one', '1', 100, 'ENSG001', 'ENST001', 1, 'populated'),
        ('chr-two', '2', 100, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["chr-one"]);
    let absent = [GenomicInterval::new("22", 100, 100).expect("valid interval")];
    assert!(
        reader
            .fetch_variants_in_transcript("ENST001", &absent, GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    Ok(())
}

#[tokio::test]
async fn records_are_ordered_by_numeric_position_then_variant_id() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('a-later', '1', 110, 'ENSG001', 'ENST001', 1, 'populated'),
        ('z-tie', '1', 100, 'ENSG001', 'ENST001', 1, 'populated'),
        ('b-tie', '1', 100, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let variants = reader
        .fetch_variants_in_transcript("ENST001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(
        collect_variant_ids(&variants),
        ["b-tie", "z-tie", "a-later"]
    );
    Ok(())
}

#[tokio::test]
async fn empty_intervals_return_no_records_for_both_contexts() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    assert!(
        reader
            .fetch_variants_in_gene("ENSG001", &[], GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    assert!(
        reader
            .fetch_variants_in_transcript("ENST001", &[], GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    Ok(())
}

#[tokio::test]
async fn unknown_annotations_and_nonoverlapping_intervals_return_no_records() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    assert!(
        reader
            .fetch_variants_in_gene("ENSG999", &single_interval()?, GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    assert!(
        reader
            .fetch_variants_in_transcript("ENST999", &single_interval()?, GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    let distant = [GenomicInterval::new("1", 500, 500).expect("valid interval")];
    assert!(
        reader
            .fetch_variants_in_gene("ENSG001", &distant, GnomadV4Subset::All)
            .await?
            .is_empty()
    );
    Ok(())
}

#[tokio::test]
async fn blank_gene_and_transcript_ids_are_rejected() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    for id in ["", " \t"] {
        let gene = reader
            .fetch_variants_in_gene(id, &single_interval()?, GnomadV4Subset::All)
            .await
            .expect_err("blank gene ID");
        let transcript = reader
            .fetch_variants_in_transcript(id, &single_interval()?, GnomadV4Subset::All)
            .await
            .expect_err("blank transcript ID");
        assert!(gene.to_string().contains("gene_id must not be empty"));
        assert!(
            transcript
                .to_string()
                .contains("transcript_id must not be empty")
        );
    }
    Ok(())
}

#[tokio::test]
async fn annotation_ids_are_bound_as_values_not_sql() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('literal', '1', 100, 'ENSG'' OR true --', 'ENST'' OR true --', 1, 'populated'),
        ('decoy', '1', 100, 'ENSG001', 'ENST001', 1, 'populated')
    ",
    )
    .await?;
    let gene = reader
        .fetch_variants_in_gene("ENSG' OR true --", &single_interval()?, GnomadV4Subset::All)
        .await?;
    let transcript = reader
        .fetch_variants_in_transcript("ENST' OR true --", &single_interval()?, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&gene), ["literal"]);
    assert_eq!(collect_variant_ids(&transcript), ["literal"]);
    Ok(())
}

#[tokio::test]
async fn padding_near_chromosome_start_clamps_without_losing_position_one() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('first', '1', 1, 'ENSG001', 'ENST001', 1, 'populated')")
            .await?;
    let intervals = [GenomicInterval::new("1", 1, 1).expect("valid interval")];
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &intervals, GnomadV4Subset::All)
        .await?;
    assert_eq!(collect_variant_ids(&variants), ["first"]);
    Ok(())
}

#[tokio::test]
async fn padding_overflow_is_reported_for_both_contexts() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    let intervals = [GenomicInterval::new("1", i32::MAX, i32::MAX).expect("valid interval")];
    let gene = reader
        .fetch_variants_in_gene("ENSG001", &intervals, GnomadV4Subset::All)
        .await
        .expect_err("padding overflow");
    let transcript = reader
        .fetch_variants_in_transcript("ENST001", &intervals, GnomadV4Subset::All)
        .await
        .expect_err("padding overflow");
    assert!(gene.to_string().contains("PaddingOverflow"));
    assert!(transcript.to_string().contains("PaddingOverflow"));
    Ok(())
}

#[tokio::test]
async fn zero_and_missing_raw_frequencies_do_not_filter_records_or_remove_sequencing_objects()
-> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
        ('missing', '1', 100, 'ENSG001', 'ENST001', 1, 'missing'),
        ('zero', '1', 110, 'ENSG001', 'ENST001', 1, 'zero')
    ",
    )
    .await?;
    for subset in [GnomadV4Subset::All, GnomadV4Subset::NonUkb] {
        let variants = reader
            .fetch_variants_in_gene("ENSG001", &single_interval()?, subset)
            .await?;
        assert_eq!(collect_variant_ids(&variants), ["missing", "zero"]);
        let missing = variants.first().expect("missing-frequency record retained");
        assert_eq!(
            missing
                .genome
                .freq
                .all
                .as_ref()
                .expect("genome object retained")
                .ac_raw,
            None
        );
        assert_eq!(
            missing
                .joint
                .freq
                .all
                .as_ref()
                .expect("joint object retained")
                .ac_raw,
            None
        );
        let zero = variants.last().expect("zero-frequency record retained");
        assert_eq!(
            zero.genome
                .freq
                .all
                .as_ref()
                .expect("genome object retained")
                .ac_raw,
            Some(0)
        );
    }
    Ok(())
}

#[tokio::test]
async fn non_ukb_projection_changes_only_the_selected_exome_frequency() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::NonUkb)
        .await?;
    let variant = variants.first().expect("source record");
    assert!(variant.exome.freq.all.is_none());
    let frequency = variant
        .exome
        .freq
        .non_ukb
        .as_ref()
        .expect("non-UKB exome frequency");
    assert_eq!(
        (frequency.ac, frequency.ac_raw, frequency.an),
        (Some(3), Some(5), Some(61))
    );
    assert_eq!(
        variant
            .genome
            .freq
            .all
            .as_ref()
            .expect("all genome frequency")
            .ac_raw,
        Some(9)
    );
    assert_eq!(
        variant
            .joint
            .freq
            .all
            .as_ref()
            .expect("all joint frequency")
            .ac_raw,
        Some(19)
    );
    assert!(variant.genome.freq.non_ukb.is_none());
    assert!(variant.joint.freq.non_ukb.is_none());
    let serialized = serde_json::to_value(variant).expect("serialize source record");
    assert_eq!(
        serialized.pointer("/exome/freq/non_ukb/ac"),
        Some(&json!(3))
    );
    assert!(serialized.pointer("/exome/freq/all").is_none());
    assert!(serialized.pointer("/joint/freq/non_ukb").is_none());
    Ok(())
}

#[tokio::test]
async fn populated_records_serialize_to_the_unshaped_es_source_contract() -> Result<()> {
    let reader = create_single_variant_reader("populated").await?;
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    let variant = variants.first().expect("source record");
    let actual = serde_json::to_value(variant).expect("serialize source record");
    let expected: Value =
        serde_json::from_str(EXPECTED_POPULATED_SOURCE).expect("literal expected source");
    assert_eq!(actual, expected);
    Ok(())
}

#[tokio::test]
async fn missing_fields_are_omitted_without_fabricating_pass_or_annotations() -> Result<()> {
    let reader = create_single_variant_reader("missing").await?;
    let variants = reader
        .fetch_variants_in_gene("ENSG001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    let actual = serde_json::to_value(variants.first().expect("source record"))
        .expect("serialize source record");
    assert_eq!(
        actual,
        json!({
            "variant_id": "1-100-C-source-id", "locus": {"contig": "chr1", "position": 100},
            "alleles": ["C", "source-id"],
            "exome": {"freq": {"all": {}}, "fafmax": {"gnomad": {}, "non_ukb": {}}},
            "genome": {"freq": {"all": {}}},
            "joint": {"freq": {"all": {}}, "fafmax": {}},
            "transcript_consequences": [{"gene_id": "ENSG001", "transcript_id": "ENST001"}],
            "in_silico_predictors": {"cadd": {}}
        })
    );
    Ok(())
}

#[tokio::test]
async fn empty_arrays_zero_values_and_false_flags_remain_distinct_from_missing_fields() -> Result<()>
{
    let reader = create_single_variant_reader("zero").await?;
    let variants = reader
        .fetch_variants_in_transcript("ENST001", &single_interval()?, GnomadV4Subset::All)
        .await?;
    let actual = serde_json::to_value(variants.first().expect("source record"))
        .expect("serialize source record");
    assert_eq!(actual.get("rsids"), Some(&json!([])));
    assert_eq!(actual.pointer("/exome/filters"), Some(&json!([])));
    assert_eq!(actual.pointer("/exome/flags"), Some(&json!([])));
    assert_eq!(actual.pointer("/exome/freq/all/ac_raw"), Some(&json!(0)));
    assert_eq!(
        actual.pointer("/exome/freq/all/ancestry_groups"),
        Some(&json!([]))
    );
    assert_eq!(
        actual.pointer("/in_silico_predictors/cadd/phred"),
        Some(&json!(0.0))
    );
    assert_eq!(
        actual.pointer("/in_silico_predictors/revel_max"),
        Some(&json!(0.0))
    );
    assert_eq!(
        actual.pointer("/transcript_consequences/0/is_mane_select"),
        Some(&json!(false))
    );
    assert_eq!(
        actual.pointer("/transcript_consequences/0/domains"),
        Some(&json!([]))
    );
    assert!(actual.get("flags").is_none());
    assert!(actual.pointer("/joint/filters").is_none());
    Ok(())
}
