use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};

use crate::{Chromosome, GenomicInterval, pad_and_merge_intervals};

/// Matches the padding the Elasticsearch gene and transcript variant queries apply.
const EXON_PADDING: u32 = 75;

#[derive(Clone, Copy)]
pub enum VariantAnnotationFilter<'a> {
    Gene(&'a str),
    Transcript(&'a str),
}

pub struct PaddedExonIntervals {
    pub chromosome: Chromosome,
    pub intervals: Vec<GenomicInterval>,
}

pub struct ExonQuery<'a> {
    pub annotation_field: &'static str,
    pub annotation_id: &'a str,
    pub padded_exons: PaddedExonIntervals,
}

impl<'a> ExonQuery<'a> {
    /// Return `None` when there are no exon intervals.
    ///
    /// # Errors
    /// Returns an error for an empty annotation ID, padding overflow, or intervals on more than one
    /// chromosome.
    pub fn prepare(
        annotation_filter: VariantAnnotationFilter<'a>,
        intervals: &[GenomicInterval],
    ) -> Result<Option<Self>> {
        let (annotation_field, annotation_id) = match annotation_filter {
            VariantAnnotationFilter::Gene(id) => ("gene_id", id),
            VariantAnnotationFilter::Transcript(id) => ("transcript_id", id),
        };
        if annotation_id.trim().is_empty() {
            return Err(DataFusionError::Plan(format!(
                "{annotation_field} must not be empty"
            )));
        }

        let padded_exons = PaddedExonIntervals::prepare(intervals, annotation_id)?;
        Ok(padded_exons.map(|padded_exons| Self {
            annotation_field,
            annotation_id,
            padded_exons,
        }))
    }
}

impl PaddedExonIntervals {
    /// Return `None` when there are no exon intervals. `description` names the exons in errors.
    ///
    /// # Errors
    /// Returns an error for padding overflow or intervals on more than one chromosome.
    pub fn prepare(intervals: &[GenomicInterval], description: &str) -> Result<Option<Self>> {
        let padded_intervals =
            pad_and_merge_intervals(intervals, EXON_PADDING).map_err(|error| {
                DataFusionError::Plan(format!(
                    "Invalid padded exon intervals for {description}: {error}"
                ))
            })?;
        let Some(chromosome) = padded_intervals.first().map(GenomicInterval::chromosome) else {
            return Ok(None);
        };
        if padded_intervals
            .iter()
            .any(|interval| interval.chromosome() != chromosome)
        {
            return Err(DataFusionError::Plan(format!(
                "Exon intervals for {description} span more than one chromosome"
            )));
        }

        Ok(Some(Self {
            chromosome,
            intervals: padded_intervals,
        }))
    }

    pub fn bind_position_predicate(&self, parameters: &mut Vec<ScalarValue>) -> String {
        let mut position_predicates = Vec::with_capacity(self.intervals.len());
        for interval in &self.intervals {
            let start = bind_parameter(parameters, ScalarValue::Int32(Some(interval.start())));
            let stop = bind_parameter(parameters, ScalarValue::Int32(Some(interval.stop())));
            position_predicates.push(format!("pos BETWEEN {start} AND {stop}"));
        }
        position_predicates.join(" OR ")
    }
}

pub fn bind_parameter(parameters: &mut Vec<ScalarValue>, value: ScalarValue) -> String {
    parameters.push(value);
    format!("${}", parameters.len())
}
