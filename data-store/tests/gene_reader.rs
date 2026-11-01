#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::Result;
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{
    GeneGnomadConstraint, GeneInterval, GeneLocus, GeneManeSelectTranscript, GeneReader,
    ParquetDataset, create_datafusion_context_from_root,
};

mod fixtures;

const SYNTHETIC_GENE_ID: &str = "ENSG00000000001";
const GENE_ROWS: &str = "VALUES
    ('ENSG00000000002', 'decoy-version', 'empty'),
    ('ENSG00000000001', 'source-version', 'populated')";

const SYNTHETIC_GENE_SELECT: &str = r#"
SELECT
    gene_id,
    gene_version,
    'SuppliedSymbol' AS symbol,
    'gencode-symbol' AS gencode_symbol,
    'GRCh38' AS reference_genome,
    'Y' AS chrom,
    '-' AS strand,
    CAST(101 AS INT) AS start,
    CAST(199 AS INT) AS stop,
    CAST(24000000101 AS BIGINT) AS xstart,
    CAST(24000000199 AS BIGINT) AS xstop,
    named_struct(
        'start', named_struct('contig', 'chrY', 'position', CAST(101 AS INT)),
        'end', named_struct('contig', 'chrY', 'position', CAST(200 AS INT)),
        'includes_start', true, 'includes_end', false
    ) AS "interval",
    CASE WHEN annotation_state = 'empty' THEN [] ELSE [
        named_struct('feature_type', 'CDS', 'start', CAST(120 AS INT), 'stop', CAST(129 AS INT),
                     'xstart', CAST(24000000120 AS BIGINT), 'xstop', CAST(24000000129 AS BIGINT)),
        named_struct('feature_type', 'UTR', 'start', CAST(110 AS INT), 'stop', CAST(119 AS INT),
                     'xstart', CAST(24000000110 AS BIGINT), 'xstop', CAST(24000000119 AS BIGINT))
    ] END AS exons,
    [named_struct(
        'transcript_id', 'supplied-transcript', 'transcript_version', 'transcript-version',
        'gene_id', gene_id, 'gene_version', gene_version,
        'reference_genome', 'GRCh38', 'chrom', 'Y', 'strand', '-',
        'start', CAST(105 AS INT), 'stop', CAST(190 AS INT),
        'xstart', CAST(24000000105 AS BIGINT), 'xstop', CAST(24000000190 AS BIGINT),
        'interval', named_struct(
            'start', named_struct('contig', 'chrY', 'position', CAST(105 AS INT)),
            'end', named_struct('contig', 'chrY', 'position', CAST(190 AS INT)),
            'includes_start', false, 'includes_end', true
        ),
        'exons', CASE WHEN annotation_state = 'empty' THEN [] ELSE [
            named_struct('feature_type', 'UTR', 'start', CAST(105 AS INT), 'stop', CAST(109 AS INT),
                         'xstart', CAST(24000000105 AS BIGINT), 'xstop', CAST(24000000109 AS BIGINT)),
            named_struct('feature_type', 'CDS', 'start', CAST(110 AS INT), 'stop', CAST(125 AS INT),
                         'xstart', CAST(24000000110 AS BIGINT), 'xstop', CAST(24000000125 AS BIGINT))
        ] END,
        'gtex_tissue_expression', CASE
            WHEN annotation_state = 'null' THEN NULL
            WHEN annotation_state = 'empty' THEN []
            ELSE [named_struct('tissue', 'tissue-a', 'value', CAST(0 AS DOUBLE)),
                  named_struct('tissue', 'tissue-b', 'value', CAST(NULL AS DOUBLE))]
        END,
        'refseq_id', CASE WHEN has_annotation THEN 'transcript-refseq' END,
        'refseq_version', CASE WHEN has_annotation THEN 'transcript-refseq-version' END
    ), named_struct(
        'transcript_id', 'second-transcript', 'transcript_version', 'second-version',
        'gene_id', gene_id, 'gene_version', gene_version,
        'reference_genome', 'GRCh38', 'chrom', 'Y', 'strand', '-',
        'start', CAST(160 AS INT), 'stop', CAST(180 AS INT),
        'xstart', CAST(24000000160 AS BIGINT), 'xstop', CAST(24000000180 AS BIGINT),
        'interval', named_struct(
            'start', named_struct('contig', 'chrY', 'position', CAST(160 AS INT)),
            'end', named_struct('contig', 'chrY', 'position', CAST(180 AS INT)),
            'includes_start', true, 'includes_end', true
        ),
        'exons', [], 'gtex_tissue_expression', NULL,
        'refseq_id', NULL, 'refseq_version', NULL
    )] AS transcripts,
    CASE WHEN has_annotation THEN 'hgnc-id' END AS hgnc_id,
    CASE WHEN has_annotation THEN 'ncbi-id' END AS ncbi_id,
    CASE WHEN has_annotation THEN 'omim-id' END AS omim_id,
    CASE WHEN has_annotation THEN 'supplied-name' END AS name,
    CASE WHEN has_annotation AND annotation_state <> 'empty' THEN ['flag-b', 'flag-a'] ELSE [] END AS flags,
    CASE WHEN has_annotation THEN 'supplied-transcript' END AS canonical_transcript_id,
    CASE WHEN annotation_state = 'null' THEN NULL ELSE named_struct(
        'matched_gene_version', CASE WHEN has_annotation THEN gene_version END,
        'ensembl_id', CASE WHEN has_annotation THEN 'mane-transcript' END,
        'ensembl_version', CASE WHEN has_annotation THEN 'mane-version' END,
        'refseq_id', CASE WHEN has_annotation THEN 'mane-refseq' END,
        'refseq_version', CASE WHEN has_annotation THEN 'mane-refseq-version' END
    ) END AS mane_select_transcript,
    CASE WHEN annotation_state = 'null' THEN NULL ELSE named_struct(
        'regions', CASE
            WHEN NOT has_annotation THEN NULL
            WHEN annotation_state = 'empty' THEN []
            ELSE [named_struct(
                'chrom', 'chrY', 'start', CAST(121 AS INT), 'stop', CAST(128 AS INT),
                'mean', CAST(0.25 AS DOUBLE),
                'tissues', [named_struct('tissue', 'tissue-a', 'value', CAST(0 AS DOUBLE)),
                            named_struct('tissue', 'tissue-b', 'value', CAST(1 AS DOUBLE)),
                            named_struct('tissue', 'tissue-c', 'value', CAST(NULL AS DOUBLE))]
            ), named_struct(
                'chrom', 'chrY', 'start', CAST(141 AS INT), 'stop', CAST(148 AS INT),
                'mean', CAST(0.75 AS DOUBLE), 'tissues', []
            )]
        END,
        'flags', CASE WHEN NOT has_annotation THEN NULL
                      WHEN annotation_state = 'empty' THEN [] ELSE ['pext-flag'] END
    ) END AS pext,
    CASE WHEN annotation_state = 'null' THEN NULL ELSE named_struct(
        'gene', CASE WHEN has_annotation THEN 'constraint-symbol' END,
        'gene_id', CASE WHEN has_annotation THEN gene_id END,
        'transcript', CASE WHEN has_annotation THEN 'constraint-transcript' END,
        'canonical', CASE WHEN has_annotation THEN false END,
        'mane_select', CASE WHEN has_annotation THEN true END,
        'exp_lof', CASE WHEN has_annotation AND annotation_state <> 'empty' THEN CAST(1.25 AS DOUBLE) END,
        'exp_mis', CASE WHEN has_annotation THEN CAST(2.25 AS DOUBLE) END,
        'exp_syn', CASE WHEN has_annotation THEN CAST(3.25 AS DOUBLE) END,
        'obs_lof', CASE WHEN has_annotation THEN CAST(CASE WHEN annotation_state = 'empty' THEN 0 ELSE 11 END AS BIGINT) END,
        'obs_mis', CASE WHEN has_annotation THEN CAST(12 AS BIGINT) END,
        'obs_syn', CASE WHEN has_annotation THEN CAST(13 AS BIGINT) END,
        'oe_lof', CASE WHEN has_annotation THEN CAST(0.125 AS DOUBLE) END,
        'oe_lof_lower', CASE WHEN has_annotation THEN CAST(0.0625 AS DOUBLE) END,
        'oe_lof_upper', CASE WHEN has_annotation THEN CAST(0.1875 AS DOUBLE) END,
        'oe_lof_percentile', CASE WHEN has_annotation THEN CAST(17 AS INT) END,
        'oe_mis', CASE WHEN has_annotation THEN CAST(0.375 AS DOUBLE) END,
        'oe_mis_lower', CASE WHEN has_annotation THEN CAST(0.3125 AS DOUBLE) END,
        'oe_mis_upper', CASE WHEN has_annotation THEN CAST(0.4375 AS DOUBLE) END,
        'oe_syn', CASE WHEN has_annotation THEN CAST(0.625 AS DOUBLE) END,
        'oe_syn_lower', CASE WHEN has_annotation THEN CAST(0.5625 AS DOUBLE) END,
        'oe_syn_upper', CASE WHEN has_annotation THEN CAST(0.6875 AS DOUBLE) END,
        'lof_z', CASE WHEN has_annotation THEN CAST(-1.5 AS DOUBLE) END,
        'mis_z', CASE WHEN has_annotation THEN CAST(2.5 AS DOUBLE) END,
        'syn_z', CASE WHEN has_annotation THEN CAST(-3.5 AS DOUBLE) END,
        'pli', CASE WHEN has_annotation THEN CAST(0.875 AS DOUBLE) END,
        'flags', CASE WHEN NOT has_annotation THEN NULL
                      WHEN annotation_state = 'empty' THEN [] ELSE ['constraint-flag'] END
    ) END AS gnomad_constraint,
    CASE WHEN has_annotation THEN ['old-symbol'] END AS previous_symbols,
    CASE WHEN has_annotation THEN ['alias-b', 'alias-a'] END AS alias_symbols,
    'SUPPLIEDSYMBOL' AS symbol_upper_case,
    ['TERM-B', 'TERM-A'] AS search_terms,
    CASE WHEN has_annotation THEN 'preferred-transcript' END AS preferred_transcript_id,
    CASE WHEN has_annotation THEN 'preferred-source' END AS preferred_transcript_source
