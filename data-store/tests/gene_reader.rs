#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::Result;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{
    GeneGnomadConstraint, GeneInterval, GeneLocus, GeneReader, ParquetDataset,
    create_datafusion_context_from_root,
};
use serde_json::{Value, json};

mod fixtures;

use fixtures::genes::{self, ANNOTATED_GENE_ID};

#[tokio::test]
async fn returns_the_source_row_values() -> Result<()> {
    let row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    let reader = genes::create_reader_from_rows(std::slice::from_ref(&row)).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert_eq!(row["gene_id"], gene.gene_id);
    assert_eq!(row["gene_version"], gene.gene_version);
    assert_eq!(row["symbol"], gene.symbol);
    assert_eq!(row["gencode_symbol"], gene.gencode_symbol);
    assert_eq!(row["reference_genome"], gene.reference_genome);
    assert_eq!(row["chrom"], gene.chrom);
    assert_eq!(row["strand"], gene.strand);
    assert_eq!(row["start"], gene.start);
    assert_eq!(row["stop"], gene.stop);
    assert_eq!(row["xstart"], gene.xstart);
    assert_eq!(row["xstop"], gene.xstop);
    assert_eq!(row["hgnc_id"].as_str(), gene.hgnc_id.as_deref());
    assert_eq!(row["ncbi_id"].as_str(), gene.ncbi_id.as_deref());
    assert_eq!(row["omim_id"].as_str(), gene.omim_id.as_deref());
    assert_eq!(row["name"].as_str(), gene.name.as_deref());
    assert_eq!(row["flags"], json!(gene.flags));
    assert_eq!(row["symbol_upper_case"], gene.symbol_upper_case);
    assert_eq!(row["previous_symbols"], json!(gene.previous_symbols));
    assert_eq!(row["alias_symbols"], json!(gene.alias_symbols));
    assert_eq!(row["search_terms"], json!(gene.search_terms));
    assert_eq!(
        row["canonical_transcript_id"].as_str(),
        gene.canonical_transcript_id.as_deref()
    );
    assert_eq!(
        row["preferred_transcript_id"].as_str(),
        gene.preferred_transcript_id.as_deref()
    );
    assert_eq!(
        row["preferred_transcript_source"].as_str(),
        gene.preferred_transcript_source.as_deref()
    );
    assert_eq!(
        row["interval"]["start"]["contig"],
        gene.interval.start.contig
    );
    assert_eq!(
        row["interval"]["end"]["position"],
        gene.interval.end.position
    );
    let mane_select = gene
        .mane_select_transcript
        .expect("supplied MANE Select transcript should exist");
    assert_eq!(
        row["mane_select_transcript"]["ensembl_id"],
        mane_select.ensembl_id
    );
    assert_eq!(
        row["mane_select_transcript"]["refseq_id"],
        mane_select.refseq_id
    );
    Ok(())
}

#[tokio::test]
async fn preserves_gene_exons_in_supplied_order() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["exons"] = json!([
        { "feature_type": "CDS", "start": 120, "stop": 129, "xstart": 24_000_000_120_i64, "xstop": 24_000_000_129_i64 },
        { "feature_type": "UTR", "start": 110, "stop": 119, "xstart": 24_000_000_110_i64, "xstop": 24_000_000_119_i64 }
    ]);
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    let gene_exons: Vec<_> = gene
        .exons
        .iter()
        .map(|exon| {
            (
                exon.feature_type.as_str(),
                exon.start,
                exon.stop,
                exon.xstart,
                exon.xstop,
            )
        })
        .collect();
    assert_eq!(
        gene_exons,
        vec![
            ("CDS", 120, 129, 24_000_000_120, 24_000_000_129),
            ("UTR", 110, 119, 24_000_000_110, 24_000_000_119),
        ]
    );
    Ok(())
}

