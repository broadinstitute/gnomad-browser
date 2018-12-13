import argparse
import pprint

import hail

from hail_scripts.v01.utils.computed_fields import (
    get_expr_for_contig,
    get_expr_for_start_pos,
    get_expr_for_variant_id,
    get_expr_for_xpos,
)
from hail_scripts.v01.utils.elasticsearch_client import ElasticsearchClient


p = argparse.ArgumentParser()
p.add_argument("--host", help="Elasticsearch host or IP", required=True)
p.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("--index", help="Elasticsearch index", required=True)
p.add_argument("--num-shards", help="Number of Elasticsearch shards", default=2, type=int)
p.add_argument("--block-size", help="Elasticsearch block size to use when exporting", default=1000, type=int)
args = p.parse_args()


hc = hail.HailContext(log="/hail.log")

variant_annotations_url = "gs://epi-browser/2018-11-27_epi25-exome-browser-variant-annotation-table.kt"
variant_results_url = "gs://epi-browser/2018-11-27_epi25-exome-browser-variant-results-table.kt"

variant_annotations = hc.read_table(variant_annotations_url)
variant_annotations = variant_annotations.rename(
    {
        "Variant ID": "v",
        "CADD": "cadd",
        "Comment": "comment",
        "Consequence (canonical)": "csq_canonical",
        "Consequence (for analysis)": "csq_analysis",
        "Consequence (worst)": "csq_worst",
        "Gene ID": "gene_id",
        "Gene name": "gene_name",
        "Flags": "flags",
        "HGVSc": "hgvsc",
        "HGVSc (canonical)": "hgvsc_canonical",
        "HGVSp": "hgvsp",
        "HGVSp (canonical)": "hgvsp_canonical",
        "In analysis": "in_analysis",
        "MPC": "mpc",
        "Polyphen": "polyphen",
        "Source": "source",
        "Transcript ID(s)": "transcript_id",
        "Transcript ID (canonical)": "canonical_transcript_id",
    }
)

variant_results = hc.read_table(variant_results_url)
variant_results = variant_results.rename(
    {
        "Variant ID": "v",
        "Analysis group": "analysis_group",
        "AC case": "ac_case",
        "AN case": "an_case",
        "AF case": "af_case",
        "AC control": "ac_ctrl",
        "AN control": "an_ctrl",
        "AF control": "af_ctrl",
        "N denovos": "n_denovos",
        "P-value": "p",
        "Estimate": "est",
        "SE": "se",
        "Qp": "qp",
        "I2": "i2",
    }
)

variant_results = variant_results.annotate('analysis_group = if (analysis_group == "EE") "DEE" else analysis_group')

variants = variant_annotations.key_by("v")
analysis_groups = variant_results.query("analysis_group.collectAsSet()")
result_columns = [col for col in variant_results.columns if col not in {"v", "analysis_group"}]
for group in analysis_groups:
    group_results = variant_results.filter('analysis_group == "%s"' % group).drop("analysis_group")
    group_results = group_results.annotate(
        "%s = { %s }" % (group, ", ".join(["%s: %s" % (col, col) for col in result_columns]))
    ).select(["v", group])
    variants = variants.join(group_results.key_by("v"))

variants = variants.annotate("groups = { %s }" % ", ".join(["%s:%s" % (group, group) for group in analysis_groups]))
variants = variants.drop(list(analysis_groups))

variants = variants.annotate("v = Variant(v)")
variants = variants.annotate("variant_id = %s" % get_expr_for_variant_id())
variants = variants.annotate("chrom = %s" % get_expr_for_contig())
variants = variants.annotate("pos = %s" % get_expr_for_start_pos())
variants = variants.annotate("xpos = %s" % get_expr_for_xpos())
variants = variants.drop(["v"])

pprint.pprint(variants.schema)

es = ElasticsearchClient(args.host, args.port)

es.export_kt_to_elasticsearch(
    variants,
    index_name=args.index,
    index_type_name="variant",
    block_size=args.block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    verbose=True,
)