FROM inputs
"#;

async fn create_synthetic_reader(gene_rows: &str) -> Result<GeneReader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::GeneModelsGrch38.name();
    let query = format!(
        "CREATE TABLE {table_name} AS
        WITH inputs AS (
            SELECT *, annotation_state NOT IN ('null', 'all_null') AS has_annotation
            FROM ({gene_rows}) AS supplied(gene_id, gene_version, annotation_state)
        )
        {SYNTHETIC_GENE_SELECT}"
    );
    context.sql(&query).await?.collect().await?;
    Ok(GeneReader::new(context))
}

#[tokio::test]
async fn preserves_supplied_identifiers_coordinates_and_metadata() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert_eq!(gene.gene_id, SYNTHETIC_GENE_ID);
    assert_eq!(gene.gene_version, "source-version");
    assert_eq!(gene.symbol, "SuppliedSymbol");
    assert_eq!(gene.gencode_symbol, "gencode-symbol");
    assert_eq!(gene.reference_genome, "GRCh38");
    assert_eq!(gene.chrom, "Y");
    assert_eq!(gene.strand, "-");
    assert_eq!((gene.start, gene.stop), (101, 199));
    assert_eq!((gene.xstart, gene.xstop), (24_000_000_101, 24_000_000_199));
    assert_eq!(gene.hgnc_id.as_deref(), Some("hgnc-id"));
    assert_eq!(gene.ncbi_id.as_deref(), Some("ncbi-id"));
    assert_eq!(gene.omim_id.as_deref(), Some("omim-id"));
    assert_eq!(gene.name.as_deref(), Some("supplied-name"));
    assert_eq!(gene.flags, vec!["flag-b", "flag-a"]);
    assert_eq!(gene.symbol_upper_case, "SUPPLIEDSYMBOL");
    assert_eq!(gene.previous_symbols, Some(vec!["old-symbol".to_owned()]));
    assert_eq!(
        gene.alias_symbols,
        Some(vec!["alias-b".to_owned(), "alias-a".to_owned()])
    );
    assert_eq!(gene.search_terms, vec!["TERM-B", "TERM-A"]);
    assert_eq!(
        gene.canonical_transcript_id.as_deref(),
        Some("supplied-transcript")
    );
    assert_eq!(
        gene.preferred_transcript_id.as_deref(),
        Some("preferred-transcript")
    );
    assert_eq!(
        gene.preferred_transcript_source.as_deref(),
        Some("preferred-source")
    );
    assert_eq!(
        gene.interval,
        GeneInterval {
            start: GeneLocus {
                contig: "chrY".to_owned(),
                position: 101,
            },
            end: GeneLocus {
                contig: "chrY".to_owned(),
                position: 200,
            },
            includes_start: true,
            includes_end: false,
        }
    );
    assert_eq!(
        gene.mane_select_transcript,
        Some(GeneManeSelectTranscript {
            matched_gene_version: "source-version".to_owned(),
            ensembl_id: "mane-transcript".to_owned(),
            ensembl_version: "mane-version".to_owned(),
            refseq_id: "mane-refseq".to_owned(),
            refseq_version: "mane-refseq-version".to_owned(),
        })
    );
    Ok(())
}

