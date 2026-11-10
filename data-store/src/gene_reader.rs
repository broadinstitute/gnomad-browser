use datafusion::common::ScalarValue;
use datafusion::error::Result;
use datafusion::prelude::SessionContext;

use crate::record_batch_decoding::{at_most_one, decode_record_batches};
use crate::{Gene, GeneIndex, GeneIndexRow, ParquetDataset};

pub struct GeneReader {
    context: SessionContext,
}

impl GeneReader {
    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// Read every gene's identifiers and names; only these light columns are scanned.
    ///
    /// # Errors
    /// Return an error if querying or decoding fails.
    pub async fn load_gene_index(&self) -> Result<GeneIndex> {
        let table_name = ParquetDataset::GeneModelsGrch38.name();
        let batches = self
            .context
            .sql(&format!(
                "SELECT gene_id, gene_version, symbol, symbol_upper_case, search_terms
                FROM {table_name}"
            ))
            .await?
            .collect()
            .await?;

        let rows: Vec<GeneIndexRow> =
            decode_record_batches(&batches, format_args!("gene index rows"))?;
        Ok(GeneIndex::new(rows))
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
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(vec![ScalarValue::Utf8(Some(gene_id.to_owned()))])?
            .collect()
            .await?;

        let genes: Vec<Gene> =
            decode_record_batches(&batches, format_args!("gene result for {gene_id}"))?;

        at_most_one(genes, || {
            format!("Multiple gene records found for gene ID: {gene_id}")
        })
    }
}
