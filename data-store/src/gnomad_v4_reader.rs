use std::path::Path;

use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;

use crate::{
    GenomicInterval, GnomadV4Variant, GnomadV4VariantListEntry, ParquetDataset,
    create_datafusion_context_from_root, pad_and_merge_intervals,
};

const GNOMAD_V4_EXON_PADDING: u32 = 75;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GnomadV4Subset {
    All,
    NonUkb,
}

impl GnomadV4Subset {
    const fn frequency_field(self) -> &'static str {
        match self {
            Self::All => "all",
            Self::NonUkb => "non_ukb",
        }
    }
}

#[derive(Clone, Copy)]
enum GnomadV4AnnotationFilter<'a> {
    Gene(&'a str),
    Transcript(&'a str),
}

pub struct GnomadV4Reader {
    context: SessionContext,
}

impl GnomadV4Reader {
    /// # Errors
    /// Return an error if the dataset cannot be registered.
    pub async fn open(root: impl AsRef<Path>) -> Result<Self> {
        let context =
            create_datafusion_context_from_root(root, ParquetDataset::GnomadVariantsV4).await?;
        Ok(Self::new(context))
    }

    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// Return all source frequency subsets; leave subset filtering and API shaping to the caller.
    ///
    /// # Errors
    /// Return an error for an invalid ID, multiple matches, or query/decoding failure.
    pub async fn fetch_single_variant(&self, variant_id: &str) -> Result<Option<GnomadV4Variant>> {
        let mut parameters = vec![ScalarValue::Utf8(Some(variant_id.to_owned()))];
        let predicate = bind_single_variant_lookup(variant_id, &mut parameters)?;
        let table_name = ParquetDataset::GnomadVariantsV4.name();
        let query = format!(
            "SELECT variant_id, locus, alleles, rsids,
                named_struct(
                    'freq', exome.freq, 'filters', exome.filters, 'flags', exome.flags,
                    'fafmax', exome.fafmax, 'faf95', exome.faf95, 'faf99', exome.faf99,
                    'age_distribution', exome.age_distribution,
                    'quality_metrics', exome.quality_metrics
                ) AS exome,
                named_struct(
                    'freq', genome.freq, 'filters', genome.filters, 'flags', genome.flags,
                    'fafmax', genome.fafmax, 'faf95', genome.faf95, 'faf99', genome.faf99,
                    'age_distribution', genome.age_distribution,
                    'quality_metrics', genome.quality_metrics
                ) AS genome,
                named_struct(
                    'freq', joint.freq, 'fafmax', joint.fafmax, 'flags', joint.flags,
                    'freq_comparison_stats', joint.freq_comparison_stats
                ) AS joint,
                transcript_consequences, in_silico_predictors, colocated_variants,
                coverage, caid, vrs
             FROM {table_name} WHERE {predicate} LIMIT 2"
        );
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(parameters)?
            .collect()
            .await?;
        let mut variants = Vec::new();
        for batch in &batches {
            let decoded: Vec<GnomadV4Variant> =
                serde_arrow::from_record_batch(batch).map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode gnomAD v4 result for {variant_id}: {error}"
                    ))
                })?;
            variants.extend(decoded);
        }
        let mut variants = variants.into_iter();
        let variant = variants.next();
        if variants.next().is_some() {
            return Err(DataFusionError::Execution(format!(
                "Multiple gnomAD v4 records found for variant ID: {variant_id}"
            )));
        }
        Ok(variant)
    }

    /// Apply 75-base padding to unpadded CDS/exon intervals; leave frequency filtering to the API.
    ///
    /// # Errors
    /// Return an error for an empty ID, padding overflow, or query/decoding failure.
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        self.fetch_variants_in_exons(GnomadV4AnnotationFilter::Gene(gene_id), intervals, subset)
            .await
    }

    /// Apply 75-base padding to unpadded CDS/exon intervals; leave frequency filtering to the API.
    ///
    /// # Errors
    /// Return an error for an empty ID, padding overflow, or query/decoding failure.
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        self.fetch_variants_in_exons(
            GnomadV4AnnotationFilter::Transcript(transcript_id),
            intervals,
            subset,
        )
        .await
    }

    async fn fetch_variants_in_exons(
        &self,
        annotation_filter: GnomadV4AnnotationFilter<'_>,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        let (annotation_field, annotation_id) = match annotation_filter {
            GnomadV4AnnotationFilter::Gene(id) => ("gene_id", id),
            GnomadV4AnnotationFilter::Transcript(id) => ("transcript_id", id),
        };
        if annotation_id.trim().is_empty() {
            return Err(DataFusionError::Plan(format!(
                "{annotation_field} must not be empty"
            )));
        }
        let intervals = pad_and_merge_intervals(intervals, GNOMAD_V4_EXON_PADDING)
            .map_err(|error| DataFusionError::Plan(format!("Invalid exon intervals: {error:?}")))?;
        if intervals.is_empty() {
            return Ok(Vec::new());
        }
        let mut parameters = vec![ScalarValue::Utf8(Some(annotation_id.to_owned()))];
        let interval_predicate = Self::bind_intervals(&intervals, &mut parameters);
        let table_name = ParquetDataset::GnomadVariantsV4.name();
        let fields = select_list_entry_fields(subset);
        let query = format!(
            r"
            SELECT {fields}
            FROM {table_name}
            WHERE ({interval_predicate})
              AND array_first(
                  transcript_consequences,
                  consequence -> consequence['{annotation_field}'] = $1
              ) IS NOT NULL
            ORDER BY locus['position'], variant_id
            "
        );
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(parameters)?
            .collect()
            .await?;
        let mut variants = Vec::new();
        for batch in &batches {
            let batch_variants: Vec<GnomadV4VariantListEntry> =
                serde_arrow::from_record_batch(batch).map_err(|error| {
                    DataFusionError::Execution(format!(
                        "Failed to decode gnomAD v4 results for {annotation_field}={annotation_id}: {error}"
                    ))
                })?;
            variants.extend(batch_variants);
        }
        Ok(variants)
    }

    fn bind_intervals(intervals: &[GenomicInterval], parameters: &mut Vec<ScalarValue>) -> String {
        let mut predicates = Vec::with_capacity(intervals.len());
        for interval in intervals {
            let chromosome = interval.chromosome();
            let contig = bind_parameter(
                parameters,
                ScalarValue::Utf8(Some(format!("chr{}", chromosome.as_str()))),
            );
            let start = bind_parameter(parameters, ScalarValue::Int32(Some(interval.start())));
            let stop = bind_parameter(parameters, ScalarValue::Int32(Some(interval.stop())));
            predicates.push(format!(
                r#"("locus.contig" = {contig} AND locus['contig'] = {contig} AND locus['position'] BETWEEN {start} AND {stop})"#
            ));
        }
        predicates.join(" OR ")
    }
}

