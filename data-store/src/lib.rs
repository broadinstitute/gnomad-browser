//! Read browser datasets from Parquet files.

mod clinvar_reader;
mod clinvar_variant;
mod datafusion_context;
mod gene;
mod gene_index;
mod gene_reader;
mod genomic_interval;
mod node_bindings;
mod parquet_dataset;
mod record_batch_decoding;

pub use clinvar_reader::ClinvarReader;
pub use clinvar_variant::{
    ClinvarCondition, ClinvarGnomadData, ClinvarGnomadSequencingData, ClinvarSubmission,
    ClinvarTranscriptConsequence, ClinvarVariant, ClinvarVariantListEntry,
};
pub use datafusion_context::create_datafusion_context_from_root;
pub use gene::{
    Gene, GeneExon, GeneGnomadConstraint, GeneInterval, GeneLocus, GeneManeSelectTranscript,
    GenePext, GenePextRegion, GeneTissueExpression, GeneTranscript,
};
pub use gene_index::{GeneIndex, GeneIndexEntry, GeneIndexRow};
pub use gene_reader::GeneReader;
pub use genomic_interval::{
    Chromosome, GenomicInterval, GenomicIntervalError, pad_and_merge_intervals,
};
pub use parquet_dataset::ParquetDataset;
