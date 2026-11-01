use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Gene {
    pub gene_id: String,
    pub gene_version: String,
    pub symbol: String,
    pub gencode_symbol: String,
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
    pub hgnc_id: Option<String>,
    pub ncbi_id: Option<String>,
    pub omim_id: Option<String>,
    pub name: Option<String>,
    pub flags: Vec<String>,
    pub canonical_transcript_id: Option<String>,
    pub mane_select_transcript: Option<GeneManeSelectTranscript>,
    pub pext: Option<GenePext>,
    pub gnomad_constraint: Option<GeneGnomadConstraint>,
    pub previous_symbols: Option<Vec<String>>,
    pub alias_symbols: Option<Vec<String>>,
    pub symbol_upper_case: String,
    pub search_terms: Vec<String>,
    pub preferred_transcript_id: Option<String>,
    pub preferred_transcript_source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GeneTranscript {
    pub transcript_id: String,
    pub transcript_version: String,
    pub gene_id: String,
    pub gene_version: String,
    pub reference_genome: String,
    pub chrom: String,
    pub strand: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
    pub interval: GeneInterval,
    pub exons: Vec<GeneExon>,
    pub gtex_tissue_expression: Option<Vec<GeneTissueExpression>>,
    pub refseq_id: Option<String>,
    pub refseq_version: Option<String>,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct GeneExon {
    pub feature_type: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct GeneInterval {
    pub start: GeneLocus,
    pub end: GeneLocus,
    pub includes_start: bool,
    pub includes_end: bool,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct GeneLocus {
    pub contig: String,
    pub position: i32,
}

#[derive(Debug, Deserialize)]
pub struct GeneTissueExpression {
    pub tissue: String,
    pub value: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct GenePext {
    pub regions: Vec<GenePextRegion>,
    pub flags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenePextRegion {
    pub chrom: String,
    pub start: i32,
    pub stop: i32,
    pub mean: f64,
    pub tissues: Vec<GeneTissueExpression>,
}

#[derive(Debug, Deserialize, PartialEq)]
pub struct GeneGnomadConstraint {
    pub gene: Option<String>,
    pub gene_id: Option<String>,
    pub transcript: Option<String>,
    pub canonical: Option<bool>,
    pub mane_select: Option<bool>,
    pub exp_lof: Option<f64>,
    pub exp_mis: Option<f64>,
    pub exp_syn: Option<f64>,
    pub obs_lof: Option<i64>,
    pub obs_mis: Option<i64>,
    pub obs_syn: Option<i64>,
    pub oe_lof: Option<f64>,
    pub oe_lof_lower: Option<f64>,
    pub oe_lof_upper: Option<f64>,
    pub oe_lof_percentile: Option<i32>,
    pub oe_mis: Option<f64>,
    pub oe_mis_lower: Option<f64>,
    pub oe_mis_upper: Option<f64>,
    pub oe_syn: Option<f64>,
    pub oe_syn_lower: Option<f64>,
    pub oe_syn_upper: Option<f64>,
    pub lof_z: Option<f64>,
    pub mis_z: Option<f64>,
    pub syn_z: Option<f64>,
    pub pli: Option<f64>,
    pub flags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct GeneManeSelectTranscript {
    pub matched_gene_version: String,
    pub ensembl_id: String,
    pub ensembl_version: String,
    pub refseq_id: String,
    pub refseq_version: String,
}