fn bind_single_variant_lookup(id: &str, parameters: &mut Vec<ScalarValue>) -> Result<String> {
    if let Some(number) = id.strip_prefix("rs")
        && !number.is_empty()
        && number.bytes().all(|byte| byte.is_ascii_digit())
    {
        return Ok("array_has(rsids, $1)".to_owned());
    }
    if let Some(allele_id) = id.strip_prefix("ga4gh:")
        && !allele_id.is_empty()
        && !allele_id.chars().any(char::is_whitespace)
    {
        return Ok("vrs['alt']['allele_id'] = $1".to_owned());
    }
    let parts: Vec<_> = id.split('-').collect();
    if let [chromosome, position, reference, alternate] = parts.as_slice() {
        let position = position.parse::<i32>().ok();
        let valid_alleles = [reference, alternate].iter().all(|allele| {
            !allele.is_empty() && allele.bytes().all(|byte| b"ACGTN".contains(&byte))
        });
        if let Some(position) = position
            && valid_alleles
            && GenomicInterval::new(chromosome, position, position).is_ok()
        {
            let contig = bind_parameter(
                parameters,
                ScalarValue::Utf8(Some(format!("chr{chromosome}"))),
            );
            let position = bind_parameter(parameters, ScalarValue::Int32(Some(position)));
            return Ok(format!(
                r#"variant_id = $1 AND "locus.contig" = {contig} AND locus['contig'] = {contig} AND locus['position'] = {position}"#
            ));
        }
    }
    Err(DataFusionError::Plan(format!(
        "Invalid gnomAD v4 variant ID: {id}"
    )))
}

fn bind_parameter(parameters: &mut Vec<ScalarValue>, value: ScalarValue) -> String {
    parameters.push(value);
    format!("${}", parameters.len())
}

fn select_list_entry_fields(subset: GnomadV4Subset) -> String {
    let exome_subset = subset.frequency_field();
    // This export omits variant-level flags and joint filters; do not infer empty lists.
    format!(
        r"
        variant_id,
        locus,
        alleles,
        rsids,
        CAST(NULL AS VARCHAR[]) AS flags,
        named_struct(
            'freq', named_struct('{exome_subset}', exome.freq.{exome_subset}),
            'filters', exome.filters,
            'flags', exome.flags,
            'fafmax', exome.fafmax
        ) AS exome,
        named_struct(
            'freq', named_struct('all', genome.freq.all),
            'filters', genome.filters,
            'flags', genome.flags
        ) AS genome,
        named_struct(
            'freq', named_struct('all', joint.freq.all),
            'filters', CAST(NULL AS VARCHAR[]),
            'fafmax', joint.fafmax
        ) AS joint,
        transcript_consequences,
        in_silico_predictors
        "
    )
}
