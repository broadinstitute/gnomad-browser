use crate::exon_query::{ExonQuery, VariantAnnotationFilter, bind_parameter};
use crate::position_bin::{bind_position_bins, position_bin};
use crate::record_batch_decoding::{at_most_one, decode_record_batches};
use crate::variant_id::parse_variant_id;
use crate::{ClinvarVariant, ClinvarVariantListEntry, GenomicInterval, ParquetDataset};
use datafusion::common::ScalarValue;
use datafusion::prelude::SessionContext;

const CLINVAR_LIST_ENTRY_FIELDS: &str = r"
    concat(chrom, '-', CAST(pos AS VARCHAR), '-', ref, '-', alt) AS variant_id,
    reference_genome,
    chrom AS chromosome,
    pos AS position,
    ref AS reference_allele,
    alt AS alternate_allele,
    clinvar_variation_id,
    clinical_significance,
    review_status,
    gold_stars,
    in_gnomad,
    named_struct(
        'exome',
        CASE
            WHEN gnomad.exome.ac IS NULL THEN NULL
            ELSE named_struct(
                'ac', gnomad.exome.ac,
                'an', gnomad.exome.an,
                'filters', gnomad.exome.filters
            )
        END,
        'genome',
        CASE
            WHEN gnomad.genome.ac IS NULL THEN NULL
            ELSE named_struct(
                'ac', gnomad.genome.ac,
                'an', gnomad.genome.an,
                'filters', gnomad.genome.filters
            )
        END
    ) AS gnomad
";

pub struct ClinvarReader {
    context: SessionContext,
}

/// Bind `$1` chromosome, `$2` start, `$3` stop and the interval's bins; return the bin parameters.
fn bind_region_parameters(interval: &GenomicInterval, parameters: &mut Vec<ScalarValue>) -> String {
    parameters.extend([
        ScalarValue::Utf8(Some(interval.chromosome().as_str().to_owned())),
        ScalarValue::Int32(Some(interval.start())),
        ScalarValue::Int32(Some(interval.stop())),
    ]);
    bind_position_bins(std::slice::from_ref(interval), parameters)
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
        let parsed = parse_variant_id(variant_id, "ClinVar")?;
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let dataframe = self
            .context
            .sql(&format!(
                "
                SELECT {CLINVAR_LIST_ENTRY_FIELDS}, last_evaluated, rsid, submissions
                FROM {table_name}
                WHERE chrom = $1
                  AND posbin = $2
                  AND pos = $3
                  AND ref = $4
                  AND alt = $5
                ",
            ))
            .await?;

        let batches = dataframe
            .with_param_values(vec![
                ScalarValue::Utf8(Some(parsed.chromosome.to_owned())),
                ScalarValue::Utf8(Some(position_bin(parsed.position).to_string())),
                ScalarValue::Int32(Some(parsed.position)),
                ScalarValue::Utf8(Some(parsed.reference_allele.to_owned())),
                ScalarValue::Utf8(Some(parsed.alternate_allele.to_owned())),
            ])?
            .collect()
            .await?;

        let variants: Vec<ClinvarVariant> =
            decode_record_batches(&batches, format_args!("ClinVar result for {variant_id}"))?;

        at_most_one(variants, || {
            format!("Multiple ClinVar records found for variant ID: {variant_id}")
        })
    }

    /// Pad `intervals` by 75 bases; pass them unpadded.
    ///
    /// # Errors
    /// Returns an error for an empty gene ID, intervals on more than one chromosome,
    /// padding overflow, query failure, or result decoding failure.
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        self.fetch_variants_in_exons(VariantAnnotationFilter::Gene(gene_id), intervals)
            .await
    }

    /// Pad `intervals` by 75 bases; pass them unpadded.
    ///
    /// # Errors
    /// Returns an error for an empty transcript ID, intervals on more than one chromosome,
    /// padding overflow, query failure, or result decoding failure.
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        self.fetch_variants_in_exons(
            VariantAnnotationFilter::Transcript(transcript_id),
            intervals,
        )
        .await
    }

    async fn fetch_variants_in_exons(
        &self,
        annotation_filter: VariantAnnotationFilter<'_>,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        let Some(exon_query) = ExonQuery::prepare(annotation_filter, intervals)? else {
            return Ok(Vec::new());
        };
        let annotation_field = exon_query.annotation_field;
        let annotation_id = exon_query.annotation_id;

        let mut parameters = Vec::new();
        let annotation_parameter = bind_parameter(
            &mut parameters,
            ScalarValue::Utf8(Some(annotation_id.to_owned())),
        );
        let chromosome_parameter = bind_parameter(
            &mut parameters,
            ScalarValue::Utf8(Some(exon_query.padded_exons.chromosome.as_str().to_owned())),
        );
        let bin_parameters =
            bind_position_bins(&exon_query.padded_exons.intervals, &mut parameters);
        let position_predicate = exon_query
            .padded_exons
            .bind_position_predicate(&mut parameters);
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let query = format!(
            r"
            WITH candidates AS (
                SELECT {CLINVAR_LIST_ENTRY_FIELDS},
                    array_first(
                        transcript_consequences,
                        consequence -> consequence['{annotation_field}'] = {annotation_parameter}
                    ) AS transcript_consequence
                FROM {table_name}
                WHERE chrom = {chromosome_parameter}
                  AND posbin IN ({bin_parameters})
                  AND ({position_predicate})
            )
            SELECT * FROM candidates
            WHERE transcript_consequence IS NOT NULL
            ORDER BY position, variant_id
            "
        );
        let dataframe = self.context.sql(&query).await?;
        let batches = dataframe.with_param_values(parameters)?.collect().await?;
        decode_record_batches(
            &batches,
            format_args!("ClinVar results for {annotation_field}={annotation_id}"),
        )
    }

    /// # Errors
    /// Returns an error if query execution fails.
    pub async fn count_variants_in_region(
        &self,
        interval: &GenomicInterval,
    ) -> datafusion::error::Result<usize> {
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let mut parameters = Vec::new();
        let bin_parameters = bind_region_parameters(interval, &mut parameters);
        self.context
            .sql(&format!(
                "
                SELECT pos
                FROM {table_name}
                WHERE chrom = $1
                  AND posbin IN ({bin_parameters})
                  AND pos BETWEEN $2 AND $3
                "
            ))
            .await?
            .with_param_values(parameters)?
            .count()
            .await
    }

    /// Return at most `limit` variants, ordered by position then variant ID.
    ///
    /// # Errors
    /// Returns an error if query execution or list-entry decoding fails.
    pub async fn fetch_variants_in_region(
        &self,
        interval: &GenomicInterval,
        limit: usize,
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let mut parameters = Vec::new();
        let bin_parameters = bind_region_parameters(interval, &mut parameters);
        let query = format!(
            r"
            SELECT {CLINVAR_LIST_ENTRY_FIELDS},
                array_first(
                    transcript_consequences,
                    consequence -> starts_with(consequence['gene_id'], 'ENSG')
                ) AS transcript_consequence
            FROM {table_name}
            WHERE chrom = $1
              AND posbin IN ({bin_parameters})
              AND pos BETWEEN $2 AND $3
            ORDER BY pos, ref, alt
            "
        );
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(parameters)?
            .limit(0, Some(limit))?
            .collect()
            .await?;

        decode_record_batches(&batches, format_args!("ClinVar results for {interval:?}"))
    }
}
