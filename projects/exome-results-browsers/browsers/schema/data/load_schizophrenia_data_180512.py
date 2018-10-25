from __future__ import print_function
from pprint import pprint

import hail

from utils.computed_fields_utils import (
    get_expr_for_contig,
    get_expr_for_start_pos,
    get_expr_for_variant_id,
    get_expr_for_xpos,
)
from utils.elasticsearch_client import ElasticsearchClient


hc = hail.HailContext(log="/hail.log")

path_variant_annotation = 'gs://schizophrenia-browser/180515/2018-05-12_exome-browser-variant-annotation-table.kt'
path_results_by_cohort = 'gs://schizophrenia-browser/180515/2018-05-12_exome-browser-variant-results-by-cohort-table.kt'
path_variant_results = 'gs://schizophrenia-browser/180515/2018-05-12_exome-browser-variant-results-table.kt'

kt_variant_annotation = hc.read_table(path_variant_annotation)
kt_variant_results = hc.read_table(path_variant_results)
kt_results_by_cohort = hc.read_table(path_results_by_cohort)

column_map = {
  'Browser Column name': 'Column name',
  'Variant ID': 'v',
  'Source': 'source',
  'Flags': 'flags',
  'In analysis': 'in_analysis',
  'Gene ID': 'gene_id',
  'Gene name': 'gene_name',
  'Transcript ID(s)': 'transcript_id',
  'Transcript ID (canonical)': 'canonical_transcript_id',
  'HGVSc': 'hgvsc',
  'HGVSc (canonical)': 'hgvsc_canonical',
  'HGVSp': 'hgvsp',
  'HGVSp (canonical)': 'hgvsp_canonical',
  'Consequence (worst)': 'csq_worst',
  'Consequence (canonical)': 'csq_canonical',
  'Polyphen': 'polyphen',
  'CADD': 'cadd',
  'MPC': 'mpc',
  'Consequence (for analysis)': 'csq_analysis',
  'AC case': 'ac_case',
  'AC control': 'ac_ctrl',
  'AF case': 'af_case',
  'AF control': 'af_ctrl',
  'AN case': 'an_case',
  'AN control': 'an_ctrl',
  'AC': 'ac',
  'AF': 'af',
  'AN': 'an',
  'N denovos': 'n_denovos',
  'Estimate': 'est',
  'SE': 'se',
  'Meta P-value': 'pmeta',
  'Qp': 'qp',
  'I2': 'i2',
  'N analysis groups': 'n_analysis_groups',
  'Analysis group': 'analysis_group',
  'AC case': 'ac_case',
  'AC ctrl': 'ac_ctrl',
  'AN case': 'an_case',
  'AN ctrl': 'an_ctrl',
  'AF case': 'af_case',
  'AF ctrl': 'af_ctrl',
  'Estimate': 'est',
  'SE': 'se',
  'P-value': 'p',
  'Comment': 'comment',
}

annotation_expressions = [
    'variant_id = %s' % get_expr_for_variant_id(),
    'contig = %s' % get_expr_for_contig(),
    'pos = %s' % get_expr_for_start_pos(),
    "xpos = %s" % get_expr_for_xpos(field_prefix="", pos_field="pos"),
]

kt_variant_annotation = kt_variant_annotation.rename(column_map)
kt_variant_annotation = kt_variant_annotation.annotate('v = Variant(v)')

kt_variant_results = kt_variant_results.rename(column_map)
for expression in annotation_expressions:
    kt_variant_results = kt_variant_results.annotate(expression)

kt_variants = kt_variant_results.key_by('v').join(kt_variant_annotation.key_by('v'))
kt_variants = kt_variants.drop(['v'])

kt_results_by_cohort = kt_results_by_cohort.rename(column_map)
for expression in annotation_expressions:
    kt_results_by_cohort = kt_results_by_cohort.annotate(expression)

kt_results_by_cohort = kt_results_by_cohort.drop(['v'])

ES_HOST_IP = '10.4.0.13'
ES_HOST_PORT = 9200

print("======== Export to elasticsearch ======")
es = ElasticsearchClient(
    host=ES_HOST_IP,
    port=ES_HOST_PORT,
)

es.export_kt_to_elasticsearch(
    kt_variants,
    index_name='schizophrenia_exome_variants_results_180512',
    index_type_name='schizophrenia_exome_variant',
    block_size=1000,
    num_shards=2,
    delete_index_before_exporting=True,
    verbose=True,
)

es.export_kt_to_elasticsearch(
    kt_results_by_cohort,
    index_name='schizophrenia_exome_variants_groups_180512',
    index_type_name='schizophrenia_exome_group',
    block_size=1000,
    num_shards=2,
    delete_index_before_exporting=True,
    verbose=True,
)