#[tokio::test]
async fn preserves_gene_exons_in_supplied_order() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    let gene_exons: Vec<_> = gene
        .exons
        .iter()
        .map(|exon| {
            (
                exon.feature_type.as_str(),
                exon.start,
                exon.stop,
                exon.xstart,
                exon.xstop,
            )
        })
        .collect();
    assert_eq!(
        gene_exons,
        vec![
            ("CDS", 120, 129, 24_000_000_120, 24_000_000_129),
            ("UTR", 110, 119, 24_000_000_110, 24_000_000_119),
        ]
    );
    Ok(())
}

#[tokio::test]
async fn preserves_transcript_fields_and_exons_independently_of_the_gene_model() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    let transcript_models: Vec<_> = gene
        .transcripts
        .iter()
        .map(|transcript| {
            (
                transcript.transcript_id.as_str(),
                transcript.start,
                transcript.stop,
            )
        })
        .collect();
    assert_eq!(
        transcript_models,
        vec![
            ("supplied-transcript", 105, 190),
            ("second-transcript", 160, 180)
        ]
    );
    let transcript = gene
        .transcripts
        .first()
        .expect("supplied transcript should exist");
    assert_eq!(transcript.transcript_id, "supplied-transcript");
    assert_eq!(transcript.transcript_version, "transcript-version");
    assert_eq!(transcript.gene_id, SYNTHETIC_GENE_ID);
    assert_eq!(transcript.gene_version, "source-version");
    assert_eq!(transcript.reference_genome, "GRCh38");
    assert_eq!(transcript.chrom, "Y");
    assert_eq!(transcript.strand, "-");
    assert_eq!((transcript.start, transcript.stop), (105, 190));
    assert_eq!(
        (transcript.xstart, transcript.xstop),
        (24_000_000_105, 24_000_000_190)
    );
    assert_eq!(
        transcript.interval,
        GeneInterval {
            start: GeneLocus {
                contig: "chrY".to_owned(),
                position: 105,
            },
            end: GeneLocus {
                contig: "chrY".to_owned(),
                position: 190,
            },
            includes_start: false,
            includes_end: true,
        }
    );
    let transcript_exons: Vec<_> = transcript
        .exons
        .iter()
        .map(|exon| {
            (
                exon.feature_type.as_str(),
                exon.start,
                exon.stop,
                exon.xstart,
                exon.xstop,
            )
        })
        .collect();
    assert_eq!(
        transcript_exons,
        vec![
            ("UTR", 105, 109, 24_000_000_105, 24_000_000_109),
            ("CDS", 110, 125, 24_000_000_110, 24_000_000_125),
        ]
    );
    assert_eq!(transcript.refseq_id.as_deref(), Some("transcript-refseq"));
    assert_eq!(
        transcript.refseq_version.as_deref(),
        Some("transcript-refseq-version")
    );
    let expression: Vec<_> = transcript
        .gtex_tissue_expression
        .as_ref()
        .expect("supplied expression should exist")
        .iter()
        .map(|tissue| (tissue.tissue.as_str(), tissue.value))
        .collect();
    assert_eq!(
        expression,
        vec![("tissue-a", Some(0.0)), ("tissue-b", None)]
    );
    Ok(())
}