/// Two transcripts with distinct values for every field, the second without optional data.
fn supplied_transcripts() -> Value {
    json!([
        {
            "transcript_id": "supplied-transcript",
            "transcript_version": "transcript-version",
            "gene_id": ANNOTATED_GENE_ID,
            "gene_version": "source-version",
            "reference_genome": "GRCh38",
            "chrom": "Y",
            "strand": "-",
            "start": 105,
            "stop": 190,
            "xstart": 24_000_000_105_i64,
            "xstop": 24_000_000_190_i64,
            "interval": {
                "start": { "contig": "chrY", "position": 105 },
                "end": { "contig": "chrY", "position": 190 },
                "includes_start": false,
                "includes_end": true
            },
            "exons": [
                { "feature_type": "UTR", "start": 105, "stop": 109, "xstart": 24_000_000_105_i64, "xstop": 24_000_000_109_i64 },
                { "feature_type": "CDS", "start": 110, "stop": 125, "xstart": 24_000_000_110_i64, "xstop": 24_000_000_125_i64 }
            ],
            "gtex_tissue_expression": [
                { "tissue": "tissue-a", "value": 0.0 },
                { "tissue": "tissue-b", "value": null }
            ],
            "refseq_id": "transcript-refseq",
            "refseq_version": "transcript-refseq-version"
        },
        {
            "transcript_id": "second-transcript",
            "transcript_version": "second-version",
            "gene_id": ANNOTATED_GENE_ID,
            "gene_version": "source-version",
            "reference_genome": "GRCh38",
            "chrom": "Y",
            "strand": "-",
            "start": 160,
            "stop": 180,
            "xstart": 24_000_000_160_i64,
            "xstop": 24_000_000_180_i64,
            "interval": {
                "start": { "contig": "chrY", "position": 160 },
                "end": { "contig": "chrY", "position": 180 },
                "includes_start": true,
                "includes_end": true
            },
            "exons": [],
            "gtex_tissue_expression": null,
            "refseq_id": null,
            "refseq_version": null
        }
    ])
}

#[tokio::test]
async fn preserves_transcript_fields_and_exons_independently_of_the_gene_model() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["transcripts"] = supplied_transcripts();
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    let transcript_models: Vec<_> = gene
        .transcripts
        .iter()
        .map(|transcript| {
            (
                transcript.transcript_id.as_str(),
                transcript.start,
                transcript.stop,
            )
        })
        .collect();
    assert_eq!(
        transcript_models,
        vec![
            ("supplied-transcript", 105, 190),
            ("second-transcript", 160, 180)
        ]
    );
    let transcript = gene
        .transcripts
        .first()
        .expect("supplied transcript should exist");
    assert_eq!(transcript.transcript_version, "transcript-version");
    assert_eq!(transcript.gene_id, ANNOTATED_GENE_ID);
    assert_eq!(transcript.gene_version, "source-version");
    assert_eq!(transcript.reference_genome, "GRCh38");
    assert_eq!(transcript.chrom, "Y");
    assert_eq!(transcript.strand, "-");
    assert_eq!(
        (transcript.xstart, transcript.xstop),
        (24_000_000_105, 24_000_000_190)
    );
    assert_eq!(
        transcript.interval,
        GeneInterval {
            start: GeneLocus {
                contig: "chrY".to_owned(),
                position: 105,
            },
            end: GeneLocus {
                contig: "chrY".to_owned(),
                position: 190,
            },
            includes_start: false,
            includes_end: true,
        }
    );
    let transcript_exons: Vec<_> = transcript
        .exons
        .iter()
        .map(|exon| {
            (
                exon.feature_type.as_str(),
                exon.start,
                exon.stop,
                exon.xstart,
                exon.xstop,
            )
        })
        .collect();
    assert_eq!(
        transcript_exons,
        vec![
            ("UTR", 105, 109, 24_000_000_105, 24_000_000_109),
            ("CDS", 110, 125, 24_000_000_110, 24_000_000_125),
        ]
    );
    assert_eq!(transcript.refseq_id.as_deref(), Some("transcript-refseq"));
    assert_eq!(
        transcript.refseq_version.as_deref(),
        Some("transcript-refseq-version")
    );
    let expression: Vec<_> = transcript
        .gtex_tissue_expression
        .as_ref()
        .expect("supplied expression should exist")
        .iter()
        .map(|tissue| (tissue.tissue.as_str(), tissue.value))
        .collect();
    assert_eq!(
        expression,
        vec![("tissue-a", Some(0.0)), ("tissue-b", None)]
    );
    Ok(())
}

