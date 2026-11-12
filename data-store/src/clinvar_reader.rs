use crate::record_batch_decoding::{at_most_one, decode_record_batches};
use crate::{ClinvarVariant, ParquetDataset};
use datafusion::common::ScalarValue;
use datafusion::error::DataFusionError;
use datafusion::prelude::SessionContext;

pub struct ClinvarReader {
    context: SessionContext,
}

/// Accept the `chrom-pos-ref-alt` form the API's `normalizeVariantId` produces, which keeps `MT`
/// and allows position 0.
fn parse_variant_id(variant_id: &str) -> datafusion::error::Result<(&str, i32)> {
    let invalid = || {
        DataFusionError::Plan(format!(
            "Invalid ClinVar variant ID {variant_id:?}: expected chrom-pos-ref-alt"
        ))
    };
    let mut parts = variant_id.split('-');
    let (Some(chromosome), Some(position), Some(reference), Some(alternate), None) = (
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
    ) else {
        return Err(invalid());
    };
    let is_digits = |text: &str| !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit());
    let is_allele =
        |allele: &str| !allele.is_empty() && allele.bytes().all(|byte| b"ACGTN".contains(&byte));
    let is_chromosome = matches!(chromosome, "X" | "Y" | "M" | "MT")
        || (is_digits(chromosome)
            && chromosome
                .parse::<u8>()
                .is_ok_and(|number| (1..=22).contains(&number)));
    let position = is_digits(position)
        .then(|| position.parse::<i32>().ok())
        .flatten();
    match position {
        Some(position) if is_chromosome && is_allele(reference) && is_allele(alternate) => {
            Ok((chromosome, position))
        }
        _ => Err(invalid()),
    }
}

impl ClinvarReader {
    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// Return `None` for a well-formed ID that is not in `ClinVar`.
    ///
    /// # Errors
    /// Returns an error for an ID not in `chrom-pos-ref-alt` form, if query execution or result
    /// decoding fails, or if multiple records match.
    pub async fn fetch_single_variant(
        &self,
        variant_id: &str,
    ) -> datafusion::error::Result<Option<ClinvarVariant>> {
        let (chromosome, position) = parse_variant_id(variant_id)?;
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