#[tokio::test]
async fn preserves_pext_values_including_zero_one_and_null() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");
    let pext = gene.pext.expect("supplied pext should exist");

    assert_eq!(pext.flags, vec!["pext-flag"]);
    let regions: Vec<_> = pext
        .regions
        .iter()
        .map(|region| {
            (
                region.chrom.as_str(),
                region.start,
                region.stop,
                region.mean,
            )
        })
        .collect();
    assert_eq!(
        regions,
        vec![("chrY", 121, 128, 0.25), ("chrY", 141, 148, 0.75)]
    );
    let region = pext.regions.first().expect("supplied region should exist");
    let tissues: Vec<_> = region
        .tissues
        .iter()
        .map(|tissue| (tissue.tissue.as_str(), tissue.value))
        .collect();
    assert_eq!(
        tissues,
        vec![
            ("tissue-a", Some(0.0)),
            ("tissue-b", Some(1.0)),
            ("tissue-c", None),
        ]
    );
    let last_region = pext
        .regions
        .last()
        .expect("second supplied region should exist");
    assert!(
        last_region.tissues.is_empty(),
        "Expected an empty tissue list in the second region, got {:?}",
        last_region.tissues
    );
    Ok(())
}

#[tokio::test]
async fn preserves_each_distinct_constraint_value() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert_eq!(
        gene.gnomad_constraint,
        Some(GeneGnomadConstraint {
            gene: Some("constraint-symbol".to_owned()),
            gene_id: Some(SYNTHETIC_GENE_ID.to_owned()),
            transcript: Some("constraint-transcript".to_owned()),
            canonical: Some(false),
            mane_select: Some(true),
            exp_lof: Some(1.25),
            exp_mis: Some(2.25),
            exp_syn: Some(3.25),
            obs_lof: Some(11),
            obs_mis: Some(12),
            obs_syn: Some(13),
            oe_lof: Some(0.125),
            oe_lof_lower: Some(0.0625),
            oe_lof_upper: Some(0.1875),
            oe_lof_percentile: Some(17),
            oe_mis: Some(0.375),
            oe_mis_lower: Some(0.3125),
            oe_mis_upper: Some(0.4375),
            oe_syn: Some(0.625),
            oe_syn_lower: Some(0.5625),
            oe_syn_upper: Some(0.6875),
            lof_z: Some(-1.5),
            mis_z: Some(2.5),
            syn_z: Some(-3.5),
            pli: Some(0.875),
            flags: Some(vec!["constraint-flag".to_owned()]),
        })
    );
    Ok(())
}

