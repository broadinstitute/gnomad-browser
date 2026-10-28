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

    let context =
        create_datafusion_context_from_root(root, ParquetDataset::ClinvarVariantsGrch38).await?;
    let reader = ClinvarReader::new(context);
    let variant = reader.fetch_single_variant(&variant_id).await?;

    println!("{variant:#?}");

    Ok(())
}
