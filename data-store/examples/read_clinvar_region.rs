use std::time::Instant;

use gnomad_data_store::{ClinvarReader, GenomicInterval, create_datafusion_context};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let path = arguments
        .next()
        .ok_or("provide a Parquet file or directory path")?;
    let chromosome = arguments
        .next()
        .ok_or("provide a chromosome, such as 1 or X")?;
    let start = arguments
        .next()
        .ok_or("provide a start coordinate")?
        .parse::<i32>()?;
    let stop = arguments
        .next()
        .ok_or("provide a stop coordinate")?
        .parse::<i32>()?;

    if arguments.next().is_some() {
        return Err("usage: read_clinvar_region <path> <chromosome> <start> <stop>".into());
    }

    let interval = GenomicInterval::new(&chromosome, start, stop)
        .map_err(|error| format!("Invalid genomic interval: {error:?}"))?;
    let context = create_datafusion_context(&path).await?;
    let reader = ClinvarReader::new(context);

    let query_started_at = Instant::now();
    let variants = reader.fetch_variants_in_region(&interval).await?;
    let query_duration = query_started_at.elapsed();

    println!("{variants:#?}");
    eprintln!("{} variants in {query_duration:?}", variants.len());

    Ok(())
}