#[tokio::test]
async fn normalizes_null_and_all_null_annotations_without_losing_the_gene() -> Result<()> {
    for state in ["null", "all_null"] {
        let rows = format!("VALUES ('{SYNTHETIC_GENE_ID}', 'source-version', '{state}')");
        let reader = create_synthetic_reader(&rows).await?;
        let gene = reader
            .fetch_gene_by_id(SYNTHETIC_GENE_ID)
            .await?
            .expect("gene must survive missing annotations");

        assert_eq!(gene.gene_id, SYNTHETIC_GENE_ID);
        assert!(gene.mane_select_transcript.is_none());
        assert!(gene.pext.is_none());
        assert!(gene.gnomad_constraint.is_none());
        assert!(gene.canonical_transcript_id.is_none());
        assert!(gene.preferred_transcript_id.is_none());
        assert!(gene.preferred_transcript_source.is_none());
        assert!(gene.hgnc_id.is_none());
        assert!(gene.ncbi_id.is_none());
        assert!(gene.omim_id.is_none());
        assert!(gene.name.is_none());
        assert!(gene.previous_symbols.is_none());
        assert!(gene.alias_symbols.is_none());
        assert_eq!(gene.exons.len(), 2);
        let transcript = gene.transcripts.first().expect("transcript should survive");
        assert!(transcript.refseq_id.is_none());
        assert!(transcript.refseq_version.is_none());
        if state == "null" {
            assert!(transcript.gtex_tissue_expression.is_none());
        }
    }
    Ok(())
}

#[tokio::test]
async fn preserves_empty_collections_zero_counts_and_partially_missing_constraint() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('ENSG00000000001', 'source-version', 'empty')").await?;
    let gene = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert!(
        gene.flags.is_empty(),
        "Unexpected gene flags: {:?}",
        gene.flags
    );
    assert!(
        gene.exons.is_empty(),
        "Unexpected gene exons: {:?}",
        gene.exons
    );
    let transcript = gene.transcripts.first().expect("transcript should exist");
    assert!(
        transcript.exons.is_empty(),
        "Unexpected transcript exons: {:?}",
        transcript.exons
    );
    assert!(
        transcript
            .gtex_tissue_expression
            .as_ref()
            .is_some_and(Vec::is_empty),
        "Expected present but empty expression, got {:?}",
        transcript.gtex_tissue_expression
    );
    let pext = gene.pext.expect("empty pext must remain present");
    assert!(
        pext.regions.is_empty(),
        "Unexpected pext regions: {:?}",
        pext.regions
    );
    assert!(
        pext.flags.is_empty(),
        "Unexpected pext flags: {:?}",
        pext.flags
    );
    let constraint = gene
        .gnomad_constraint
        .expect("partial constraint must remain present");
    assert!(constraint.exp_lof.is_none());
    assert_eq!(constraint.obs_lof, Some(0));
    assert_eq!(constraint.canonical, Some(false));
    assert!(
        constraint.flags.as_ref().is_some_and(Vec::is_empty),
        "Expected present but empty constraint flags, got {:?}",
        constraint.flags
    );
    Ok(())
}

