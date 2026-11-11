use std::collections::BTreeSet;

use datafusion::common::ScalarValue;
use datafusion::error::Result;
use datafusion::prelude::SessionContext;

use crate::exon_query::{ExonQuery, VariantAnnotationFilter, bind_parameter};
use crate::record_batch_decoding::decode_record_batches;
use crate::{GenomicInterval, GnomadV4VariantListEntry, ParquetDataset};

/// Directory `posbin=b` holds positions `b * POSITION_BIN_SIZE + 1 ..= (b + 1) * POSITION_BIN_SIZE`.
const POSITION_BIN_SIZE: i32 = 1_000_000;

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

pub struct GnomadV4Reader {
    context: SessionContext,
}

impl GnomadV4Reader {
    #[must_use]
    pub const fn new(context: SessionContext) -> Self {
        Self { context }
    }

    /// Pad `intervals` by 75 bases; pass them unpadded. Leave frequency filtering to the API.
    ///
    /// # Errors
    /// Returns an error for an empty gene ID, intervals on more than one chromosome,
    /// padding overflow, query failure, or result decoding failure.
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        self.fetch_variants_in_exons(VariantAnnotationFilter::Gene(gene_id), intervals, subset)
            .await
    }

    /// Pad `intervals` by 75 bases; pass them unpadded. Leave frequency filtering to the API.
    ///
    /// # Errors
    /// Returns an error for an empty transcript ID, intervals on more than one chromosome,
    /// padding overflow, query failure, or result decoding failure.
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        self.fetch_variants_in_exons(
            VariantAnnotationFilter::Transcript(transcript_id),
            intervals,
            subset,
        )
        .await
    }

    async fn fetch_variants_in_exons(
        &self,
        annotation_filter: VariantAnnotationFilter<'_>,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
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
            ScalarValue::Utf8(Some(exon_query.chromosome.as_str().to_owned())),
        );
        let bin_parameters = bind_position_bins(&exon_query.padded_intervals, &mut parameters);
        let position_predicate = exon_query.bind_position_predicate(&mut parameters);
        let fields = select_list_entry_fields(subset);
        let table_name = ParquetDataset::GnomadVariantsV4.name();
        // DataFusion prunes directories only with conjuncts that reference partition columns alone.
        let query = format!(
            r"
            SELECT {fields}
            FROM {table_name}
            WHERE chrom = {chromosome_parameter}
              AND posbin IN ({bin_parameters})
              AND ({position_predicate})
              AND array_first(
                  transcript_consequences,
                  consequence -> consequence['{annotation_field}'] = {annotation_parameter}
              ) IS NOT NULL
            ORDER BY pos, ref, alt
            "
        );
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(parameters)?
            .collect()
            .await?;
        decode_record_batches(
            &batches,
            format_args!("gnomAD v4 results for {annotation_field}={annotation_id}"),
        )
    }
}

const fn position_bin(position: i32) -> i32 {
    position.saturating_sub(1).saturating_div(POSITION_BIN_SIZE)
}

fn collect_position_bins(intervals: &[GenomicInterval]) -> BTreeSet<i32> {
    intervals
        .iter()
        .flat_map(|interval| position_bin(interval.start())..=position_bin(interval.stop()))
        .collect()
}

fn bind_position_bins(intervals: &[GenomicInterval], parameters: &mut Vec<ScalarValue>) -> String {
    collect_position_bins(intervals)
        .into_iter()
        .map(|bin| bind_parameter(parameters, ScalarValue::Utf8(Some(bin.to_string()))))
        .collect::<Vec<_>>()
        .join(", ")
}

