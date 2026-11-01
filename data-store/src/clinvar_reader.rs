use crate::{
    ClinvarVariant, ClinvarVariantListEntry, GenomicInterval, ParquetDataset,
    pad_and_merge_intervals,
};
use datafusion::common::ScalarValue;
use datafusion::error::DataFusionError;
use datafusion::prelude::SessionContext;

const CLINVAR_LIST_ENTRY_FIELDS: &str = r#"
    variant_id,
    reference_genome,
    CASE
        WHEN starts_with("locus.contig", 'chr')
        THEN substr("locus.contig", 4)
        ELSE "locus.contig"
    END AS chromosome,
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
"#;

const CLINVAR_EXON_PADDING: u32 = 75;

#[derive(Clone, Copy)]
enum ClinvarAnnotationFilter<'a> {
    Gene(&'a str),
    Transcript(&'a str),
}

pub struct ClinvarReader {
    context: SessionContext,
}

fn bind_parameter(parameters: &mut Vec<ScalarValue>, value: ScalarValue) -> String {
    parameters.push(value);
    format!("${}", parameters.len())
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
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
        let dataframe = self
            .context
            .sql(&format!(
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
                FROM {table_name}
                WHERE variant_id = $1
                "#,
            ))
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

    /// Apply 75-base padding to the supplied, unpadded intervals.
    ///
    /// # Errors
    /// Returns an error for an empty gene ID, padding overflow, query failure,
    /// or result decoding failure.
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        self.fetch_variants_in_exons(ClinvarAnnotationFilter::Gene(gene_id), intervals)
            .await
    }

    /// Apply 75-base padding to the supplied, unpadded intervals.
    ///
    /// # Errors
    /// Returns an error for an empty transcript ID, padding overflow, query failure,
    /// or result decoding failure.
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        self.fetch_variants_in_exons(
            ClinvarAnnotationFilter::Transcript(transcript_id),
            intervals,
        )
        .await
    }

    async fn fetch_variants_in_exons(
        &self,
        annotation_filter: ClinvarAnnotationFilter<'_>,
        intervals: &[GenomicInterval],
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        let (annotation_field, annotation_id) = match annotation_filter {
            ClinvarAnnotationFilter::Gene(id) => ("gene_id", id),
            ClinvarAnnotationFilter::Transcript(id) => ("transcript_id", id),
        };
        if annotation_id.trim().is_empty() {
            return Err(DataFusionError::Plan(format!(
                "{annotation_field} must not be empty"
            )));
        }

        let intervals =
            pad_and_merge_intervals(intervals, CLINVAR_EXON_PADDING).map_err(|error| {
                DataFusionError::Plan(format!(
                    "Invalid padded exon intervals for {annotation_id}: {error:?}"
                ))
            })?;
        if intervals.is_empty() {
            return Ok(Vec::new());
        }

        let mut parameters = Vec::new();
        let annotation_parameter = bind_parameter(
            &mut parameters,
            ScalarValue::Utf8(Some(annotation_id.to_owned())),
        );
        let mut interval_predicates = Vec::with_capacity(intervals.len());
        for interval in &intervals {
            let contig = bind_parameter(
                &mut parameters,
                ScalarValue::Utf8(Some(format!("chr{}", interval.chromosome().as_str()))),
            );
            let start = bind_parameter(&mut parameters, ScalarValue::Int32(Some(interval.start())));
            let stop = bind_parameter(&mut parameters, ScalarValue::Int32(Some(interval.stop())));
            interval_predicates.push(format!(
                r#"("locus.contig" = {contig} AND pos BETWEEN {start} AND {stop})"#
            ));
        }
        let interval_predicate = interval_predicates.join(" OR ");
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
                WHERE {interval_predicate}
            )
            SELECT * FROM candidates
            WHERE transcript_consequence IS NOT NULL
            ORDER BY position, variant_id
            "
        );
        let dataframe = self.context.sql(&query).await?;
        let batches = dataframe.with_param_values(parameters)?.collect().await?;
        let mut variants = Vec::new();
        for batch in &batches {
            let batch_variants: Vec<ClinvarVariantListEntry> = serde_arrow::from_record_batch(batch)
                .map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode ClinVar results for {annotation_field}={annotation_id}: {error}"
                    ))
                })?;
            variants.extend(batch_variants);
        }
        Ok(variants)
    }

    /// # Errors
    /// Returns an error if query execution or list-entry decoding fails.
    pub async fn fetch_variants_in_region(
        &self,
        interval: &GenomicInterval,
    ) -> datafusion::error::Result<Vec<ClinvarVariantListEntry>> {
        let contig = format!("chr{}", interval.chromosome().as_str());
        let table_name = ParquetDataset::ClinvarVariantsGrch38.name();

        let query = format!(
            r#"
            SELECT {CLINVAR_LIST_ENTRY_FIELDS},
                array_first(
                    transcript_consequences,
                    consequence -> starts_with(consequence['gene_id'], 'ENSG')
                ) AS transcript_consequence
            FROM {table_name}
            WHERE "locus.contig" = $1
              AND pos BETWEEN $2 AND $3
            ORDER BY pos, variant_id
            "#
        );
        let dataframe = self.context.sql(&query).await?;

        let dataframe = dataframe.with_param_values(vec![
            ScalarValue::Utf8(Some(contig)),
            ScalarValue::Int32(Some(interval.start())),
            ScalarValue::Int32(Some(interval.stop())),
        ])?;

        let batches = dataframe.collect().await?;

        let mut variants = Vec::new();

        for batch in &batches {
            let batch_variants: Vec<ClinvarVariantListEntry> =
                serde_arrow::from_record_batch(batch).map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode ClinVar results for {interval:?}: {error}"
                    ))
                })?;

            variants.extend(batch_variants);
        }

        Ok(variants)
    }
}
