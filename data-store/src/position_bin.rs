use std::collections::BTreeSet;

use datafusion::common::ScalarValue;

use crate::GenomicInterval;
use crate::exon_query::bind_parameter;

/// Directory `posbin=b` holds positions `b * POSITION_BIN_SIZE + 1 ..= (b + 1) * POSITION_BIN_SIZE`.
const POSITION_BIN_SIZE: i32 = 1_000_000;

const fn position_bin(position: i32) -> i32 {
    position.saturating_sub(1).saturating_div(POSITION_BIN_SIZE)
}

pub fn collect_position_bins(intervals: &[GenomicInterval]) -> BTreeSet<i32> {
    intervals
        .iter()
        .flat_map(|interval| position_bin(interval.start())..=position_bin(interval.stop()))
        .collect()
}

pub fn bind_position_bins(
    intervals: &[GenomicInterval],
    parameters: &mut Vec<ScalarValue>,
) -> String {
    collect_position_bins(intervals)
        .into_iter()
        .map(|bin| bind_parameter(parameters, ScalarValue::Utf8(Some(bin.to_string()))))
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::collect_position_bins;
    use crate::GenomicInterval;

    fn bins(intervals: &[(i32, i32)]) -> Vec<i32> {
        let intervals: Vec<_> = intervals
            .iter()
            .map(|&(start, stop)| GenomicInterval::new("17", start, stop).expect("valid interval"))
            .collect();
        collect_position_bins(&intervals).into_iter().collect()
    }

    #[test]
    fn places_each_megabase_boundary_in_the_lower_bin() {
        assert_eq!(bins(&[(1, 1)]), [0]);
        assert_eq!(bins(&[(1_000_000, 1_000_000)]), [0]);
        assert_eq!(bins(&[(1_000_001, 1_000_001)]), [1]);
        assert_eq!(bins(&[(16_000_000, 16_000_000)]), [15]);
    }

    #[test]
    fn covers_every_bin_an_interval_spans() {
        assert_eq!(bins(&[(15_999_709, 16_000_457)]), [15, 16]);
        assert_eq!(bins(&[(999_999, 3_000_001)]), [0, 1, 2, 3]);
    }

    #[test]
    fn lists_each_bin_once_across_intervals() {
        assert_eq!(
            bins(&[(16_044_428, 16_044_627), (16_001_840, 16_002_100)]),
            [16]
        );
        assert_eq!(
            bins(&[(5_000_000, 5_000_001), (5_500_000, 5_500_000)]),
            [4, 5]
        );
    }
}
