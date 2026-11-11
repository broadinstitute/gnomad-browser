#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use super::{into_napi_error, into_nullable};
use crate::{
    Gene as ReaderGene, GeneExon as ReaderGeneExon,
    GeneGnomadConstraint as ReaderGeneGnomadConstraint, GeneIndex, GeneIndexEntry,
    GeneInterval as ReaderGeneInterval, GeneLocus as ReaderGeneLocus,
    GeneManeSelectTranscript as ReaderGeneManeSelectTranscript, GenePext as ReaderGenePext,
    GenePextRegion as ReaderGenePextRegion, GeneReader,
    GeneTissueExpression as ReaderGeneTissueExpression, GeneTranscript as ReaderGeneTranscript,
    ParquetDataset, create_datafusion_context_from_root,
};

// 2^53 - 1; JS doubles lose precision on any number bigger than this
const MAX_SAFE_JS_INTEGER: i64 = 9_007_199_254_740_991;

#[napi]
pub struct GeneStore {
    reader: GeneReader,
    index: GeneIndex,
}

/// # Errors
/// Return an error if `gene_models_grch38` cannot be resolved or registered under the supplied root,
/// or its search terms cannot be read.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_gene_store(parquet_root: String) -> napi::Result<GeneStore> {
    let context =
        create_datafusion_context_from_root(parquet_root, ParquetDataset::GeneModelsGrch38)
            .await
            .map_err(|error| into_napi_error(&error))?;
    let reader = GeneReader::new(context);
    let index = reader
        .load_gene_index()
        .await
        .map_err(|error| into_napi_error(&error))?;
    Ok(GeneStore { reader, index })
}

#[napi]
impl GeneStore {
    /// # Errors
    /// Reject query, decoding, duplicate-ID, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_gene_by_id(&self, gene_id: String) -> napi::Result<Either<Gene, Null>> {
        let gene = self
            .reader
            .fetch_gene_by_id(&gene_id)
            .await
            .map_err(|error| into_napi_error(&error))?;
        let gene = gene.map(Gene::try_from).transpose().map_err(|error| {
            napi::Error::from_reason(format!(
                "Cannot convert gene {gene_id} to JavaScript: {error}"
            ))
        })?;
        Ok(into_nullable(gene))
    }

    /// Match an exact `ENSG` ID or a case-insensitive prefix of a gene's symbols, best match first.
    #[allow(
        clippy::needless_pass_by_value,
        reason = "Node-API passes JavaScript strings to Rust as owned Strings."
    )]
    #[napi]
    pub fn search_genes(&self, query: String, limit: u32) -> Vec<GeneSearchResult> {
        let limit = usize::try_from(limit).unwrap_or(usize::MAX);
        self.index
            .search(&query, limit)
            .into_iter()
            .map(GeneSearchResult::from)
            .collect()
    }
}

#[napi(object)]
pub struct GeneSearchResult {
    #[napi(js_name = "ensembl_id")]
    pub ensembl_id: String,
    #[napi(js_name = "ensembl_version")]
    pub ensembl_version: String,
    pub symbol: String,
}

impl From<&GeneIndexEntry> for GeneSearchResult {
    fn from(gene: &GeneIndexEntry) -> Self {
        Self {
            ensembl_id: gene.gene_id.clone(),
            ensembl_version: gene.gene_version.clone(),
            symbol: gene.symbol.clone(),
        }
    }
}

