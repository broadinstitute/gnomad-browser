import argparse

import hail as hl

from data_utils.computed_fields import normalized_contig, x_position


def format_coverage_table(ds):
    ds = ds.select(
        chrom=normalized_contig(ds.locus),
        pos=ds.locus.position,
        xpos=x_position(ds.locus),
        mean=ds.mean,
        median=ds.median,
        over1=ds.over_1,
        over5=ds.over_5,
        over10=ds.over_10,
        over15=ds.over_15,
        over20=ds.over_20,
        over25=ds.over_25,
        over30=ds.over_30,
        over50=ds.over_50,
        over100=ds.over_100,
    )

    ds = ds.key_by().drop("locus")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = hl.read_table(args.input)

    ds = format_coverage_table(ds)

    ds.write(args.output)


if __name__ == "__main__":
    main()
