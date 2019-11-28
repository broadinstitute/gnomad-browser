import argparse

import hail as hl

from data_utils.computed_fields import variant_id, x_position


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", required=True)
    parser.add_argument("--annotations", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    variants = hl.read_table(args.annotations)
    variants = variants.annotate(
        variant_id=variant_id(variants.locus, variants.alleles),
        chrom=variants.locus.contig,
        pos=variants.locus.position,
        xpos=x_position(variants.locus),
        alt=variants.alleles[1],
        ref=variants.alleles[0],
    )

    variants = variants.transmute(
        transcript_id=hl.delimit(variants.transcript_id, ","),
        hgvsc=hl.delimit(variants.hgvsc.keys().map(lambda k: k + ":" + variants.hgvsc[k]), ","),
        hgvsp=hl.delimit(variants.hgvsp.keys().map(lambda k: k + ":" + variants.hgvsp[k]), ","),
    )

    variants = variants.annotate(flags="PASS")
    variants = variants.drop("v")

    results = hl.read_table(args.results)
    results = results.annotate(
        analysis_group=results.analysis_group.lower().replace("[^a-z0-9]+", "_").replace("_+$", "")
    )
    results = results.drop("v")

    # Add n_denovos to AC_case
    results = results.annotate(ac_case=hl.or_else(results.ac_case, 0) + hl.or_else(results.n_denovos, 0))
    results = results.annotate(af_case=hl.cond(results.an_case == 0, 0, results.ac_case / results.an_case))

    variants = variants.filter(hl.is_defined(results[variants.key]))

    analysis_groups = results.aggregate(hl.agg.collect_as_set(results.analysis_group))

    variants = variants.annotate(groups=hl.struct())
    for group in analysis_groups:
        group_results = results.filter(results.analysis_group == group).drop("analysis_group")
        variants = variants.annotate(groups=variants.groups.annotate(**{group: group_results[variants.key]}))

    # The latest (2019/04/15) SCHEMA dataset moved the source and in_analysis field from variant level to group level
    # in_analysis is the same for all groups within a variant, but source is not
    variants = variants.annotate(in_analysis=variants.groups.meta.in_analysis, source=variants.groups.meta.source)

    variants = variants.key_by().drop("locus", "alleles")

    variants.write(args.output)


if __name__ == "__main__":
    main()