#[tokio::test]
async fn filters_exact_ids_without_interpreting_sql_in_input() -> Result<()> {
    let reader = create_synthetic_reader(GENE_ROWS).await?;
    let decoy = reader
        .fetch_gene_by_id("ENSG00000000002")
        .await?
        .expect("second supplied gene should exist");
    assert_eq!(decoy.gene_version, "decoy-version");
    for gene_id in [
        "ENSG00000000000",
        "ENSG00000000001.1",
        "SuppliedSymbol",
        "ENSG00000000001' OR TRUE --",
    ] {
        assert!(reader.fetch_gene_by_id(gene_id).await?.is_none());
    }
    Ok(())
}

#[tokio::test]
async fn rejects_duplicate_ids_instead_of_selecting_an_arbitrary_record() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
        ('ENSG00000000001', 'first-version', 'populated'),
        ('ENSG00000000001', 'second-version', 'populated')",
    )
    .await?;
    let error = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await
        .expect_err("duplicate ID must not return an arbitrary gene");
    assert!(error.to_string().contains("Multiple gene records"));
    assert!(error.to_string().contains(SYNTHETIC_GENE_ID));
    Ok(())
}

#[tokio::test]
async fn reports_decode_errors_with_the_requested_gene_id() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('ENSG00000000001', CAST(NULL AS VARCHAR), 'populated')")
            .await?;
    let error = reader
        .fetch_gene_by_id(SYNTHETIC_GENE_ID)
        .await
        .expect_err("missing required gene version must fail decoding");
    assert!(error.to_string().contains("Failed to decode gene result"));
    assert!(error.to_string().contains(SYNTHETIC_GENE_ID));
    Ok(())
}

#[tokio::test]
async fn query_failure_is_not_reported_as_a_missing_gene() {
    let reader = GeneReader::new(SessionContext::new());
    assert!(reader.fetch_gene_by_id(SYNTHETIC_GENE_ID).await.is_err());
}

async fn create_parquet_reader() -> Result<GeneReader> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::GeneModelsGrch38,
    )
    .await?;
    Ok(GeneReader::new(context))
}

#[tokio::test]
async fn decodes_populated_annotations_from_the_real_export() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let gene = reader
        .fetch_gene_by_id("ENSG00000169174")
        .await?
        .expect("PCSK9 fixture should exist");

    assert_eq!(gene.gene_id, "ENSG00000169174");
    assert_eq!(gene.symbol, "PCSK9");
    assert_eq!(gene.reference_genome, "GRCh38");
    assert!(!gene.exons.is_empty(), "Require exported gene exons");
    assert!(!gene.transcripts.is_empty(), "Require exported transcripts");
    let canonical_id = gene
        .canonical_transcript_id
        .as_ref()
        .expect("Require exported canonical transcript metadata");
    let canonical = gene
        .transcripts
        .iter()
        .find(|transcript| &transcript.transcript_id == canonical_id)
        .expect("Require the canonical transcript in the exported model");
    assert!(canonical.gtex_tissue_expression.is_some());
    assert!(gene.mane_select_transcript.is_some());
    let pext = gene
        .pext
        .expect("Require populated pext in the real fixture");
    assert!(!pext.regions.is_empty(), "Require exported pext regions");
    assert!(gene.gnomad_constraint.is_some());
    Ok(())
}

#[tokio::test]
async fn decodes_missing_annotations_from_the_real_export() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let gene = reader
        .fetch_gene_by_id("ENSG00000131548")
        .await?
        .expect("TTTY6B fixture should exist");

    assert_eq!(gene.gene_id, "ENSG00000131548");
    assert_eq!(gene.symbol, "TTTY6B");
    assert!(!gene.exons.is_empty(), "Require the exported gene model");
    assert!(!gene.transcripts.is_empty(), "Require exported transcripts");
    assert!(gene.canonical_transcript_id.is_none());
    assert!(gene.mane_select_transcript.is_none());
    assert!(gene.pext.is_none());
    assert!(gene.gnomad_constraint.is_none());
    Ok(())
}
