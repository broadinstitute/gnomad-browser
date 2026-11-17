mod timing;

use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context_from_root};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments
        .next()
        .ok_or("provide a Parquet root directory followed by a variant ID")?;
    let variant_id = arguments
        .next()
        .ok_or("provide a variant ID, for example 1-66926-AG-A")?;
    if arguments.next().is_some() {
        return Err("usage: read_clinvar_variant <root> <variant-id>".into());
    }
    let iterations = timing::iterations_from_environment()?;

    let (context, open_duration) = timing::time_open(create_datafusion_context_from_root(
        root,
        ParquetDataset::ClinvarVariantsGrch38,
    ))
    .await?;
    let reader = &ClinvarReader::new(context);
    let variant_id = variant_id.as_str();
    let variant = timing::time_queries(open_duration, iterations, move || {
        reader.fetch_single_variant(variant_id)
    })
    .await?;

    println!("{variant:#?}");

    Ok(())
}
