use gnomad_data_store::{GeneReader, ParquetDataset, create_datafusion_context_from_root};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args_os().skip(1);
    let root = arguments
        .next()
        .ok_or("provide a Parquet root directory followed by a gene ID")?;
    let gene_id = arguments
        .next()
        .ok_or("provide a gene ID, for example ENSG00000169174")?
        .into_string()
        .map_err(|_| "gene ID must be valid UTF-8")?;

    let context =
        create_datafusion_context_from_root(root, ParquetDataset::GeneModelsGrch38).await?;
    let reader = GeneReader::new(context);
    let gene = reader
        .fetch_gene_by_id(&gene_id)
        .await?
        .ok_or_else(|| format!("Gene not found: {gene_id}"))?;

    println!("{gene:#?}");
    Ok(())
}