#[allow(
    clippy::struct_field_names,
    reason = "Preserve gene_id and gene_version in the JavaScript API."
)]
#[napi(object)]
pub struct Gene {
    #[napi(js_name = "gene_id")]
    pub gene_id: String,
    #[napi(js_name = "gene_version")]
    pub gene_version: String,
    pub symbol: String,
    #[napi(js_name = "gencode_symbol")]
    pub gencode_symbol: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    pub chrom: String,
    pub strand: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
    pub interval: GeneInterval,
    pub exons: Vec<GeneExon>,
    pub transcripts: Vec<GeneTranscript>,
    #[napi(js_name = "hgnc_id")]
    pub hgnc_id: Either<String, Null>,
    #[napi(js_name = "ncbi_id")]
    pub ncbi_id: Either<String, Null>,
    #[napi(js_name = "omim_id")]
    pub omim_id: Either<String, Null>,
    pub name: Either<String, Null>,
    pub flags: Vec<String>,
    #[napi(js_name = "canonical_transcript_id")]
    pub canonical_transcript_id: Either<String, Null>,
    #[napi(js_name = "mane_select_transcript")]
    pub mane_select_transcript: Either<GeneManeSelectTranscript, Null>,
    pub pext: Either<GenePext, Null>,
    #[napi(js_name = "gnomad_constraint")]
    pub gnomad_constraint: Either<GeneGnomadConstraint, Null>,
    #[napi(js_name = "previous_symbols")]
    pub previous_symbols: Either<Vec<String>, Null>,
    #[napi(js_name = "alias_symbols")]
    pub alias_symbols: Either<Vec<String>, Null>,
    #[napi(js_name = "symbol_upper_case")]
    pub symbol_upper_case: String,
    #[napi(js_name = "search_terms")]
    pub search_terms: Vec<String>,
    #[napi(js_name = "preferred_transcript_id")]
    pub preferred_transcript_id: Either<String, Null>,
    #[napi(js_name = "preferred_transcript_source")]
    pub preferred_transcript_source: Either<String, Null>,
}

impl TryFrom<ReaderGene> for Gene {
    type Error = napi::Error;

    fn try_from(gene: ReaderGene) -> napi::Result<Self> {
        Ok(Self {
            gene_id: gene.gene_id,
            gene_version: gene.gene_version,
            symbol: gene.symbol,
            gencode_symbol: gene.gencode_symbol,
            reference_genome: gene.reference_genome,
            chrom: gene.chrom,
            strand: gene.strand,
            start: gene.start,
            stop: gene.stop,
            xstart: checked_js_integer(gene.xstart, "gene.xstart")?,
            xstop: checked_js_integer(gene.xstop, "gene.xstop")?,
            interval: gene.interval.into(),
            exons: gene
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            transcripts: gene
                .transcripts
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            hgnc_id: into_nullable(gene.hgnc_id),
            ncbi_id: into_nullable(gene.ncbi_id),
            omim_id: into_nullable(gene.omim_id),
            name: into_nullable(gene.name),
            flags: gene.flags,
            canonical_transcript_id: into_nullable(gene.canonical_transcript_id),
            mane_select_transcript: into_nullable(gene.mane_select_transcript.map(Into::into)),
            pext: into_nullable(gene.pext.map(Into::into)),
            gnomad_constraint: into_nullable(
                gene.gnomad_constraint.map(TryInto::try_into).transpose()?,
            ),
            previous_symbols: into_nullable(gene.previous_symbols),
            alias_symbols: into_nullable(gene.alias_symbols),
            symbol_upper_case: gene.symbol_upper_case,
            search_terms: gene.search_terms,
            preferred_transcript_id: into_nullable(gene.preferred_transcript_id),
            preferred_transcript_source: into_nullable(gene.preferred_transcript_source),
        })
    }
}

#[napi(object)]
pub struct GeneTranscript {
    #[napi(js_name = "transcript_id")]
    pub transcript_id: String,
    #[napi(js_name = "transcript_version")]
    pub transcript_version: String,
    #[napi(js_name = "gene_id")]
    pub gene_id: String,
    #[napi(js_name = "gene_version")]
    pub gene_version: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    pub chrom: String,
    pub strand: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
    pub interval: GeneInterval,
    pub exons: Vec<GeneExon>,
    #[napi(js_name = "gtex_tissue_expression")]
    pub gtex_tissue_expression: Either<Vec<GeneTissueExpression>, Null>,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: Either<String, Null>,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: Either<String, Null>,
}

impl TryFrom<ReaderGeneTranscript> for GeneTranscript {
    type Error = napi::Error;

    fn try_from(transcript: ReaderGeneTranscript) -> napi::Result<Self> {
        Ok(Self {
            transcript_id: transcript.transcript_id,
            transcript_version: transcript.transcript_version,
            gene_id: transcript.gene_id,
            gene_version: transcript.gene_version,
            reference_genome: transcript.reference_genome,
            chrom: transcript.chrom,
            strand: transcript.strand,
            start: transcript.start,
            stop: transcript.stop,
            xstart: checked_js_integer(transcript.xstart, "transcript.xstart")?,
            xstop: checked_js_integer(transcript.xstop, "transcript.xstop")?,
            interval: transcript.interval.into(),
            exons: transcript
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            gtex_tissue_expression: into_nullable(
                transcript
                    .gtex_tissue_expression
                    .map(|tissues| tissues.into_iter().map(Into::into).collect()),
            ),
            refseq_id: into_nullable(transcript.refseq_id),
            refseq_version: into_nullable(transcript.refseq_version),
        })
    }
}

