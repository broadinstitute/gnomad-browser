use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ClinvarVariant {
    pub variant_id: String,
    pub chromosome: String,
    pub position: i32,
    pub reference_allele: String,
    pub alternate_allele: String,
}
