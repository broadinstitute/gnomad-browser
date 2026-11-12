#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use std::fs;
use std::path::Path;

use datafusion::error::{DataFusionError, Result};
use gnomad_data_store::{
    GenomicInterval, GnomadV4Frequency, GnomadV4Reader, GnomadV4Subset, GnomadV4VariantListEntry,
    ParquetDataset, create_datafusion_context_from_root,
};
use tempfile::tempdir;

mod fixtures;

const TTC19: &str = "ENSG00000011295";
const TTC19_MANE_SELECT: &str = "ENST00000261647";
const TTC19_SHORT_TRANSCRIPT: &str = "ENST00000466729";

const TTC19_CDS: [(i32, i32); 12] = [
    (15_999_784, 16_000_032),
    (16_000_118, 16_000_382),
    (16_001_915, 16_002_025),
    (16_002_657, 16_002_665),
    (16_002_793, 16_002_831),
    (16_003_831, 16_003_887),
    (16_004_201, 16_004_262),
    (16_006_474, 16_006_568),
    (16_025_017, 16_025_171),
    (16_026_540, 16_026_707),
    (16_027_374, 16_027_519),
    (16_044_503, 16_044_552),
];

const TTC19_PADDED_CDS_VARIANT_IDS: [&str; 9] = [
    "17-15999784-C-A",
    "17-16000000-G-A",
    "17-16000000-G-T",
    "17-16000000-GC-G",
    "17-16000457-T-C",
    "17-16000457-T-G",
    "17-16000457-TGTCAAG-T",
    "17-16002100-T-G",
    "17-16044627-T-A",
];

async fn create_reader(root: &Path) -> Result<GnomadV4Reader> {
    let context =
        create_datafusion_context_from_root(root, ParquetDataset::GnomadVariantsV4).await?;
    Ok(GnomadV4Reader::new(context))
}

fn chr17_intervals(bounds: &[(i32, i32)]) -> Result<Vec<GenomicInterval>> {
    bounds
        .iter()
        .map(|&(start, stop)| {
            GenomicInterval::new("17", start, stop)
                .map_err(|error| DataFusionError::Plan(error.to_string()))
        })
        .collect()
}

fn collect_variant_ids(variants: &[GnomadV4VariantListEntry]) -> Vec<&str> {
    variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect()
}

fn collect_transcript_ids(variant: &GnomadV4VariantListEntry) -> Vec<Option<&str>> {
    variant
        .transcript_consequences
        .iter()
        .map(|consequence| consequence.transcript_id.as_deref())
        .collect()
}

fn collect_ancestry_group_ids(frequency: Option<&GnomadV4Frequency>) -> Vec<&str> {
    frequency
        .and_then(|frequency| frequency.ancestry_groups.as_deref())
        .unwrap_or_default()
        .iter()
        .map(|group| group.id.as_str())
        .collect()
}

fn find_variant<'a>(
    variants: &'a [GnomadV4VariantListEntry],
    variant_id: &str,
) -> Result<&'a GnomadV4VariantListEntry> {
    variants
        .iter()
        .find(|variant| variant.variant_id == variant_id)
        .ok_or_else(|| DataFusionError::Execution(format!("{variant_id} missing from results")))
}

async fn fetch_ttc19_variants(
    reader: &GnomadV4Reader,
    bounds: &[(i32, i32)],
    subset: GnomadV4Subset,
) -> Result<Vec<GnomadV4VariantListEntry>> {
    reader
        .fetch_variants_in_gene(TTC19, &chr17_intervals(bounds)?, subset)
        .await
}

#[tokio::test]
async fn gene_query_returns_annotated_variants_in_padded_cds_from_both_bins_in_order() -> Result<()>
{
    let reader = create_reader(&fixtures::root_directory()).await?;

    let variants = fetch_ttc19_variants(&reader, &TTC19_CDS, GnomadV4Subset::All).await?;

    assert_eq!(collect_variant_ids(&variants), TTC19_PADDED_CDS_VARIANT_IDS);
    Ok(())
}

#[tokio::test]
async fn variant_at_a_megabase_edge_is_read_from_the_lower_bin() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;

    // Padded, this interval starts exactly at 16,000,000, whose rows live in posbin=15.
    let variants =
        fetch_ttc19_variants(&reader, &[(16_000_075, 16_000_075)], GnomadV4Subset::All).await?;

    assert_eq!(
        collect_variant_ids(&variants),
        ["17-16000000-G-A", "17-16000000-G-T", "17-16000000-GC-G"]
    );
    Ok(())
}