#[napi(object)]
pub struct GeneExon {
    #[napi(js_name = "feature_type")]
    pub feature_type: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
}

impl TryFrom<ReaderGeneExon> for GeneExon {
    type Error = napi::Error;

    fn try_from(exon: ReaderGeneExon) -> napi::Result<Self> {
        Ok(Self {
            feature_type: exon.feature_type,
            start: exon.start,
            stop: exon.stop,
            xstart: checked_js_integer(exon.xstart, "exon.xstart")?,
            xstop: checked_js_integer(exon.xstop, "exon.xstop")?,
        })
    }
}

#[napi(object)]
pub struct GeneInterval {
    pub start: GeneLocus,
    pub end: GeneLocus,
    #[napi(js_name = "includes_start")]
    pub includes_start: bool,
    #[napi(js_name = "includes_end")]
    pub includes_end: bool,
}

impl From<ReaderGeneInterval> for GeneInterval {
    fn from(interval: ReaderGeneInterval) -> Self {
        Self {
            start: interval.start.into(),
            end: interval.end.into(),
            includes_start: interval.includes_start,
            includes_end: interval.includes_end,
        }
    }
}

#[napi(object)]
pub struct GeneLocus {
    pub contig: String,
    pub position: i32,
}

impl From<ReaderGeneLocus> for GeneLocus {
    fn from(locus: ReaderGeneLocus) -> Self {
        Self {
            contig: locus.contig,
            position: locus.position,
        }
    }
}

#[napi(object)]
pub struct GeneTissueExpression {
    pub tissue: String,
    pub value: Either<f64, Null>,
}

impl From<ReaderGeneTissueExpression> for GeneTissueExpression {
    fn from(expression: ReaderGeneTissueExpression) -> Self {
        Self {
            tissue: expression.tissue,
            value: into_nullable(expression.value),
        }
    }
}

#[napi(object)]
pub struct GenePext {
    pub regions: Vec<GenePextRegion>,
    pub flags: Vec<String>,
}

impl From<ReaderGenePext> for GenePext {
    fn from(pext: ReaderGenePext) -> Self {
        Self {
            regions: pext.regions.into_iter().map(Into::into).collect(),
            flags: pext.flags,
        }
    }
}

#[napi(object)]
pub struct GenePextRegion {
    pub chrom: String,
    pub start: i32,
    pub stop: i32,
    pub mean: f64,
    pub tissues: Vec<GeneTissueExpression>,
}

