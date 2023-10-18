from typing import List, Optional
import hail as hl

from data_pipeline.data_types.locus import x_position


def prepare_coverage(coverage_path: str, filter_intervals: Optional[List[str]] = None):
    coverage = hl.read_table(coverage_path)

    coverage = coverage.annotate(xpos=x_position(coverage.locus))

    coverage_fields = coverage.row.dtype.fields

    # Specific to v4, the data is contained in a coverage_stats field and we take the first element
    if "coverage_stats" in coverage_fields:
        if type(coverage.coverage_stats) == hl.expr.expressions.typed_expressions.ArrayStructExpression:
            coverage = coverage.annotate(**coverage.coverage_stats[0])

    # Median field name is different in v3.0.1 vs v2
    if "median" not in coverage_fields:
        coverage = coverage.annotate(median=coverage.median_approx)

    # Drop extra fields in v3
    coverage = coverage.select(
        "xpos",
        "mean",
        "median",
        "over_1",
        "over_5",
        "over_10",
        "over_15",
        "over_20",
        "over_25",
        "over_30",
        "over_50",
        "over_100",
    )

    if filter_intervals:
        intervals = [hl.parse_locus_interval(interval, reference_genome="GRCh38") for interval in filter_intervals]
        coverage = hl.filter_intervals(coverage, intervals)

    return coverage
