use std::path::Path;

use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;

use crate::{
    GenomicInterval, GnomadV4VariantListEntry, ParquetDataset,
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