impl From<ReaderGenePextRegion> for GenePextRegion {
    fn from(region: ReaderGenePextRegion) -> Self {
        Self {
            chrom: region.chrom,
            start: region.start,
            stop: region.stop,
            mean: region.mean,
            tissues: region.tissues.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi(object)]
pub struct GeneGnomadConstraint {
    pub gene: Either<String, Null>,
    #[napi(js_name = "gene_id")]
    pub gene_id: Either<String, Null>,
    pub transcript: Either<String, Null>,
    pub canonical: Either<bool, Null>,
    #[napi(js_name = "mane_select")]
    pub mane_select: Either<bool, Null>,
    #[napi(js_name = "exp_lof")]
    pub exp_lof: Either<f64, Null>,
    #[napi(js_name = "exp_mis")]
    pub exp_mis: Either<f64, Null>,
    #[napi(js_name = "exp_syn")]
    pub exp_syn: Either<f64, Null>,
    #[napi(js_name = "obs_lof")]
    pub obs_lof: Either<i64, Null>,
    #[napi(js_name = "obs_mis")]
    pub obs_mis: Either<i64, Null>,
    #[napi(js_name = "obs_syn")]
    pub obs_syn: Either<i64, Null>,
    #[napi(js_name = "oe_lof")]
    pub oe_lof: Either<f64, Null>,
    #[napi(js_name = "oe_lof_lower")]
    pub oe_lof_lower: Either<f64, Null>,
    #[napi(js_name = "oe_lof_upper")]
    pub oe_lof_upper: Either<f64, Null>,
    #[napi(js_name = "oe_lof_percentile")]
    pub oe_lof_percentile: Either<i32, Null>,
    #[napi(js_name = "oe_mis")]
    pub oe_mis: Either<f64, Null>,
    #[napi(js_name = "oe_mis_lower")]
    pub oe_mis_lower: Either<f64, Null>,
    #[napi(js_name = "oe_mis_upper")]
    pub oe_mis_upper: Either<f64, Null>,
    #[napi(js_name = "oe_syn")]
    pub oe_syn: Either<f64, Null>,
    #[napi(js_name = "oe_syn_lower")]
    pub oe_syn_lower: Either<f64, Null>,
    #[napi(js_name = "oe_syn_upper")]
    pub oe_syn_upper: Either<f64, Null>,
    #[napi(js_name = "lof_z")]
    pub lof_z: Either<f64, Null>,
    #[napi(js_name = "mis_z")]
    pub mis_z: Either<f64, Null>,
    #[napi(js_name = "syn_z")]
    pub syn_z: Either<f64, Null>,
    pub pli: Either<f64, Null>,
    pub flags: Either<Vec<String>, Null>,
}

impl TryFrom<ReaderGeneGnomadConstraint> for GeneGnomadConstraint {
    type Error = napi::Error;

    fn try_from(constraint: ReaderGeneGnomadConstraint) -> napi::Result<Self> {
        Ok(Self {
            gene: into_nullable(constraint.gene),
            gene_id: into_nullable(constraint.gene_id),
            transcript: into_nullable(constraint.transcript),
            canonical: into_nullable(constraint.canonical),
            mane_select: into_nullable(constraint.mane_select),
            exp_lof: into_nullable(constraint.exp_lof),
            exp_mis: into_nullable(constraint.exp_mis),
            exp_syn: into_nullable(constraint.exp_syn),
            obs_lof: into_nullable_js_integer(constraint.obs_lof, "gnomad_constraint.obs_lof")?,
            obs_mis: into_nullable_js_integer(constraint.obs_mis, "gnomad_constraint.obs_mis")?,
            obs_syn: into_nullable_js_integer(constraint.obs_syn, "gnomad_constraint.obs_syn")?,
            oe_lof: into_nullable(constraint.oe_lof),
            oe_lof_lower: into_nullable(constraint.oe_lof_lower),
            oe_lof_upper: into_nullable(constraint.oe_lof_upper),
            oe_lof_percentile: into_nullable(constraint.oe_lof_percentile),
            oe_mis: into_nullable(constraint.oe_mis),
            oe_mis_lower: into_nullable(constraint.oe_mis_lower),
            oe_mis_upper: into_nullable(constraint.oe_mis_upper),
            oe_syn: into_nullable(constraint.oe_syn),
            oe_syn_lower: into_nullable(constraint.oe_syn_lower),
            oe_syn_upper: into_nullable(constraint.oe_syn_upper),
            lof_z: into_nullable(constraint.lof_z),
            mis_z: into_nullable(constraint.mis_z),
            syn_z: into_nullable(constraint.syn_z),
            pli: into_nullable(constraint.pli),
            flags: into_nullable(constraint.flags),
        })
    }
}

#[napi(object)]
pub struct GeneManeSelectTranscript {
    #[napi(js_name = "matched_gene_version")]
    pub matched_gene_version: String,
    #[napi(js_name = "ensembl_id")]
    pub ensembl_id: String,
    #[napi(js_name = "ensembl_version")]
    pub ensembl_version: String,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: String,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: String,
}

impl From<ReaderGeneManeSelectTranscript> for GeneManeSelectTranscript {
    fn from(transcript: ReaderGeneManeSelectTranscript) -> Self {
        Self {
            matched_gene_version: transcript.matched_gene_version,
            ensembl_id: transcript.ensembl_id,
            ensembl_version: transcript.ensembl_version,
            refseq_id: transcript.refseq_id,
            refseq_version: transcript.refseq_version,
        }
    }
}

fn checked_js_integer(value: i64, field: &str) -> napi::Result<i64> {
    if !(-MAX_SAFE_JS_INTEGER..=MAX_SAFE_JS_INTEGER).contains(&value) {
        return Err(napi::Error::from_reason(format!(
            "{field} value {value} exceeds the JavaScript safe integer range"
        )));
    }
    Ok(value)
}

pub(super) fn into_nullable_js_integer(
    value: Option<i64>,
    field: &str,
) -> napi::Result<Either<i64, Null>> {
    Ok(into_nullable(
        value
            .map(|value| checked_js_integer(value, field))
            .transpose()?,
    ))
}

#[cfg(test)]
mod tests {
    use super::{
        Either, GeneExon, GeneGnomadConstraint, MAX_SAFE_JS_INTEGER, Null, ReaderGeneExon,
        ReaderGeneGnomadConstraint, checked_js_integer, into_nullable_js_integer,
    };

    const fn sample_constraint() -> ReaderGeneGnomadConstraint {
        ReaderGeneGnomadConstraint {
            gene: None,
            gene_id: None,
            transcript: None,
            canonical: None,
            mane_select: None,
            exp_lof: None,
            exp_mis: None,
            exp_syn: None,
            obs_lof: None,
            obs_mis: None,
            obs_syn: None,
            oe_lof: None,
            oe_lof_lower: None,
            oe_lof_upper: None,
            oe_lof_percentile: None,
            oe_mis: None,
            oe_mis_lower: None,
            oe_mis_upper: None,
            oe_syn: None,
            oe_syn_lower: None,
            oe_syn_upper: None,
            lof_z: None,
            mis_z: None,
            syn_z: None,
            pli: None,
            flags: None,
        }
    }

    #[test]
    fn preserves_safe_integer_limits_and_large_coordinates() {
        for value in [0, 24_000_000_101, -MAX_SAFE_JS_INTEGER, MAX_SAFE_JS_INTEGER] {
            assert_eq!(
                checked_js_integer(value, "test-field").expect("safe integer"),
                value
            );
        }
    }

    #[test]
    fn rejects_unsafe_integers_with_field_and_value() {
        for value in [
            i64::MIN,
            -9_007_199_254_740_992,
            9_007_199_254_740_992,
            i64::MAX,
        ] {
            let error = checked_js_integer(value, "test-field").expect_err("unsafe integer");
            assert!(error.reason.contains("test-field"));
            assert!(error.reason.contains(&value.to_string()));
            assert!(error.reason.contains("safe integer"));
        }
    }

    #[test]
    fn preserves_nullable_integer_zero_and_absence() {
        assert!(matches!(
            into_nullable_js_integer(None, "count"),
            Ok(Either::B(Null))
        ));
        assert!(matches!(
            into_nullable_js_integer(Some(0), "count"),
            Ok(Either::A(0))
        ));
        assert!(into_nullable_js_integer(Some(i64::MAX), "count").is_err());
    }

    #[test]
    fn checks_both_exon_encoded_coordinates() {
        for (xstart, xstop) in [(i64::MAX, 200), (100, i64::MAX)] {
            let exon = ReaderGeneExon {
                feature_type: "CDS".to_owned(),
                start: 100,
                stop: 200,
                xstart,
                xstop,
            };
            assert!(
                matches!(GeneExon::try_from(exon), Err(error) if error.reason.contains("exon.x"))
            );
        }
    }

    #[test]
    fn preserves_constraint_null_zero_false_and_empty_flags() {
        let mut constraint = sample_constraint();
        constraint.obs_lof = Some(0);
        constraint.canonical = Some(false);
        constraint.flags = Some(Vec::new());
        let converted = GeneGnomadConstraint::try_from(constraint).expect("valid constraint");

        assert!(matches!(converted.exp_lof, Either::B(Null)));
        assert!(matches!(converted.obs_lof, Either::A(0)));
        assert!(matches!(converted.obs_mis, Either::B(Null)));
        assert!(matches!(converted.canonical, Either::A(false)));
        assert!(
            matches!(converted.flags, Either::A(flags) if flags.is_empty()),
            "Preserve a present empty flag list"
        );
        let missing = GeneGnomadConstraint::try_from(sample_constraint()).expect("missing metrics");
        assert!(matches!(missing.flags, Either::B(Null)));
    }

    #[test]
    fn checks_every_constraint_observed_count() {
        for field in ["obs_lof", "obs_mis", "obs_syn"] {
            let mut constraint = sample_constraint();
            match field {
                "obs_lof" => constraint.obs_lof = Some(i64::MAX),
                "obs_mis" => constraint.obs_mis = Some(i64::MAX),
                _ => constraint.obs_syn = Some(i64::MAX),
            }
            assert!(
                matches!(GeneGnomadConstraint::try_from(constraint), Err(error) if error.reason.contains(field))
            );
        }
    }
}
