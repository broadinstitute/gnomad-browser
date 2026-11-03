use std::io::{BufWriter, Write};
use std::time::Instant;

use gnomad_data_store::GnomadV4Reader;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments
        .next()
        .ok_or("provide ROOT and a variant ID, rsID, or VRS ID")?;
    let variant_id = arguments
        .next()
        .ok_or("provide a variant ID, rsID, or VRS ID")?;
    if arguments.next().is_some() {
        return Err("expected ROOT and one identifier".into());
    }

    let started = Instant::now();
    let reader = GnomadV4Reader::open(root).await?;
    eprintln!("Initialization: {:?}", started.elapsed());
    let started = Instant::now();
    let variant = reader.fetch_single_variant(&variant_id).await?;
    eprintln!("Query: {:?}", started.elapsed());

    let mut output = BufWriter::new(std::io::stdout().lock());
    serde_json::to_writer_pretty(&mut output, &variant)?;
    writeln!(output)?;
    output.flush()?;
    Ok(())
}
