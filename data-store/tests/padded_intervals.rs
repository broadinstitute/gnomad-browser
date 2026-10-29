#![allow(clippy::panic_in_result_fn)]

use gnomad_data_store::{GenomicInterval, GenomicIntervalError, pad_and_merge_intervals};

const EXON_PADDING: u32 = 75;

#[test]
fn pads_both_ends_by_75_bases() -> Result<(), GenomicIntervalError> {
    let intervals = [GenomicInterval::new("1", 100, 200)?];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(padded, [GenomicInterval::new("1", 25, 275)?]);
    assert_eq!(intervals, [GenomicInterval::new("1", 100, 200)?]);
    Ok(())
}

#[test]
fn clamps_padded_start_to_one() -> Result<(), GenomicIntervalError> {
    let intervals = [GenomicInterval::new("1", 25, 50)?];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(padded, [GenomicInterval::new("1", 1, 125)?]);
    Ok(())
}

#[test]
fn sorts_and_merges_intervals_that_overlap_after_padding() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("1", 300, 350)?,
        GenomicInterval::new("1", 100, 150)?,
        GenomicInterval::new("1", 150, 200)?,
    ];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(padded, [GenomicInterval::new("1", 25, 425)?]);
    Ok(())
}

#[test]
fn merges_immediately_adjacent_padded_intervals() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("1", 100, 100)?,
        GenomicInterval::new("1", 251, 251)?,
    ];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(padded, [GenomicInterval::new("1", 25, 326)?]);
    Ok(())
}

#[test]
fn preserves_a_single_base_gap_between_padded_intervals() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("1", 100, 100)?,
        GenomicInterval::new("1", 252, 252)?,
    ];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(
        padded,
        [
            GenomicInterval::new("1", 25, 175)?,
            GenomicInterval::new("1", 177, 327)?,
        ]
    );
    Ok(())
}

#[test]
fn collapses_duplicate_and_contained_intervals() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("1", 100, 300)?,
        GenomicInterval::new("1", 150, 200)?,
        GenomicInterval::new("1", 100, 300)?,
    ];

    let merged = pad_and_merge_intervals(&intervals, 0)?;

    assert_eq!(merged, [GenomicInterval::new("1", 100, 300)?]);
    Ok(())
}

#[test]
fn keeps_chromosomes_separate_and_sorts_them_numerically() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("10", 100, 200)?,
        GenomicInterval::new("2", 100, 200)?,
        GenomicInterval::new("1", 100, 200)?,
    ];

    let padded = pad_and_merge_intervals(&intervals, EXON_PADDING)?;

    assert_eq!(
        padded,
        [
            GenomicInterval::new("1", 25, 275)?,
            GenomicInterval::new("2", 25, 275)?,
            GenomicInterval::new("10", 25, 275)?,
        ]
    );
    Ok(())
}

#[test]
fn returns_no_intervals_for_empty_input() -> Result<(), GenomicIntervalError> {
    let padded = pad_and_merge_intervals(&[], EXON_PADDING)?;

    assert!(padded.is_empty(), "unexpected intervals: {padded:?}");
    Ok(())
}

#[test]
fn rejects_padding_that_overflows_stop() -> Result<(), GenomicIntervalError> {
    let intervals = [GenomicInterval::new("1", i32::MAX, i32::MAX)?];

    assert_eq!(
        pad_and_merge_intervals(&intervals, EXON_PADDING),
        Err(GenomicIntervalError::PaddingOverflow)
    );
    Ok(())
}

#[test]
fn rejects_padding_larger_than_coordinate_representation() -> Result<(), GenomicIntervalError> {
    let intervals = [GenomicInterval::new("1", 100, 200)?];

    assert_eq!(
        pad_and_merge_intervals(&intervals, u32::MAX),
        Err(GenomicIntervalError::PaddingOverflow)
    );
    Ok(())
}

#[test]
fn merges_intervals_at_maximum_coordinate_without_overflow() -> Result<(), GenomicIntervalError> {
    let intervals = [
        GenomicInterval::new("1", i32::MAX, i32::MAX)?,
        GenomicInterval::new("1", i32::MAX, i32::MAX)?,
    ];

    let merged = pad_and_merge_intervals(&intervals, 0)?;

    assert_eq!(merged, [GenomicInterval::new("1", i32::MAX, i32::MAX)?]);
    Ok(())
}
