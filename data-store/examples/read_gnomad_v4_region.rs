use std::io::{self, BufWriter, Write};
use std::time::Instant;

use gnomad_data_store::{GenomicInterval, GnomadV4Reader, GnomadV4Subset};

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
    let subset = match arguments.next().as_deref() {
        Some("all") => GnomadV4Subset::All,
        Some("non_ukb") => GnomadV4Subset::NonUkb,
        _ => return Err("provide an exome subset: all or non_ukb".into()),
    };
    let print_variants = match arguments.next().as_deref() {
        None => false,
        Some("--print-variants") => true,
        _ => return Err("use --print-variants for full records".into()),
    };
    if arguments.next().is_some() {
        return Err(
            "usage: read_gnomad_v4_region ROOT CHROM START STOP all|non_ukb [--print-variants]"
                .into(),
        );
    }
    let interval = GenomicInterval::new(&chromosome, start, stop)
        .map_err(|error| format!("Invalid genomic interval: {error:?}"))?;
    let started = Instant::now();
    let reader = GnomadV4Reader::open(root).await?;
    eprintln!("Store initialization: {:?}", started.elapsed());
    let started = Instant::now();
    let variants = reader.fetch_variants_in_region(&interval, subset).await?;
    eprintln!(
        "{} source records; query: {:?}",
        variants.len(),
        started.elapsed()
    );
    if print_variants {
        let started = Instant::now();
        let mut output = BufWriter::new(io::stdout().lock());
        serde_json::to_writer(&mut output, &variants)?;
        writeln!(output)?;
        output.flush()?;
        eprintln!("Variant output: {:?}", started.elapsed());
    }
    Ok(())
}
