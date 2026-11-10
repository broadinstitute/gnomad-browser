mod timing;

use std::convert::Infallible;
use std::future;

use gnomad_data_store::{GeneReader, ParquetDataset, create_datafusion_context_from_root};

const SEARCH_RESULT_LIMIT: usize = 5;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments
        .next()
        .ok_or("provide a Parquet root directory followed by a search query")?;
    let query = arguments
        .next()
        .ok_or("provide a search query, for example PCSK")?;
    if arguments.next().is_some() {
        return Err("usage: read_gene_search <root> <query>".into());
    }
    let iterations = timing::iterations_from_environment()?;

    let (index, open_duration) = timing::time_open(async {
        let context =
            create_datafusion_context_from_root(root, ParquetDataset::GeneModelsGrch38).await?;
        GeneReader::new(context).load_gene_index().await
    })
    .await?;
    let index = &index;
    let query = query.as_str();
    let genes = timing::time_queries(open_duration, iterations, move || {
        future::ready(Ok::<_, Infallible>(
            index.search(query, SEARCH_RESULT_LIMIT),
        ))
    })
    .await?;

    println!("{genes:#?}");

    Ok(())
}
