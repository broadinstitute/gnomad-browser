mod timing;

use gnomad_data_store::{
    CoverageDataset, CoverageReader, GenomicInterval, create_datafusion_context_from_root,
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
    let dataset = match arguments.next().as_deref() {
        Some("gnomad_v4_exome") => CoverageDataset::GnomadV4Exome,
        _ => return Err("provide a coverage dataset: gnomad_v4_exome".into()),
    };
    let gene_id = arguments.next().ok_or("provide a gene ID")?;
    let chromosome = arguments.next().ok_or("provide a chromosome")?;
    let exons = arguments
        .map(|bounds| parse_interval(&chromosome, &bounds))
        .collect::<Result<Vec<_>, _>>()?;
    if exons.is_empty() {
        return Err("provide at least one unpadded exon as start:stop".into());
    }
    let iterations = timing::iterations_from_environment()?;

    let (context, open_duration) = timing::time_open(create_datafusion_context_from_root(
        root,
        dataset.parquet_dataset(),
    ))
    .await?;
    let reader = &CoverageReader::new(context, dataset);
    let gene_id = gene_id.as_str();
    let exons = exons.as_slice();
    let histogram = timing::time_queries(open_duration, iterations, move || async move {
        reader.fetch_coverage_in_gene(gene_id, exons).await
    })
    .await?;

    for bucket in &histogram.buckets {
        println!(
            "{}\t{}\t{}",
            bucket.bucket_start,
            bucket.mean.unwrap_or(f64::NAN),
            bucket.median.unwrap_or(f64::NAN)
        );
    }
    eprintln!(
        "{} buckets of {} bases",
        histogram.buckets.len(),
        histogram.bucket_size
    );

    Ok(())
}
