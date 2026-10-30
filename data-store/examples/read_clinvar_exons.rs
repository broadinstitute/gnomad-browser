use std::time::Instant;

use gnomad_data_store::{
    ClinvarReader, GenomicInterval, ParquetDataset, create_datafusion_context_from_root,
};

fn parse_interval(
    chromosome: &str,
    bounds: &str,
) -> Result<GenomicInterval, Box<dyn std::error::Error>> {
    let (start, stop) = bounds
        .split_once(':')
        .ok_or_else(|| format!("Invalid interval {bounds}: expected start:stop"))?;
    let interval = GenomicInterval::new(chromosome, start.parse::<i32>()?, stop.parse::<i32>()?)
        .map_err(|error| format!("Invalid interval {bounds}: {error}"))?;
    Ok(interval)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments.next().ok_or("provide a Parquet root directory")?;
    let annotation_kind = arguments.next().ok_or("provide gene or transcript")?;
    if !matches!(annotation_kind.as_str(), "gene" | "transcript") {
        return Err("annotation kind must be gene or transcript".into());
    }
    let annotation_id = arguments.next().ok_or("provide an annotation ID")?;
    let chromosome = arguments.next().ok_or("provide a chromosome")?;
    let intervals = arguments
        .map(|bounds| parse_interval(&chromosome, &bounds))
        .collect::<Result<Vec<_>, _>>()?;
    if intervals.is_empty() {
        return Err("provide at least one unpadded interval as start:stop".into());
    }

    let context =
        create_datafusion_context_from_root(root, ParquetDataset::ClinvarVariantsGrch38).await?;
    let reader = ClinvarReader::new(context);
    let query_started_at = Instant::now();
    let variants = if annotation_kind == "gene" {
        reader
            .fetch_variants_in_gene(&annotation_id, &intervals)
            .await?
    } else {
        reader
            .fetch_variants_in_transcript(&annotation_id, &intervals)
            .await?
    };
    let query_duration = query_started_at.elapsed();

    println!("{variants:#?}");
    eprintln!("{} variants in {query_duration:?}", variants.len());

    Ok(())
}