#[tokio::test]
async fn preserves_pext_values_including_zero_one_and_null() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["pext"] = json!({
        "regions": [
            {
                "chrom": "chrY",
                "start": 121,
                "stop": 128,
                "mean": 0.25,
                "tissues": [
                    { "tissue": "tissue-a", "value": 0.0 },
                    { "tissue": "tissue-b", "value": 1.0 },
                    { "tissue": "tissue-c", "value": null }
                ]
            },
            { "chrom": "chrY", "start": 141, "stop": 148, "mean": 0.75, "tissues": [] }
        ],
        "flags": ["pext-flag"]
    });
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");
    let pext = gene.pext.expect("supplied pext should exist");

    assert_eq!(pext.flags, vec!["pext-flag"]);
    let regions: Vec<_> = pext
        .regions
        .iter()
        .map(|region| {
            (
                region.chrom.as_str(),
                region.start,
                region.stop,
                region.mean,
            )
        })
        .collect();
    assert_eq!(
        regions,
        vec![("chrY", 121, 128, 0.25), ("chrY", 141, 148, 0.75)]
    );
    let region = pext.regions.first().expect("supplied region should exist");
    let tissues: Vec<_> = region
        .tissues
        .iter()
        .map(|tissue| (tissue.tissue.as_str(), tissue.value))
        .collect();
    assert_eq!(
        tissues,
        vec![
            ("tissue-a", Some(0.0)),
            ("tissue-b", Some(1.0)),
            ("tissue-c", None),
        ]
    );
    let last_region = pext
        .regions
        .last()
        .expect("second supplied region should exist");
    assert!(
        last_region.tissues.is_empty(),
        "Expected an empty tissue list in the second region, got {:?}",
        last_region.tissues
    );
    Ok(())
}

#[tokio::test]
async fn preserves_each_distinct_constraint_value() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["gnomad_constraint"] = json!({
        "gene": "constraint-symbol",
        "gene_id": ANNOTATED_GENE_ID,
        "transcript": "constraint-transcript",
        "canonical": false,
        "mane_select": true,
        "exp_lof": 1.25,
        "exp_mis": 2.25,
        "exp_syn": 3.25,
        "obs_lof": 11,
        "obs_mis": 12,
        "obs_syn": 13,
        "oe_lof": 0.125,
        "oe_lof_lower": 0.0625,
        "oe_lof_upper": 0.1875,
        "oe_lof_percentile": 17,
        "oe_mis": 0.375,
        "oe_mis_lower": 0.3125,
        "oe_mis_upper": 0.4375,
        "oe_syn": 0.625,
        "oe_syn_lower": 0.5625,
        "oe_syn_upper": 0.6875,
        "lof_z": -1.5,
        "mis_z": 2.5,
        "syn_z": -3.5,
        "pli": 0.875,
        "flags": ["constraint-flag"]
    });
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert_eq!(
        gene.gnomad_constraint,
        Some(GeneGnomadConstraint {
            gene: Some("constraint-symbol".to_owned()),
            gene_id: Some(ANNOTATED_GENE_ID.to_owned()),
            transcript: Some("constraint-transcript".to_owned()),
            canonical: Some(false),
            mane_select: Some(true),
            exp_lof: Some(1.25),
            exp_mis: Some(2.25),
            exp_syn: Some(3.25),
            obs_lof: Some(11),
            obs_mis: Some(12),
            obs_syn: Some(13),
            oe_lof: Some(0.125),
            oe_lof_lower: Some(0.0625),
            oe_lof_upper: Some(0.1875),
            oe_lof_percentile: Some(17),
            oe_mis: Some(0.375),
            oe_mis_lower: Some(0.3125),
            oe_mis_upper: Some(0.4375),
            oe_syn: Some(0.625),
            oe_syn_lower: Some(0.5625),
            oe_syn_upper: Some(0.6875),
            lof_z: Some(-1.5),
            mis_z: Some(2.5),
            syn_z: Some(-3.5),
            pli: Some(0.875),
            flags: Some(vec!["constraint-flag".to_owned()]),
        })
    );
    Ok(())
}

