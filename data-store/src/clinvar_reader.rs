use crate::record_batch_decoding::{at_most_one, decode_record_batches};
use crate::{ClinvarVariant, ParquetDataset};
use datafusion::common::ScalarValue;
use datafusion::prelude::SessionContext;

pub struct ClinvarReader {
    context: SessionContext,
}

fn parse_chromosome_and_position(variant_id: &str) -> Option<(&str, i32)> {
    let mut parts = variant_id.splitn(3, '-');
    let chromosome = parts.next()?;
    let position = parts.next()?.parse().ok()?;
    Some((chromosome, position))
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
        let Some((chromosome, position)) = parse_chromosome_and_position(variant_id) else {
            return Ok(None);
        };
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let dataframe = self
            .context
            .sql(&format!(
                r#"
                SELECT
                    variant_id,
                    chrom AS chromosome,
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
                FROM {table_name}
                WHERE variant_id = $1
                  AND chrom = $2
                  AND pos = $3
                "#,
            ))
            .await?;

        let batches = dataframe
            .with_param_values(vec![
                ScalarValue::Utf8(Some(variant_id.to_owned())),
                ScalarValue::Utf8(Some(chromosome.to_owned())),
                ScalarValue::Int32(Some(position)),
            ])?
            .collect()
            .await?;

        let variants: Vec<ClinvarVariant> =
            decode_record_batches(&batches, format_args!("ClinVar result for {variant_id}"))?;

        at_most_one(variants, || {
            format!("Multiple ClinVar records found for variant ID: {variant_id}")
        })
    }
}
