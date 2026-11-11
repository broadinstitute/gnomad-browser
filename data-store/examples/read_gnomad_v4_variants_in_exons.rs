mod timing;

use gnomad_data_store::{
    GenomicInterval, GnomadV4Reader, GnomadV4Subset, ParquetDataset,
    create_datafusion_context_from_root,
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
    let subset = match arguments.next().as_deref() {
        Some("all") => GnomadV4Subset::All,
        Some("non_ukb") => GnomadV4Subset::NonUkb,
        _ => return Err("provide an exome subset: all or non_ukb".into()),
    };
    let chromosome = arguments.next().ok_or("provide a chromosome")?;
    let intervals = arguments
        .map(|bounds| parse_interval(&chromosome, &bounds))
        .collect::<Result<Vec<_>, _>>()?;
    if intervals.is_empty() {
        return Err("provide at least one unpadded interval as start:stop".into());
    }
    let iterations = timing::iterations_from_environment()?;

    let (context, open_duration) = timing::time_open(create_datafusion_context_from_root(
        root,
        ParquetDataset::GnomadVariantsV4,
    ))
    .await?;
    let reader = &GnomadV4Reader::new(context);
    let is_gene = annotation_kind == "gene";
    let annotation_id = annotation_id.as_str();
    let intervals = intervals.as_slice();
    let variants = timing::time_queries(open_duration, iterations, move || async move {
        if is_gene {
            reader
                .fetch_variants_in_gene(annotation_id, intervals, subset)
                .await
        } else {
            reader
                .fetch_variants_in_transcript(annotation_id, intervals, subset)
                .await
        }
    })
    .await?;

    for variant in &variants {
        println!("{}", variant.variant_id);
    }
    eprintln!("{} variants", variants.len());

    Ok(())
}