/// Rebuild `variant_id`, `locus` and `alleles`, which the export dropped, in the shape of the
/// Elasticsearch documents the API already shapes.
fn select_list_entry_fields(subset: GnomadV4Subset) -> String {
    let exome_subset = subset.frequency_field();
    let exome_frequency = select_frequency(&format!("exome.freq.{exome_subset}"));
    let genome_frequency = select_frequency("genome.freq.all");
    let joint_frequency = select_frequency("joint.freq.all");
    let exome_gnomad_fafmax = select_filtering_allele_frequency("exome.fafmax.gnomad");
    let exome_non_ukb_fafmax = select_filtering_allele_frequency("exome.fafmax.non_ukb");
    let joint_fafmax = select_filtering_allele_frequency("joint.fafmax");
    // This export has no variant-level flags or joint filters; do not infer empty lists.
    format!(
        r"
        concat(chrom, '-', CAST(pos AS VARCHAR), '-', ref, '-', alt) AS variant_id,
        named_struct('contig', concat('chr', chrom), 'position', pos) AS locus,
        [ref, alt] AS alleles,
        rsids,
        CAST(NULL AS VARCHAR[]) AS flags,
        named_struct(
            'freq', named_struct('{exome_subset}', {exome_frequency}),
            'filters', exome.filters,
            'flags', exome.flags,
            'fafmax', named_struct('gnomad', {exome_gnomad_fafmax}, 'non_ukb', {exome_non_ukb_fafmax})
        ) AS exome,
        named_struct(
            'freq', named_struct('all', {genome_frequency}),
            'filters', genome.filters,
            'flags', genome.flags
        ) AS genome,
        named_struct(
            'freq', named_struct('all', {joint_frequency}),
            'filters', CAST(NULL AS VARCHAR[]),
            'fafmax', {joint_fafmax}
        ) AS joint,
        transcript_consequences,
        in_silico_predictors
        "
    )
}

// Name leaves rather than structs nested in `exome`, `genome` and `joint`: selecting a struct
// such as `exome.fafmax` made DataFusion 55 decode far more of the top-level column (BRCA1 scan
// 1,149 -> 491 ms).
fn select_frequency(path: &str) -> String {
    format!(
        r"named_struct(
            'ac', {path}.ac,
            'ac_raw', {path}.ac_raw,
            'an', {path}.an,
            'hemizygote_count', {path}.hemizygote_count,
            'homozygote_count', {path}.homozygote_count,
            'ancestry_groups', {path}.ancestry_groups
        )"
    )
}

fn select_filtering_allele_frequency(path: &str) -> String {
    format!(
        r"named_struct(
            'faf95_max', {path}.faf95_max,
            'faf95_max_gen_anc', {path}.faf95_max_gen_anc,
            'faf99_max', {path}.faf99_max,
            'faf99_max_gen_anc', {path}.faf99_max_gen_anc
        )"
    )
}

#[cfg(test)]
mod tests {
    use super::collect_position_bins;
    use crate::GenomicInterval;

    fn bins(intervals: &[(i32, i32)]) -> Vec<i32> {
        let intervals: Vec<_> = intervals
            .iter()
            .map(|&(start, stop)| GenomicInterval::new("17", start, stop).expect("valid interval"))
            .collect();
        collect_position_bins(&intervals).into_iter().collect()
    }

    #[test]
    fn places_each_megabase_boundary_in_the_lower_bin() {
        assert_eq!(bins(&[(1, 1)]), [0]);
        assert_eq!(bins(&[(1_000_000, 1_000_000)]), [0]);
        assert_eq!(bins(&[(1_000_001, 1_000_001)]), [1]);
        assert_eq!(bins(&[(16_000_000, 16_000_000)]), [15]);
    }

    #[test]
    fn covers_every_bin_an_interval_spans() {
        assert_eq!(bins(&[(15_999_709, 16_000_457)]), [15, 16]);
        assert_eq!(bins(&[(999_999, 3_000_001)]), [0, 1, 2, 3]);
    }

    #[test]
    fn lists_each_bin_once_across_intervals() {
        assert_eq!(
            bins(&[(16_044_428, 16_044_627), (16_001_840, 16_002_100)]),
            [16]
        );
        assert_eq!(
            bins(&[(5_000_000, 5_000_001), (5_500_000, 5_500_000)]),
            [4, 5]
        );
    }
}
