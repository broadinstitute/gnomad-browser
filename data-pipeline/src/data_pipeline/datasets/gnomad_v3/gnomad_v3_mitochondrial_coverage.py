import hail as hl

from data_pipeline.data_types.locus import x_position


def prepare_mitochondrial_coverage(coverage_path):
    coverage = hl.read_table(coverage_path)

    coverage = coverage.annotate(xpos=x_position(coverage.locus))

    coverage = coverage.select("xpos", "mean", "median", "over_100", "over_1000")

    return coverage
