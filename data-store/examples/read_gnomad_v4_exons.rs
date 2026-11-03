use std::io::{self, BufWriter, Write};
use std::time::Instant;

use gnomad_data_store::{
    GenomicInterval, GnomadV4Frequency, GnomadV4Reader, GnomadV4Subset, GnomadV4VariantListEntry,
};

fn parse_interval(
    chromosome: &str,
    bounds: &str,
) -> Result<GenomicInterval, Box<dyn std::error::Error>> {
    let (start, stop) = bounds
        .split_once(':')
        .ok_or_else(|| format!("Invalid interval {bounds}: expected start:stop"))?;
    GenomicInterval::new(chromosome, start.parse()?, stop.parse()?)
        .map_err(|error| format!("Invalid interval {bounds}: {error:?}").into())
}

fn select_exome_frequency(
    variant: &GnomadV4VariantListEntry,
    subset: GnomadV4Subset,
) -> Option<&GnomadV4Frequency> {
    match subset {
        GnomadV4Subset::All => variant.exome.freq.all.as_ref(),
        GnomadV4Subset::NonUkb => variant.exome.freq.non_ukb.as_ref(),
    }
}

fn has_positive_raw_alleles(frequency: Option<&GnomadV4Frequency>) -> bool {
    frequency.is_some_and(|frequency| frequency.ac_raw.is_some_and(|ac| ac > 0))
}

fn has_pass_adjusted_alleles(
    frequency: Option<&GnomadV4Frequency>,
    filters: Option<&[String]>,
) -> bool {
    has_positive_raw_alleles(frequency)
        && frequency.is_some_and(|frequency| frequency.ac.is_some_and(|ac| ac > 0))
        && filters.is_some_and(<[String]>::is_empty)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let root = arguments.next().ok_or("provide a Parquet root directory")?;
    let annotation_kind = arguments.next().ok_or("provide gene or transcript")?;
    if !matches!(annotation_kind.as_str(), "gene" | "transcript") {
        return Err("annotation kind must be gene or transcript".into());
    }
    let annotation_id = arguments.next().ok_or("provide an annotation ID")?;
    let subset = match arguments.next().as_deref() {
        Some("all") => GnomadV4Subset::All,
        Some("non_ukb") => GnomadV4Subset::NonUkb,
        _ => return Err("provide an exome subset: all or non_ukb".into()),
    };
    let chromosome = arguments.next().ok_or("provide a chromosome")?;
    let mut print_variants = false;
    let mut intervals = Vec::new();
    for argument in arguments {
        if argument == "--print-variants" {
            print_variants = true;
        } else if argument.starts_with("--") {
            return Err(format!(
                "Unknown option: {argument}; use --print-variants for full records"
            )
            .into());
        } else {
            intervals.push(parse_interval(&chromosome, &argument)?);
        }
    }
    if intervals.is_empty() {
        return Err("provide at least one unpadded CDS/exon interval as start:stop".into());
    }

    eprintln!("Store initialization started: {root}");
    let startup_started_at = Instant::now();
    let reader = GnomadV4Reader::open(root).await?;
    eprintln!("Store initialization: {:?}", startup_started_at.elapsed());
    eprintln!("Variant query started: {annotation_kind} {annotation_id}, subset {subset:?}");
    let query_started_at = Instant::now();
    let variants = if annotation_kind == "gene" {
        reader
            .fetch_variants_in_gene(&annotation_id, &intervals, subset)
            .await?
    } else {
        reader
            .fetch_variants_in_transcript(&annotation_id, &intervals, subset)
            .await?
    };
    let query_duration = query_started_at.elapsed();
    let raw_count = variants
        .iter()
        .filter(|variant| {
            has_positive_raw_alleles(select_exome_frequency(variant, subset))
                || has_positive_raw_alleles(variant.genome.freq.all.as_ref())
        })
        .count();
    let pass_count = variants
        .iter()
        .filter(|variant| {
            has_pass_adjusted_alleles(
                select_exome_frequency(variant, subset),
                variant.exome.filters.as_deref(),
            ) || has_pass_adjusted_alleles(
                variant.genome.freq.all.as_ref(),
                variant.genome.filters.as_deref(),
            )
        })
        .count();

    eprintln!(
        "{} source records; {raw_count} raw-AC variants; {pass_count} with PASS and positive adjusted AC in exomes or genomes; query: {query_duration:?}",
        variants.len()
    );
    if print_variants {
        eprintln!("Variant output started");
        let output_started_at = Instant::now();
        let mut output = BufWriter::new(io::stdout().lock());
        writeln!(output, "{variants:#?}")?;
        output.flush()?;
        eprintln!("Variant output completed: {:?}", output_started_at.elapsed());
    }
    Ok(())
}
