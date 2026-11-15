mod timing;

use datafusion::arrow::json::WriterBuilder;
use datafusion::arrow::json::writer::LineDelimited;
use gnomad_data_store::{GnomadV4Reader, ParquetDataset, create_datafusion_context_from_root};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments.next().ok_or("provide a Parquet root directory")?;
    let variant_id = arguments
        .next()
        .ok_or("provide a variant ID (chrom-pos-ref-alt)")?;
    let iterations = timing::iterations_from_environment()?;

    let (context, open_duration) = timing::time_open(create_datafusion_context_from_root(
        root,
        ParquetDataset::GnomadVariantsV4,
    ))
    .await?;
    let reader = &GnomadV4Reader::new(context);
    let variant_id = variant_id.as_str();
    let batches = timing::time_queries(open_duration, iterations, move || async move {
        reader.fetch_single_variant_batches(variant_id).await
    })
    .await?;

    let mut json = Vec::new();
    let mut writer = WriterBuilder::new()
        .with_explicit_nulls(true)
        .build::<_, LineDelimited>(&mut json);
    for batch in &batches {
        writer.write(batch)?;
    }
    writer.finish()?;
    drop(writer);
    if json.is_empty() {
        println!("null");
    } else {
        print!("{}", String::from_utf8(json)?);
    }

    Ok(())
}
