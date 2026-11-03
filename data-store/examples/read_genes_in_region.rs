use std::time::Instant;

use gnomad_data_store::{
    GeneReader, GenomicInterval, ParquetDataset, create_datafusion_context_from_root,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments.next().ok_or("provide a Parquet root directory")?;
    let chromosome = arguments.next().ok_or("provide a chromosome")?;
    let start = arguments
        .next()
        .ok_or("provide a start coordinate")?
        .parse()?;
    let stop = arguments
        .next()
        .ok_or("provide a stop coordinate")?
        .parse()?;
    if arguments.next().is_some() {
        return Err("usage: read_genes_in_region ROOT CHROM START STOP".into());
    }
    let interval = GenomicInterval::new(&chromosome, start, stop)
        .map_err(|error| format!("Invalid genomic interval: {error:?}"))?;
    let started = Instant::now();
    let context =
        create_datafusion_context_from_root(root, ParquetDataset::GeneModelsGrch38).await?;
    let reader = GeneReader::new(context);
    eprintln!("Store initialization: {:?}", started.elapsed());
    let started = Instant::now();
    let genes = reader.fetch_genes_in_region(&interval).await?;
    eprintln!("{} genes; query: {:?}", genes.len(), started.elapsed());
    for gene in &genes {
        println!(
            "{} {} {}-{} exons={} transcripts={}",
            gene.gene_id,
            gene.symbol,
            gene.start,
            gene.stop,
            gene.exons.len(),
            gene.transcripts.len()
        );
    }
    Ok(())
}