#[tokio::test]
async fn normalizes_null_and_all_null_annotations_without_losing_the_gene() -> Result<()> {
    let annotations = ["mane_select_transcript", "pext", "gnomad_constraint"];
    for annotations_are_null_structs in [false, true] {
        let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
        for column in [
            "hgnc_id",
            "ncbi_id",
            "omim_id",
            "name",
            "canonical_transcript_id",
            "preferred_transcript_id",
            "preferred_transcript_source",
            "previous_symbols",
            "alias_symbols",
        ] {
            row[column] = Value::Null;
        }
        row["transcripts"][0]["refseq_id"] = Value::Null;
        row["transcripts"][0]["refseq_version"] = Value::Null;
        row["transcripts"][0]["gtex_tissue_expression"] = Value::Null;
        for annotation in annotations {
            if annotations_are_null_structs {
                for field in row[annotation]
                    .as_object_mut()
                    .expect("annotated gene has this annotation")
                    .values_mut()
                {
                    *field = Value::Null;
                }
            } else {
                row[annotation] = Value::Null;
            }
        }
        let exon_count = row["exons"].as_array().map_or(0, Vec::len);
        let reader = genes::create_reader_from_rows(&[row]).await?;

        let gene = reader
            .fetch_gene_by_id(ANNOTATED_GENE_ID)
            .await?
            .expect("gene must survive missing annotations");

        assert_eq!(gene.gene_id, ANNOTATED_GENE_ID);
        assert!(gene.mane_select_transcript.is_none());
        assert!(gene.pext.is_none());
        assert!(gene.gnomad_constraint.is_none());
        assert!(gene.canonical_transcript_id.is_none());
        assert!(gene.preferred_transcript_id.is_none());
        assert!(gene.preferred_transcript_source.is_none());
        assert!(gene.hgnc_id.is_none());
        assert!(gene.ncbi_id.is_none());
        assert!(gene.omim_id.is_none());
        assert!(gene.name.is_none());
        assert!(gene.previous_symbols.is_none());
        assert!(gene.alias_symbols.is_none());
        assert_eq!(gene.exons.len(), exon_count);
        let transcript = gene.transcripts.first().expect("transcript should survive");
        assert!(transcript.refseq_id.is_none());
        assert!(transcript.refseq_version.is_none());
        assert!(transcript.gtex_tissue_expression.is_none());
    }
    Ok(())
}

#[tokio::test]
async fn preserves_empty_collections_zero_counts_and_partially_missing_constraint() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["flags"] = json!([]);
    row["exons"] = json!([]);
    row["transcripts"][0]["exons"] = json!([]);
    row["transcripts"][0]["gtex_tissue_expression"] = json!([]);
    row["pext"] = json!({ "regions": [], "flags": [] });
    row["gnomad_constraint"]["exp_lof"] = Value::Null;
    row["gnomad_constraint"]["obs_lof"] = json!(0);
    row["gnomad_constraint"]["canonical"] = json!(false);
    row["gnomad_constraint"]["flags"] = json!([]);
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let gene = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await?
        .expect("supplied gene should exist");

    assert!(
        gene.flags.is_empty(),
        "Unexpected gene flags: {:?}",
        gene.flags
    );
    assert!(
        gene.exons.is_empty(),
        "Unexpected gene exons: {:?}",
        gene.exons
    );
    let transcript = gene.transcripts.first().expect("transcript should exist");
    assert!(
        transcript.exons.is_empty(),
        "Unexpected transcript exons: {:?}",
        transcript.exons
    );
    assert!(
        transcript
            .gtex_tissue_expression
            .as_ref()
            .is_some_and(Vec::is_empty),
        "Expected present but empty expression, got {:?}",
        transcript.gtex_tissue_expression
    );
    let pext = gene.pext.expect("empty pext must remain present");
    assert!(
        pext.regions.is_empty(),
        "Unexpected pext regions: {:?}",
        pext.regions
    );
    assert!(
        pext.flags.is_empty(),
        "Unexpected pext flags: {:?}",
        pext.flags
    );
    let constraint = gene
        .gnomad_constraint
        .expect("partial constraint must remain present");
    assert!(constraint.exp_lof.is_none());
    assert_eq!(constraint.obs_lof, Some(0));
    assert_eq!(constraint.canonical, Some(false));
    assert!(
        constraint.flags.as_ref().is_some_and(Vec::is_empty),
        "Expected present but empty constraint flags, got {:?}",
        constraint.flags
    );
    Ok(())
}

