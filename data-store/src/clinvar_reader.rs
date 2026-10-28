use crate::ClinvarVariant;
use datafusion::common::ScalarValue;
use datafusion::error::DataFusionError;
use datafusion::prelude::SessionContext;

pub struct ClinvarReader {
    context: SessionContext,
}

impl ClinvarReader {
    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// # Errors
    /// Returns an error if query execution or result decoding fails, or multiple records match.
    pub async fn fetch_single_variant(
        &self,
        variant_id: &str,
    ) -> datafusion::error::Result<Option<ClinvarVariant>> {
        let dataframe = self
            .context
            .sql(
                r#"
                SELECT
                    variant_id,
                    CASE
                        WHEN starts_with("locus.contig", 'chr')
                        THEN substr("locus.contig", 4)
                        ELSE "locus.contig"
                    END AS chromosome,
                    pos AS position,
                    ref AS reference_allele,
                    alt AS alternate_allele,
                    reference_genome,
                    clinvar_variation_id,
                    clinical_significance,
                    review_status,
                    gold_stars,
                    in_gnomad,
                    last_evaluated,
                    rsid,
                    submissions,
                    named_struct(
                        'exome',
                        CASE
                            WHEN "gnomad.exome.ac" IS NULL THEN NULL
                            ELSE named_struct(
                                'ac', "gnomad.exome.ac",
                                'an', "gnomad.exome.an",
                                'filters', "gnomad.exome.filters"
                            )
                        END,
                        'genome',
                        CASE
                            WHEN "gnomad.genome.ac" IS NULL THEN NULL
                            ELSE named_struct(
                                'ac', "gnomad.genome.ac",
                                'an', "gnomad.genome.an",
                                'filters', "gnomad.genome.filters"
                            )
                        END
                    ) AS gnomad
                FROM clinvar_grch38_variants
                WHERE variant_id = $1
                "#,
            )
            .await?;

        let dataframe =
            dataframe.with_param_values(vec![ScalarValue::Utf8(Some(variant_id.to_owned()))])?;

        let batches = dataframe.collect().await?;

        let mut variants = Vec::new();

        for batch in &batches {
            let batch_variants: Vec<ClinvarVariant> = serde_arrow::from_record_batch(batch)
                .map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode ClinVar result for {variant_id}: {error}"
                    ))
                })?;

            variants.extend(batch_variants);
        }

        let mut variants = variants.into_iter();
        let variant = variants.next();

        if variants.next().is_some() {
            return Err(DataFusionError::Execution(format!(
                "Multiple ClinVar records found for variant ID: {variant_id}"
            )));
        }

        Ok(variant)
    }
}
