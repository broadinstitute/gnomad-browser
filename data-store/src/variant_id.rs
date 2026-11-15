use datafusion::error::DataFusionError;

pub struct ParsedVariantId<'a> {
    pub chromosome: &'a str,
    pub position: i32,
    pub reference_allele: &'a str,
    pub alternate_allele: &'a str,
}

/// Accept the `chrom-pos-ref-alt` form the API's `normalizeVariantId` produces, which keeps `MT`
/// and allows position 0. `dataset` names the dataset in the error message.
pub fn parse_variant_id<'a>(
    variant_id: &'a str,
    dataset: &str,
) -> datafusion::error::Result<ParsedVariantId<'a>> {
    let invalid = || {
        DataFusionError::Plan(format!(
            "Invalid {dataset} variant ID {variant_id:?}: expected chrom-pos-ref-alt"
        ))
    };
    let mut parts = variant_id.split('-');
    let (Some(chromosome), Some(position), Some(reference), Some(alternate), None) = (
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
        parts.next(),
    ) else {
        return Err(invalid());
    };
    let is_digits = |text: &str| !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit());
    let is_allele =
        |allele: &str| !allele.is_empty() && allele.bytes().all(|byte| b"ACGTN".contains(&byte));
    let is_chromosome = matches!(chromosome, "X" | "Y" | "M" | "MT")
        || (is_digits(chromosome)
            && chromosome
                .parse::<u8>()
                .is_ok_and(|number| (1..=22).contains(&number)));
    let position = is_digits(position)
        .then(|| position.parse::<i32>().ok())
        .flatten();
    match position {
        Some(position) if is_chromosome && is_allele(reference) && is_allele(alternate) => {
            Ok(ParsedVariantId {
                chromosome,
                position,
                reference_allele: reference,
                alternate_allele: alternate,
            })
        }
        _ => Err(invalid()),
    }
}
