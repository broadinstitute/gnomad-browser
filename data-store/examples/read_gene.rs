mod timing;

use gnomad_data_store::{GeneReader, ParquetDataset, create_datafusion_context_from_root};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments
        .next()
        .ok_or("provide a Parquet root directory followed by a gene ID")?;
    let gene_id = arguments
        .next()
        .ok_or("provide a gene ID, for example ENSG00000169174")?;
    if arguments.next().is_some() {
        return Err("usage: read_gene <root> <gene-id>".into());
    }
    let iterations = timing::iterations_from_environment()?;

    let (context, open_duration) = timing::time_open(create_datafusion_context_from_root(
        root,
        ParquetDataset::GeneModelsGrch38,
    ))
    .await?;
    let reader = &GeneReader::new(context);
    let gene_id = gene_id.as_str();
    let gene = timing::time_queries(open_duration, iterations, move || {
        reader.fetch_gene_by_id(gene_id)
    })
    .await?;

    println!("{gene:#?}");

    Ok(())
}
