use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ClinvarVariant {
    pub variant_id: String,
    pub chromosome: String,
    pub position: i32,
    pub reference_allele: String,
    pub alternate_allele: String,
    pub reference_genome: String,
    pub clinvar_variation_id: String,
    pub clinical_significance: String,
    pub review_status: String,
    pub gold_stars: i32,
    pub in_gnomad: bool,
    pub last_evaluated: Option<String>,
    pub rsid: Option<String>,
    pub submissions: Vec<ClinvarSubmission>,
    pub gnomad: ClinvarGnomadData,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarSubmission {
    pub clinical_significance: Option<String>,
    pub last_evaluated: Option<String>,
    pub review_status: String,
    pub submitter_name: String,
    pub conditions: Vec<ClinvarCondition>,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarCondition {
    pub name: String,
    pub medgen_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarGnomadData {
    pub exome: Option<ClinvarGnomadSequencingData>,
    pub genome: Option<ClinvarGnomadSequencingData>,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarGnomadSequencingData {
    pub ac: i32,
    pub an: i32,
    pub filters: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarVariantListEntry {
    pub variant_id: String,
    pub reference_genome: String,
    pub chromosome: String,
    pub position: i32,
    pub reference_allele: String,
    pub alternate_allele: String,
    pub clinvar_variation_id: String,
    pub clinical_significance: String,
    pub review_status: String,
    pub gold_stars: i32,
    pub in_gnomad: bool,
    pub gnomad: ClinvarGnomadData,
    pub transcript_consequence: Option<ClinvarTranscriptConsequence>,
}

#[derive(Debug, Deserialize)]
pub struct ClinvarTranscriptConsequence {
    pub transcript_id: Option<String>,
    pub major_consequence: Option<String>,
    pub hgvsc: Option<String>,
    pub hgvsp: Option<String>,
}
