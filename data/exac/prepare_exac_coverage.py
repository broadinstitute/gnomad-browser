import argparse

import hail as hl


EXAC_COVERAGE_CSV_PATHS = [
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr1.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr10.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr11.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr12.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr13.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr14.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr15.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr16.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr17.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr18.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr19.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr2.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr20.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr21.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr22.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr3.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr4.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr5.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr6.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr7.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr8.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chr9.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chrX.coverage.txt.gz",
    "gs://gnomad-public/legacy/exac_browser/coverage/Panel.chrY.coverage.txt.gz",
]


COLUMN_TYPES = {
    "#chrom": hl.tstr,
    "pos": hl.tint,
    "mean": hl.tfloat,
    "median": hl.tfloat,
    "1": hl.tfloat,
    "5": hl.tfloat,
    "10": hl.tfloat,
    "15": hl.tfloat,
    "20": hl.tfloat,
    "25": hl.tfloat,
    "30": hl.tfloat,
    "50": hl.tfloat,
    "100": hl.tfloat,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output")
    args = parser.parse_args()

    ds = hl.import_table(EXAC_COVERAGE_CSV_PATHS, types=COLUMN_TYPES)
    ds = ds.rename(
        {
            "#chrom": "chrom",
            "1": "over1",
            "5": "over5",
            "10": "over10",
            "15": "over15",
            "20": "over20",
            "25": "over25",
            "30": "over30",
            "50": "over50",
            "100": "over100",
        }
    )

    ds.write(args.output)


if __name__ == "__main__":
    main()
