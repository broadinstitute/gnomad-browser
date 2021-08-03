import hail as hl

from data_pipeline.data_types.locus import x_position


def import_exac_coverage():
    paths = [
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr1.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr10.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr11.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr12.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr13.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr14.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr15.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr16.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr17.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr18.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr19.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr2.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr20.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr21.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr22.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr3.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr4.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr5.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr6.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr7.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr8.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chr9.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chrX.coverage.txt.gz",
        "gs://gcp-public-data--gnomad/legacy/exac_browser/coverage/Panel.chrY.coverage.txt.gz",
    ]

    column_types = {
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

    ds = hl.import_table(paths, types=column_types, force_bgz=True)
    ds = ds.rename(
        {
            "#chrom": "chrom",
            "1": "over_1",
            "5": "over_5",
            "10": "over_10",
            "15": "over_15",
            "20": "over_20",
            "25": "over_25",
            "30": "over_30",
            "50": "over_50",
            "100": "over_100",
        }
    )

    ds = ds.transmute(locus=hl.locus(ds.chrom, ds.pos, reference_genome="GRCh37"))

    ds = ds.key_by(ds.locus)

    ds = ds.annotate(xpos=x_position(ds.locus))

    ds = ds.repartition(1000, shuffle=True)

    return ds
