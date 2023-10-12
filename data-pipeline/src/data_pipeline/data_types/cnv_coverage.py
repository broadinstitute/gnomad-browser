import hail as hl



def prepare_cnv_track_callable_coverage(coverage_path):
    coverage = hl.import_table(coverage_path, force_bgz=True)

    coverage = coverage.select(
        "xpos",
        "percent_callable"
    )

    return coverage