#[tokio::test]
async fn directories_outside_the_queried_bins_are_not_read() -> Result<()> {
    let root = tempdir()?;
    let source = fixtures::root_directory().join("gnomad_variants_v4/chrom=17");
    let destination = root.path().join("gnomad_variants_v4/chrom=17");
    for posbin in ["posbin=15", "posbin=16"] {
        fs::create_dir_all(destination.join(posbin))?;
        fs::copy(
            source.join(posbin).join("data.parquet"),
            destination.join(posbin).join("data.parquet"),
        )?;
    }
    // Same positions in a bin the query must skip; reading it would duplicate rows.
    fs::create_dir_all(destination.join("posbin=17"))?;
    fs::copy(
        source.join("posbin=15/data.parquet"),
        destination.join("posbin=17/data.parquet"),
    )?;
    let reader = create_reader(root.path()).await?;

    let variants = fetch_ttc19_variants(&reader, &TTC19_CDS, GnomadV4Subset::All).await?;

    assert_eq!(collect_variant_ids(&variants), TTC19_PADDED_CDS_VARIANT_IDS);
    Ok(())
}

#[tokio::test]
async fn transcript_query_requires_a_consequence_for_that_transcript() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;
    let intervals = chr17_intervals(&[(15_999_784, 15_999_784)])?;

    let short_transcript_variants = reader
        .fetch_variants_in_transcript(TTC19_SHORT_TRANSCRIPT, &intervals, GnomadV4Subset::All)
        .await?;
    let mane_select_variants = reader
        .fetch_variants_in_transcript(TTC19_MANE_SELECT, &intervals, GnomadV4Subset::All)
        .await?;

    assert_eq!(
        collect_variant_ids(&short_transcript_variants),
        ["17-15999784-C-A"]
    );
    let variant = find_variant(&short_transcript_variants, "17-15999784-C-A")?;
    assert_eq!(
        collect_transcript_ids(variant),
        [Some(TTC19_SHORT_TRANSCRIPT)]
    );
    assert!(
        mane_select_variants.is_empty(),
        "{:?}",
        collect_variant_ids(&mane_select_variants)
    );
    Ok(())
}

#[tokio::test]
async fn exome_frequencies_come_from_the_requested_subset_only() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;
    let interval = [(16_000_457, 16_000_457)];

    let all = fetch_ttc19_variants(&reader, &interval, GnomadV4Subset::All).await?;
    let non_ukb = fetch_ttc19_variants(&reader, &interval, GnomadV4Subset::NonUkb).await?;

    let all = all
        .iter()
        .find(|variant| variant.variant_id == "17-16000457-T-C")
        .expect("variant in all subset");
    let non_ukb = non_ukb
        .iter()
        .find(|variant| variant.variant_id == "17-16000457-T-C")
        .expect("variant in non_ukb subset");
    let all_frequency = all.exome.freq.all.as_ref().expect("all frequency");
    let non_ukb_frequency = non_ukb
        .exome
        .freq
        .non_ukb
        .as_ref()
        .expect("non_ukb frequency");
    assert_eq!(
        (all_frequency.ac_raw, all_frequency.ac),
        (Some(31), Some(30))
    );
    assert_eq!(
        (non_ukb_frequency.ac_raw, non_ukb_frequency.ac),
        (Some(9), Some(8))
    );
    assert!(all.exome.freq.non_ukb.is_none());
    assert!(non_ukb.exome.freq.all.is_none());
    Ok(())
}

