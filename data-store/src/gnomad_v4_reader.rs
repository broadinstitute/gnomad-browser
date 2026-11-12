use std::sync::Arc;

use datafusion::arrow::array::{Array, ArrayRef, AsArray, UInt32Array};
use datafusion::arrow::compute::{
    SortColumn, concat_batches, lexsort_to_indices, take, take_record_batch,
};
use datafusion::arrow::record_batch::RecordBatch;
use datafusion::arrow::row::{OwnedRow, RowConverter, SortField};
use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;

use crate::exon_query::{ExonQuery, VariantAnnotationFilter, bind_parameter};
use crate::position_bin::bind_position_bins;
use crate::record_batch_decoding::decode_record_batches;
use crate::{GenomicInterval, GnomadV4VariantListEntry, ParquetDataset};

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

    /// Decoded form of [`Self::fetch_variant_batches_in_gene`].
    ///
    /// # Errors
    /// As [`Self::fetch_variant_batches_in_gene`], or if decoding fails.
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        let batches = self
            .fetch_variant_batches_in_gene(gene_id, intervals, subset)
            .await?;
        decode_record_batches(&batches, format_args!("gnomAD v4 results for {gene_id}"))
    }

    /// Decoded form of [`Self::fetch_variant_batches_in_transcript`].
    ///
    /// # Errors
    /// As [`Self::fetch_variant_batches_in_transcript`], or if decoding fails.
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<GnomadV4VariantListEntry>> {
        let batches = self
            .fetch_variant_batches_in_transcript(transcript_id, intervals, subset)
            .await?;
        decode_record_batches(
            &batches,
            format_args!("gnomAD v4 results for {transcript_id}"),
        )
    }

    /// Pad `intervals` by 75 bases; pass them unpadded. Leave frequency filtering to the API.
    /// Each variant keeps this gene's first consequence, its later consequences with a `LoF`
    /// annotation, and the ancestry groups not split by sex.
    ///
    /// # Errors
    /// Returns an error for an empty gene ID, intervals on more than one chromosome,
    /// padding overflow, or query failure.
    pub async fn fetch_variant_batches_in_gene(
        &self,
        gene_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<RecordBatch>> {
        self.fetch_variant_batches_in_exons(
            VariantAnnotationFilter::Gene(gene_id),
            intervals,
            subset,
        )
        .await
    }

    /// Pad `intervals` by 75 bases; pass them unpadded. Leave frequency filtering to the API.
    /// Each variant keeps only this transcript's consequence and the ancestry groups not split by
    /// sex.
    ///
    /// # Errors
    /// Returns an error for an empty transcript ID, intervals on more than one chromosome,
    /// padding overflow, or query failure.
    pub async fn fetch_variant_batches_in_transcript(
        &self,
        transcript_id: &str,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<RecordBatch>> {
        self.fetch_variant_batches_in_exons(
            VariantAnnotationFilter::Transcript(transcript_id),
            intervals,
            subset,
        )
        .await
    }

    async fn fetch_variant_batches_in_exons(
        &self,
        annotation_filter: VariantAnnotationFilter<'_>,
        intervals: &[GenomicInterval],
        subset: GnomadV4Subset,
    ) -> Result<Vec<RecordBatch>> {
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
        let fields = select_list_entry_fields(subset, annotation_field, &annotation_parameter);
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
        ensure_sorted_by_variant(batches, &format!("{annotation_field}={annotation_id}"))
    }
}

/// Return `batches` unchanged when rows are in `(position, ref, alt)` order. Otherwise warn and sort:
/// the query relies on the export's declared file order instead of sorting.
fn ensure_sorted_by_variant(
    batches: Vec<RecordBatch>,
    description: &str,
) -> Result<Vec<RecordBatch>> {
    if is_sorted_by_variant(&batches)? {
        return Ok(batches);
    }
    eprintln!(
        "gnomAD v4 results for {description} were not in (position, ref, alt) order and were \
         sorted after the query; the export's files should be sorted by pos, ref, alt"
    );
    let Some(schema) = batches.first().map(RecordBatch::schema) else {
        return Ok(batches);
    };
    let combined = concat_batches(&schema, &batches)?;
    let sort_columns = collect_variant_sort_keys(&combined)?
        .into_iter()
        .map(|values| SortColumn {
            values,
            options: None,
        })
        .collect::<Vec<_>>();
    let indices = lexsort_to_indices(&sort_columns, None)?;
    Ok(vec![take_record_batch(&combined, &indices)?])
}

fn is_sorted_by_variant(batches: &[RecordBatch]) -> Result<bool> {
    let keys_per_batch = batches
        .iter()
        .filter(|batch| batch.num_rows() > 0)
        .map(collect_variant_sort_keys)
        .collect::<Result<Vec<_>>>()?;
    let Some(first_keys) = keys_per_batch.first() else {
        return Ok(true);
    };
    let converter = RowConverter::new(
        first_keys
            .iter()
            .map(|key| SortField::new(key.data_type().clone()))
            .collect(),
    )?;
    let mut previous = None;
    for keys in &keys_per_batch {
        let rows = converter.convert_columns(keys)?;
        for row in &rows {
            if previous
                .as_ref()
                .is_some_and(|previous: &OwnedRow| previous.row() > row)
            {
                return Ok(false);
            }
            previous = Some(row.owned());
        }
    }
    Ok(true)
}

/// Position, reference allele and alternate allele, from the `locus` and `alleles` columns.
fn collect_variant_sort_keys(batch: &RecordBatch) -> Result<Vec<ArrayRef>> {
    let missing = |column: &str| {
        DataFusionError::Internal(format!("gnomAD v4 results have no usable {column} column"))
    };
    let position = batch
        .column_by_name("locus")
        .and_then(|locus| locus.as_struct_opt())
        .and_then(|locus| locus.column_by_name("position"))
        .ok_or_else(|| missing("locus.position"))?;
    let alleles = batch
        .column_by_name("alleles")
        .and_then(|alleles| alleles.as_list_opt::<i32>())
        .ok_or_else(|| missing("alleles"))?;
    let mut reference_indices = Vec::with_capacity(alleles.len());
    let mut alternate_indices = Vec::with_capacity(alleles.len());
    for start in alleles.offsets().iter().take(alleles.len()) {
        let start = u32::try_from(*start).map_err(|_| missing("alleles"))?;
        reference_indices.push(start);
        alternate_indices.push(start.checked_add(1).ok_or_else(|| missing("alleles"))?);
    }
    let reference = take(
        alleles.values(),
        &UInt32Array::from(reference_indices),
        None,
    )?;
    let alternate = take(
        alleles.values(),
        &UInt32Array::from(alternate_indices),
        None,
    )?;
    Ok(vec![Arc::clone(position), reference, alternate])
}

/// Rebuild `variant_id`, `locus` and `alleles`, which the export dropped, in the shape of the
/// Elasticsearch documents the API already shapes. Of the annotation's consequences keep the first
/// (the pipeline sorts the most relevant first; the API displays it) and later ones with a `LoF`
/// annotation (the API's LOFTEE flags read them); drop ancestry groups split by sex. The API's list
/// shaping reads nothing else.
fn select_list_entry_fields(
    subset: GnomadV4Subset,
    annotation_field: &str,
    annotation_parameter: &str,
) -> String {
    let exome_subset = subset.frequency_field();
    let exome_frequency = select_frequency(&format!("exome.freq.{exome_subset}"));
    let genome_frequency = select_frequency("genome.freq.all");
    let joint_frequency = select_frequency("joint.freq.all");
    let exome_gnomad_fafmax = select_filtering_allele_frequency("exome.fafmax.gnomad");
    let exome_non_ukb_fafmax = select_filtering_allele_frequency("exome.fafmax.non_ukb");
    let joint_fafmax = select_filtering_allele_frequency("joint.fafmax");
    let annotation_consequences = format!(
        "array_filter(transcript_consequences, \
         consequence -> consequence['{annotation_field}'] = {annotation_parameter})"
    );
    // This export has no variant-level flags or joint filters; do not infer empty lists.
    // Widen the float32 scores: JSON prints float32 at its shortest, which rounds differently in the
    // API's three-significant-digit display than the widened values it received before.
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
        array_concat(
            array_slice({annotation_consequences}, 1, 1),
            array_filter(
                array_slice(
                    {annotation_consequences},
                    2,
                    CAST(cardinality(transcript_consequences) AS BIGINT)
                ),
                consequence -> consequence['lof'] IS NOT NULL
            )
        ) AS transcript_consequences,
        named_struct(
            'cadd', named_struct(
                'phred', CAST(in_silico_predictors.cadd.phred AS DOUBLE),
                'raw_score', CAST(in_silico_predictors.cadd.raw_score AS DOUBLE)
            ),
            'revel_max', in_silico_predictors.revel_max,
            'spliceai_ds_max', CAST(in_silico_predictors.spliceai_ds_max AS DOUBLE),
            'pangolin_largest_ds', in_silico_predictors.pangolin_largest_ds,
            'phylop', in_silico_predictors.phylop,
            'sift_max', in_silico_predictors.sift_max,
            'polyphen_max', in_silico_predictors.polyphen_max
        ) AS in_silico_predictors
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
            'ancestry_groups', array_filter(
                {path}.ancestry_groups,
                ancestry_group -> NOT (
                    strpos(ancestry_group['id'], '_') > 0 OR ancestry_group['id'] IN ('XX', 'XY')
                )
            )
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
    use datafusion::arrow::record_batch::RecordBatch;
    use datafusion::arrow::util::display::array_value_to_string;
    use datafusion::prelude::SessionContext;

    use super::ensure_sorted_by_variant;

    /// One batch per call, in the `locus`/`alleles` shape the gene query returns.
    async fn variant_batch(rows: &str) -> Vec<RecordBatch> {
        SessionContext::new()
            .sql(&format!(
                "SELECT id, named_struct('contig', 'chr1', 'position', CAST(position AS INT)) AS locus,
                        [reference, alternate] AS alleles
                 FROM (VALUES {rows}) AS v(id, position, reference, alternate)"
            ))
            .await
            .expect("valid query")
            .collect()
            .await
            .expect("query runs")
    }

    fn collect_ids(batches: &[RecordBatch]) -> Vec<String> {
        batches
            .iter()
            .flat_map(|batch| {
                (0..batch.num_rows())
                    .map(|row| array_value_to_string(batch.column(0), row).expect("printable id"))
                    .collect::<Vec<_>>()
            })
            .collect()
    }

    #[tokio::test]
    async fn sorted_rows_across_batches_are_returned_unchanged() {
        let mut batches = variant_batch("('a', 5, 'A', 'C'), ('b', 5, 'A', 'T')").await;
        batches.extend(variant_batch("('c', 5, 'C', 'T'), ('d', 10, 'A', 'G')").await);

        let sorted = ensure_sorted_by_variant(batches, "test").expect("sorts");

        assert_eq!(sorted.len(), 2);
        assert_eq!(collect_ids(&sorted), ["a", "b", "c", "d"]);
    }

    #[tokio::test]
    async fn unsorted_rows_are_sorted_by_position_then_ref_then_alt() {
        let batches = variant_batch(
            "('d', 10, 'A', 'G'), ('c', 5, 'C', 'T'), ('b', 5, 'A', 'T'), ('a', 5, 'A', 'C')",
        )
        .await;

        let sorted = ensure_sorted_by_variant(batches, "test").expect("sorts");

        assert_eq!(collect_ids(&sorted), ["a", "b", "c", "d"]);
    }

    #[tokio::test]
    async fn rows_out_of_order_across_a_batch_boundary_are_sorted() {
        let mut batches = variant_batch("('c', 7, 'A', 'G'), ('d', 8, 'A', 'G')").await;
        batches.extend(variant_batch("('a', 2, 'A', 'G'), ('b', 3, 'A', 'G')").await);

        let sorted = ensure_sorted_by_variant(batches, "test").expect("sorts");

        assert_eq!(collect_ids(&sorted), ["a", "b", "c", "d"]);
    }

    #[tokio::test]
    async fn positions_compare_as_numbers() {
        let batches = variant_batch("('b', 100, 'A', 'G'), ('a', 99, 'A', 'G')").await;

        let sorted = ensure_sorted_by_variant(batches, "test").expect("sorts");

        assert_eq!(collect_ids(&sorted), ["a", "b"]);
    }
}
