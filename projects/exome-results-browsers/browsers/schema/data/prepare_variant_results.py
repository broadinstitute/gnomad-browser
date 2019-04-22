import argparse

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    get_expr_for_alt_allele,
    get_expr_for_contig,
    get_expr_for_ref_allele,
    get_expr_for_variant_id,
    get_expr_for_xpos,
)


p = argparse.ArgumentParser()
p.add_argument("--variant-results-url", required=True)
p.add_argument("--variant-annotations-url", required=True)
p.add_argument("--output-url", required=True)
args = p.parse_args()


hl.init(log="/tmp/hail.log")

variants = hl.read_table(args.variant_annotations_url)
variants = variants.annotate(
    variant_id=get_expr_for_variant_id(variants),
    chrom=get_expr_for_contig(variants.locus),
    pos=variants.locus.position,
    xpos=get_expr_for_xpos(variants.locus),
    alt=get_expr_for_alt_allele(variants),
    ref=get_expr_for_ref_allele(variants),
)
variants = variants.transmute(
    transcript_id=hl.delimit(variants.transcript_id, ","),
    hgvsc=hl.delimit(
        variants.hgvsc.keys().map(lambda k: k + ":" + variants.hgvsc[k]), ","
    ),
    hgvsp=hl.delimit(
        variants.hgvsp.keys().map(lambda k: k + ":" + variants.hgvsp[k]), ","
    ),
)
variants = variants.annotate(flags="PASS")
variants = variants.drop("v")

results = hl.read_table(args.variant_results_url)
results = results.annotate(
    analysis_group=results.analysis_group.lower()
    .replace("[^a-z0-9]+", "_")
    .replace("_+$", "")
)
results = results.drop("v")

variants = variants.filter(hl.is_defined(results[variants.key]))

analysis_groups = results.aggregate(hl.agg.collect_as_set(results.analysis_group))
result_fields = [f for f in results.row_value.dtype.fields if f != "analysis_group"]

variants = variants.annotate(groups=hl.struct())
for group in analysis_groups:
    group_results = results.filter(results.analysis_group == group).drop(
        "analysis_group"
    )
    variants = variants.annotate(
        groups=variants.groups.annotate(**{group: group_results[variants.key]})
    )

# The latest (2019/04/15) SCHEMA dataset moved the source and in_analysis field from variant level to group level
# in_analysis is the same for all groups within a variant, but source is not
variants = variants.annotate(
    in_analysis=variants.groups.meta.in_analysis, source=variants.groups.meta.source
)

variants = variants.key_by().drop("locus", "alleles")

variants.write(args.output_url)