#[tokio::test]
async fn rebuilds_identity_fields_and_decodes_a_real_record() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;

    let variants =
        fetch_ttc19_variants(&reader, &[(16_000_457, 16_000_457)], GnomadV4Subset::All).await?;

    let variant = variants
        .iter()
        .find(|variant| variant.variant_id == "17-16000457-T-C")
        .expect("fixture variant");
    assert_eq!(variant.locus.contig, "chr17");
    assert_eq!(variant.locus.position, 16_000_457);
    assert_eq!(variant.alleles, ["T", "C"]);
    assert_eq!(
        variant.rsids.as_deref(),
        Some(&["rs960724070".to_owned()][..])
    );
    assert_eq!(variant.flags, None);
    assert_eq!(variant.joint.filters, None);
    assert_eq!(variant.exome.filters.as_deref(), Some(&[][..]));
    assert_eq!(
        variant
            .exome
            .freq
            .all
            .as_ref()
            .and_then(|frequency| frequency.an),
        Some(1_220_484)
    );
    assert_eq!(
        variant
            .genome
            .freq
            .all
            .as_ref()
            .and_then(|frequency| frequency.an),
        Some(152_214)
    );
    assert_eq!(
        variant
            .joint
            .freq
            .all
            .as_ref()
            .and_then(|frequency| frequency.an),
        Some(1_372_698)
    );
    assert!(variant.joint.fafmax.faf95_max.is_some());
    assert!(variant.in_silico_predictors.cadd.phred.is_some());
    let mane_select = variant
        .transcript_consequences
        .iter()
        .find(|consequence| consequence.transcript_id.as_deref() == Some(TTC19_MANE_SELECT))
        .expect("MANE Select consequence");
    assert_eq!(mane_select.is_mane_select, Some(true));
    assert_eq!(mane_select.hgvsc.as_deref(), Some("c.312+212T>C"));
    Ok(())
}

#[tokio::test]
async fn genome_only_variant_keeps_missing_exome_values_missing() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;

    let variants =
        fetch_ttc19_variants(&reader, &[(16_001_839, 16_001_839)], GnomadV4Subset::All).await?;

    assert_eq!(collect_variant_ids(&variants), ["17-16001839-T-G"]);
    let variant = variants.first().expect("one variant");
    let exome_frequency = variant
        .exome
        .freq
        .all
        .as_ref()
        .expect("exome frequency struct");
    assert_eq!((exome_frequency.ac_raw, exome_frequency.an), (None, None));
    assert_eq!(variant.exome.filters, None);
    assert_eq!(
        variant
            .genome
            .freq
            .all
            .as_ref()
            .and_then(|frequency| frequency.ac_raw),
        Some(1)
    );
    Ok(())
}

#[tokio::test]
async fn gene_query_keeps_only_that_genes_consequences_in_source_order() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;

    let variants =
        fetch_ttc19_variants(&reader, &[(16_000_457, 16_000_457)], GnomadV4Subset::All).await?;

    // The source row also has five RefSeq consequences, under gene ID 54902.
    let variant = find_variant(&variants, "17-16000457-T-C")?;
    assert_eq!(
        collect_transcript_ids(variant),
        [
            Some(TTC19_MANE_SELECT),
            Some("ENST00000583704"),
            Some(TTC19_SHORT_TRANSCRIPT),
            Some("ENST00000470399"),
            Some("ENST00000475723"),
            Some("ENST00000497842"),
        ]
    );
    assert!(
        variant
            .transcript_consequences
            .iter()
            .all(|consequence| consequence.gene_id.as_deref() == Some(TTC19))
    );
    Ok(())
}

#[tokio::test]
async fn ancestry_groups_split_by_sex_are_dropped_in_source_order() -> Result<()> {
    let reader = create_reader(&fixtures::root_directory()).await?;
    let interval = [(16_000_457, 16_000_457)];

    let all = fetch_ttc19_variants(&reader, &interval, GnomadV4Subset::All).await?;
    let non_ukb = fetch_ttc19_variants(&reader, &interval, GnomadV4Subset::NonUkb).await?;

    let exome_groups = [
        "remaining",
        "amr",
        "fin",
        "mid",
        "nfe",
        "sas",
        "asj",
        "eas",
        "afr",
    ];
    let genome_groups = [
        "remaining",
        "amr",
        "fin",
        "ami",
        "eas",
        "mid",
        "sas",
        "asj",
        "afr",
        "nfe",
    ];
    let all = find_variant(&all, "17-16000457-T-C")?;
    let non_ukb = find_variant(&non_ukb, "17-16000457-T-C")?;
    assert_eq!(
        collect_ancestry_group_ids(all.exome.freq.all.as_ref()),
        exome_groups
    );
    assert_eq!(
        collect_ancestry_group_ids(non_ukb.exome.freq.non_ukb.as_ref()),
        exome_groups
    );
    assert_eq!(
        collect_ancestry_group_ids(all.genome.freq.all.as_ref()),
        genome_groups
    );
    // The source's joint list has an entry with an empty ID; the API keeps it, so it stays.
    assert_eq!(
        collect_ancestry_group_ids(all.joint.freq.all.as_ref()),
        [
            "remaining",
            "amr",
            "fin",
            "ami",
            "eas",
            "mid",
            "sas",
            "asj",
            "afr",
            "nfe",
            "",
        ]
    );
    Ok(())
}
