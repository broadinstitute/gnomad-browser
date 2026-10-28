use gnomad_data_store::{ClinvarReader, create_datafusion_context};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::env::args()
        .nth(1)
        .ok_or("provide a Parquet file path")?;

    let context = create_datafusion_context(&path).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader.fetch_single_variant("1-66926-AG-A").await?;

    println!("{variant:#?}");

    Ok(())
}
