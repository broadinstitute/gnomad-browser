#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{
    GeneReader, GenomicInterval, ParquetDataset, RegionGene, create_datafusion_context_from_root,
};

mod fixtures;

async fn create_synthetic_reader(gene_rows: &str) -> Result<GeneReader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::GeneModelsGrch38.name();
    let query = format!(
        "CREATE TABLE {table_name} AS
        SELECT
            gene_id,
            symbol,
            chrom,
            CAST(start AS INT) AS start,
            CAST(stop AS INT) AS stop,
            CASE WHEN gene_id = 'ENSG_NO_MODELS' THEN [] ELSE [
                named_struct('feature_type', 'CDS', 'start', CAST(start AS INT), 'stop', CAST(start + 1 AS INT),
                             'xstart', CAST(start AS BIGINT), 'xstop', CAST(start + 1 AS BIGINT))
            ] END AS exons,
            CASE WHEN gene_id = 'ENSG_NO_MODELS' THEN [] ELSE [
                named_struct('transcript_id', concat('ENST_', gene_id), 'transcript_version', 'ignored',
                             'start', CAST(start AS INT), 'stop', CAST(stop AS INT),
                             'exons', [named_struct('feature_type', 'UTR', 'start', CAST(stop - 1 AS INT),
                                                    'stop', CAST(stop AS INT),
                                                    'xstart', CAST(stop - 1 AS BIGINT), 'xstop', CAST(stop AS BIGINT))]),
                named_struct('transcript_id', concat('ENST2_', gene_id), 'transcript_version', 'ignored',
                             'start', CAST(start AS INT), 'stop', CAST(start AS INT), 'exons', [])
            ] END AS transcripts
        FROM ({gene_rows}) AS supplied(gene_id, symbol, chrom, start, stop)"
    );
    context.sql(&query).await?.collect().await?;
    Ok(GeneReader::new(context))
}

async fn gene_ids_in_region(
    reader: &GeneReader,
    chromosome: &str,
    start: i32,
    stop: i32,
) -> Result<Vec<String>> {
    let interval = GenomicInterval::new(chromosome, start, stop)
        .map_err(|error| DataFusionError::Plan(format!("invalid interval: {error:?}")))?;
    let genes = reader.fetch_genes_in_region(&interval).await?;
    Ok(genes.into_iter().map(|gene| gene.gene_id).collect())
}

#[tokio::test]
async fn includes_genes_touching_either_inclusive_edge_and_excludes_neighbors() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('ENSG_BEFORE', 'BEFORE', '1', 100, 199),
            ('ENSG_LEFT_EDGE', 'LEFT', '1', 100, 200),
            ('ENSG_INSIDE', 'INSIDE', '1', 250, 260),
            ('ENSG_RIGHT_EDGE', 'RIGHT', '1', 300, 400),
            ('ENSG_AFTER', 'AFTER', '1', 301, 400)",
    )
    .await?;
    assert_eq!(
        gene_ids_in_region(&reader, "1", 200, 300).await?,
        ["ENSG_LEFT_EDGE", "ENSG_INSIDE", "ENSG_RIGHT_EDGE"]
    );
    Ok(())
}

#[tokio::test]
async fn includes_genes_containing_or_contained_by_the_region() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('ENSG_CONTAINING', 'OUTER', '1', 1, 1000),
            ('ENSG_CONTAINED', 'INNER', '1', 500, 510)",
    )
    .await?;
    assert_eq!(
        gene_ids_in_region(&reader, "1", 400, 600).await?,
        ["ENSG_CONTAINING", "ENSG_CONTAINED"]
    );
    assert_eq!(
        gene_ids_in_region(&reader, "1", 505, 505).await?,
        ["ENSG_CONTAINING", "ENSG_CONTAINED"]
    );
    Ok(())
}

#[tokio::test]
async fn isolates_chromosomes() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('ENSG_CHR1', 'ONE', '1', 100, 200),
            ('ENSG_CHR10', 'TEN', '10', 100, 200),
            ('ENSG_CHRX', 'X', 'X', 100, 200)",
    )
    .await?;
    assert_eq!(
        gene_ids_in_region(&reader, "1", 1, 1000).await?,
        ["ENSG_CHR1"]
    );
    assert_eq!(
        gene_ids_in_region(&reader, "X", 1, 1000).await?,
        ["ENSG_CHRX"]
    );
    let other_chromosome = gene_ids_in_region(&reader, "2", 1, 1000).await?;
    assert!(
        other_chromosome.is_empty(),
        "unexpected genes: {other_chromosome:?}"
    );
    Ok(())
}