#[tokio::test]
async fn filters_exact_ids_without_interpreting_sql_in_input() -> Result<()> {
    let row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    let mut decoy = row.clone();
    decoy["gene_id"] = json!("ENSG00000000002");
    decoy["gene_version"] = json!("decoy-version");
    let symbol = row["symbol"].as_str().expect("symbol").to_owned();
    let reader = genes::create_reader_from_rows(&[row, decoy]).await?;

    let decoy = reader
        .fetch_gene_by_id("ENSG00000000002")
        .await?
        .expect("decoy gene should exist");
    assert_eq!(decoy.gene_version, "decoy-version");
    for gene_id in [
        "ENSG00000000000".to_owned(),
        format!("{ANNOTATED_GENE_ID}.1"),
        symbol,
        format!("{ANNOTATED_GENE_ID}' OR TRUE --"),
    ] {
        assert!(reader.fetch_gene_by_id(&gene_id).await?.is_none());
    }
    Ok(())
}

#[tokio::test]
async fn rejects_duplicate_ids_instead_of_selecting_an_arbitrary_record() -> Result<()> {
    let row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    let reader = genes::create_reader_from_rows(&[row.clone(), row]).await?;

    let error = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await
        .expect_err("duplicate ID must not return an arbitrary gene");
    assert!(error.to_string().contains("Multiple gene records"));
    assert!(error.to_string().contains(ANNOTATED_GENE_ID));
    Ok(())
}

#[tokio::test]
async fn reports_decode_errors_with_the_requested_gene_id() -> Result<()> {
    let mut row = genes::read_gene_row(ANNOTATED_GENE_ID).await?;
    row["gene_version"] = Value::Null;
    let reader = genes::create_reader_from_rows(&[row]).await?;

    let error = reader
        .fetch_gene_by_id(ANNOTATED_GENE_ID)
        .await
        .expect_err("missing required gene version must fail decoding");
    assert!(error.to_string().contains("Failed to decode gene result"));
    assert!(error.to_string().contains(ANNOTATED_GENE_ID));
    Ok(())
}

#[tokio::test]
async fn query_failure_is_not_reported_as_a_missing_gene() {
    let reader = GeneReader::new(SessionContext::new());
    assert!(reader.fetch_gene_by_id(ANNOTATED_GENE_ID).await.is_err());
}

async fn create_parquet_reader() -> Result<GeneReader> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::GeneModelsGrch38,
    )
    .await?;
    Ok(GeneReader::new(context))
}

#[tokio::test]
async fn decodes_populated_annotations_from_the_real_export() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let gene = reader
        .fetch_gene_by_id("ENSG00000169174")
        .await?
        .expect("PCSK9 fixture should exist");

    assert_eq!(gene.gene_id, "ENSG00000169174");
    assert_eq!(gene.symbol, "PCSK9");
    assert_eq!(gene.reference_genome, "GRCh38");
    assert!(!gene.exons.is_empty(), "Require exported gene exons");
    assert!(!gene.transcripts.is_empty(), "Require exported transcripts");
    let canonical_id = gene
        .canonical_transcript_id
        .as_ref()
        .expect("Require exported canonical transcript metadata");
    let canonical = gene
        .transcripts
        .iter()
        .find(|transcript| &transcript.transcript_id == canonical_id)
        .expect("Require the canonical transcript in the exported model");
    assert!(canonical.gtex_tissue_expression.is_some());
    assert!(gene.mane_select_transcript.is_some());
    let pext = gene
        .pext
        .expect("Require populated pext in the real fixture");
    assert!(!pext.regions.is_empty(), "Require exported pext regions");
    assert!(gene.gnomad_constraint.is_some());
    Ok(())
}

#[tokio::test]
async fn decodes_missing_annotations_from_the_real_export() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let gene = reader
        .fetch_gene_by_id("ENSG00000131548")
        .await?
        .expect("TTTY6B fixture should exist");

    assert_eq!(gene.gene_id, "ENSG00000131548");
    assert_eq!(gene.symbol, "TTTY6B");
    assert!(!gene.exons.is_empty(), "Require the exported gene model");
    assert!(!gene.transcripts.is_empty(), "Require exported transcripts");
    assert!(gene.canonical_transcript_id.is_none());
    assert!(gene.mane_select_transcript.is_none());
    assert!(gene.pext.is_none());
    assert!(gene.gnomad_constraint.is_none());
    Ok(())
}
