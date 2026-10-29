use gnomad_data_store::{Chromosome, GenomicInterval, GenomicIntervalError};

#[test]
fn accepts_each_canonical_chromosome_and_preserves_coordinates() {
    for (name, chromosome) in [
        ("1", Chromosome::Chr1),
        ("2", Chromosome::Chr2),
        ("3", Chromosome::Chr3),
        ("4", Chromosome::Chr4),
        ("5", Chromosome::Chr5),
        ("6", Chromosome::Chr6),
        ("7", Chromosome::Chr7),
        ("8", Chromosome::Chr8),
        ("9", Chromosome::Chr9),
        ("10", Chromosome::Chr10),
        ("11", Chromosome::Chr11),
        ("12", Chromosome::Chr12),
        ("13", Chromosome::Chr13),
        ("14", Chromosome::Chr14),
        ("15", Chromosome::Chr15),
        ("16", Chromosome::Chr16),
        ("17", Chromosome::Chr17),
        ("18", Chromosome::Chr18),
        ("19", Chromosome::Chr19),
        ("20", Chromosome::Chr20),
        ("21", Chromosome::Chr21),
        ("22", Chromosome::Chr22),
        ("X", Chromosome::ChrX),
        ("Y", Chromosome::ChrY),
        ("M", Chromosome::ChrM),
    ] {
        let interval = GenomicInterval::new(name, 1, 200)
            .expect("canonical chromosome should produce a valid interval");

        assert_eq!(interval.chromosome(), chromosome, "chromosome: {name}");
        assert_eq!(interval.start(), 1);
        assert_eq!(interval.stop(), 200);
    }
}

#[test]
fn accepts_single_position_interval() {
    let interval =
        GenomicInterval::new("1", 100, 100).expect("single-position interval should be valid");

    assert_eq!(interval.chromosome(), Chromosome::Chr1);
    assert_eq!(interval.start(), 100);
    assert_eq!(interval.stop(), 100);
}

#[test]
fn rejects_invalid_or_noncanonical_chromosomes() {
    for chromosome in [
        "", " ", "\t\n", "0", "23", "-1", "chr1", "x", "y", "m", "MT", "01", " 1", "1 ",
    ] {
        assert_eq!(
            GenomicInterval::new(chromosome, 1, 200),
            Err(GenomicIntervalError::InvalidChromosome),
            "chromosome: {chromosome:?}"
        );
    }
}

#[test]
fn rejects_zero_start() {
    assert_eq!(
        GenomicInterval::new("1", 0, 200),
        Err(GenomicIntervalError::NonPositiveStart)
    );
}

#[test]
fn rejects_negative_start() {
    assert_eq!(
        GenomicInterval::new("1", -1, 200),
        Err(GenomicIntervalError::NonPositiveStart)
    );
}

#[test]
fn rejects_stops_before_start() {
    for (start, stop) in [(100, 99), (1, 0), (1, -1), (1, i32::MIN)] {
        assert_eq!(
            GenomicInterval::new("1", start, stop),
            Err(GenomicIntervalError::StopBeforeStart),
            "start: {start}, stop: {stop}"
        );
    }
}

#[test]
fn describes_each_error_for_callers() {
    for (error, message) in [
        (
            GenomicIntervalError::InvalidChromosome,
            "chromosome must be one of 1-22, X, Y or M",
        ),
        (
            GenomicIntervalError::NonPositiveStart,
            "start must be at least 1",
        ),
        (
            GenomicIntervalError::StopBeforeStart,
            "stop must not be before start",
        ),
    ] {
        assert_eq!(error.to_string(), message);
    }
}