#[tokio::test]
async fn orders_by_numeric_start_then_gene_id() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('ENSG_C', 'C', '1', 100, 200),
            ('ENSG_LATE', 'LATE', '1', 1000, 1100),
            ('ENSG_B', 'B', '1', 100, 150),
            ('ENSG_EARLY', 'EARLY', '1', 20, 120),
            ('ENSG_A', 'A', '1', 100, 300)",
    )
    .await?;
    assert_eq!(
        gene_ids_in_region(&reader, "1", 1, 2000).await?,
        ["ENSG_EARLY", "ENSG_A", "ENSG_B", "ENSG_C", "ENSG_LATE"]
    );
    Ok(())
}

#[tokio::test]
async fn returns_only_the_projected_gene_and_transcript_fields() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('ENSG_ONE', 'SYMBOL_ONE', '1', 100, 200)").await?;
    let interval = GenomicInterval::new("1", 150, 150).expect("valid interval");
    let genes = reader.fetch_genes_in_region(&interval).await?;
    let [gene] = genes.as_slice() else {
        panic!("expected one gene, found {}", genes.len());
    };
    assert_eq!(gene.gene_id, "ENSG_ONE");
    assert_eq!(gene.symbol, "SYMBOL_ONE");
    assert_eq!((gene.start, gene.stop), (100, 200));
    let [exon] = gene.exons.as_slice() else {
        panic!("expected one gene exon");
    };
    assert_eq!(exon.feature_type, "CDS");
    assert_eq!((exon.start, exon.stop), (100, 101));
    assert_eq!((exon.xstart, exon.xstop), (100, 101));

    let [first, second] = gene.transcripts.as_slice() else {
        panic!("expected two transcripts");
    };
    assert_eq!(first.transcript_id, "ENST_ENSG_ONE");
    assert_eq!((first.start, first.stop), (100, 200));
    assert_eq!(first.exons.len(), 1);
    assert_eq!(
        first.exons.first().map(|exon| exon.feature_type.as_str()),
        Some("UTR")
    );
    assert_eq!(
        first.exons.first().map(|exon| (exon.start, exon.stop)),
        Some((199, 200))
    );
    assert_eq!(second.transcript_id, "ENST2_ENSG_ONE");
    assert!(
        second.exons.is_empty(),
        "unexpected exons: {:?}",
        second.exons
    );
    Ok(())
}

#[tokio::test]
async fn preserves_genes_without_exons_or_transcripts() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('ENSG_NO_MODELS', 'EMPTY', '1', 100, 200)").await?;
    let interval = GenomicInterval::new("1", 100, 200).expect("valid interval");
    let genes: Vec<RegionGene> = reader.fetch_genes_in_region(&interval).await?;
    let [gene] = genes.as_slice() else {
        panic!("expected one gene, found {}", genes.len());
    };
    assert!(gene.exons.is_empty(), "unexpected exons: {:?}", gene.exons);
    assert!(
        gene.transcripts.is_empty(),
        "unexpected transcripts: {:?}",
        gene.transcripts
    );
    Ok(())
}

#[tokio::test]
async fn reports_decode_errors_with_the_requested_interval() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('ENSG_ONE', CAST(NULL AS VARCHAR), '1', 100, 200)")
            .await?;
    let interval = GenomicInterval::new("1", 100, 200).expect("valid interval");
    let error = reader
        .fetch_genes_in_region(&interval)
        .await
        .expect_err("missing required symbol must fail decoding");
    assert!(error.to_string().contains("Failed to decode gene results"));
    assert!(error.to_string().contains("100"));
    Ok(())
}

#[tokio::test]
async fn query_failure_is_not_reported_as_an_empty_region() {
    let reader = GeneReader::new(SessionContext::new());
    let interval = GenomicInterval::new("1", 100, 200).expect("valid interval");
    assert!(reader.fetch_genes_in_region(&interval).await.is_err());
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
async fn reads_nested_genes_from_the_real_export() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let interval = GenomicInterval::new("22", 37_010_956, 37_018_807).expect("valid interval");
    let genes = reader.fetch_genes_in_region(&interval).await?;
    assert_eq!(
        genes
            .iter()
            .map(|gene| gene.symbol.as_str())
            .collect::<Vec<_>>(),
        ["TST", "Y_RNA"]
    );
    let tst = genes.first().expect("TST fixture should exist");
    assert_eq!(tst.gene_id, "ENSG00000128311");
    assert!(!tst.exons.is_empty(), "Require exported gene exons");
    assert!(
        tst.transcripts
            .iter()
            .all(|transcript| !transcript.transcript_id.is_empty() && !transcript.exons.is_empty()),
        "Require exported transcript exons"
    );
    Ok(())
}

#[tokio::test]
async fn excludes_nested_genes_outside_a_narrow_real_region() -> Result<()> {
    let reader = create_parquet_reader().await?;
    assert_eq!(
        gene_ids_in_region(&reader, "22", 37_010_956, 37_010_958).await?,
        ["ENSG00000128311"]
    );
    let other_chromosome = gene_ids_in_region(&reader, "21", 37_010_956, 37_018_807).await?;
    assert!(
        other_chromosome.is_empty(),
        "unexpected genes: {other_chromosome:?}"
    );
    Ok(())
}
