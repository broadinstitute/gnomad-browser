from typing import List, Optional
import hail as hl

from data_pipeline.data_types.locus import x_position
from pprint import pp


def prepare_coverage(coverage_path: str, filter_intervals: Optional[List[str]] = None):
    coverage = None
    if coverage_path.endswith("tsv") or coverage_path.endswith("tsv.gz"):
        coverage = hl.methods.import_table(
            coverage_path,
            types={
                "f0": hl.tstr,
                "f1": hl.tint32,
                "f2": hl.tstr,  # going to discard this so no need to cast
                "f3": hl.tfloat64,
                "f4": hl.tint32,
                "f5": hl.tint64,
                "f6": hl.tfloat64,
                "f7": hl.tfloat64,
                "f8": hl.tfloat64,
                "f9": hl.tfloat64,
                "f10": hl.tfloat64,
                "f11": hl.tfloat64,
                "f12": hl.tfloat64,
                "f13": hl.tfloat64,
                "f14": hl.tfloat64,
            },
            no_header=True,
            force_bgz=True,
        )
        coverage = coverage.transmute(
            locus=hl.locus(coverage.f0, coverage.f1, "GRCh38"),
            mean=coverage.f3,
            median_approx=coverage.f4,
            total_DP=coverage.f5,
            over_1=coverage.f6,
            over_5=coverage.f7,
            over_10=coverage.f8,
            over_15=coverage.f9,
            over_20=coverage.f10,
            over_25=coverage.f11,
            over_30=coverage.f12,
            over_50=coverage.f13,
            over_100=coverage.f14,
        )
        coverage = coverage.drop(coverage.f2)
        coverage = coverage.key_by(coverage.locus)
    else:
        coverage = hl.read_table(coverage_path)

    coverage = coverage.annotate(xpos=x_position(coverage.locus))

    coverage_fields = coverage.row.dtype.fields

    # Specific to v4, the data is contained in a coverage_stats field and we take the first element
    if "coverage_stats" in coverage_fields:
        if type(coverage.coverage_stats) is hl.expr.expressions.typed_expressions.ArrayStructExpression:
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
