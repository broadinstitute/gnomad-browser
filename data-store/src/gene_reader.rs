use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;

use crate::{Gene, ParquetDataset};

pub struct GeneReader {
    context: SessionContext,
}

impl GeneReader {
    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// # Errors
    /// Return an error if querying or decoding fails, or multiple records match the ID.
    pub async fn fetch_gene_by_id(&self, gene_id: &str) -> Result<Option<Gene>> {
        let table_name = ParquetDataset::GeneModelsGrch38.name();
        // The Spark export encodes missing annotations as structs with null fields.
        let query = format!(
            r#"
            SELECT
                gene_id, gene_version, symbol, gencode_symbol, reference_genome,
                chrom, strand, start, stop, xstart, xstop, "interval",
                exons, transcripts, hgnc_id, ncbi_id, omim_id, name, flags,
                canonical_transcript_id, previous_symbols, alias_symbols,
                symbol_upper_case, search_terms, preferred_transcript_id,
                preferred_transcript_source,
                CASE
                    WHEN mane_select_transcript.ensembl_id IS NULL THEN NULL
                    ELSE mane_select_transcript
                END AS mane_select_transcript,
                CASE
                    WHEN pext.regions IS NULL THEN NULL
                    ELSE pext
                END AS pext,
                CASE
                    WHEN gnomad_constraint.gene_id IS NULL THEN NULL
                    ELSE gnomad_constraint
                END AS gnomad_constraint
            FROM {table_name}
            WHERE gene_id = $1
            LIMIT 2
            "#
        );
        let dataframe = self.context.sql(&query).await?;
        let batches = dataframe
            .with_param_values(vec![ScalarValue::Utf8(Some(gene_id.to_owned()))])?
            .collect()
            .await?;

        let mut genes = Vec::new();
        for batch in &batches {
            let batch_genes: Vec<Gene> =
                serde_arrow::from_record_batch(batch).map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode gene result for {gene_id}: {error}"
                    ))
                })?;
            genes.extend(batch_genes);
        }

        let mut genes = genes.into_iter();
        let gene = genes.next();
        if genes.next().is_some() {
            return Err(DataFusionError::Execution(format!(
                "Multiple gene records found for gene ID: {gene_id}"
            )));
        }
        Ok(gene)
    }
}
