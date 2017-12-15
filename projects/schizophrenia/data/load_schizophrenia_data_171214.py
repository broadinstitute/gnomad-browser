import hail
from pprint import pprint
from utils.elasticsearch_client import ElasticsearchClient

from utils.computed_fields_utils import get_expr_for_xpos, get_expr_for_orig_alt_alleles_set, \
    get_expr_for_variant_id, get_expr_for_vep_gene_ids_set, get_expr_for_vep_transcript_ids_set, \
    get_expr_for_vep_consequence_terms_set, get_expr_for_vep_sorted_transcript_consequences_array, \
    get_expr_for_worst_transcript_consequence_annotations_struct, get_expr_for_end_pos, \
    get_expr_for_contig, get_expr_for_start_pos, get_expr_for_alt_allele, get_expr_for_ref_allele

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

path_pop_rare = 'gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-count-by-population.kt'
path_pop_common = 'gs://schizophrenia-browser/171211/2017-12-11_single-variant-results-by-population.tsv'
path_variants = 'gs://schizophrenia-browser/171214/2017-12-14_release-v1-browser-merged-variant-table.kt'
path_gene_results = 'gs://schizophrenia-browser/171214/2017-12-13-schema-single-gene-burden-results.kt'
path_pop = 'gs://schizophrenia-browser/171214/2017-12-14_release-v1-browser-merged-variant-table-by-analysis-group.kt'

kt_pop_rare = hc.read_table(path_pop_rare)
kt_pop_common = hc.import_table(path_pop_common)
kt_pop = hc.read_table(path_pop)
kt_variants = hc.read_table(path_variants)
kt_gene_results = hc.read_table(path_gene_results)

pprint(kt_pop_rare.schema)
pprint(kt_pop_common.schema)
pprint(kt_pop.schema)
pprint(kt_variants.schema)
pprint(kt_gene_results.schema)

ES_HOST_IP = '10.4.0.13'
ES_HOST_PORT = 9200

print("======== Export to elasticsearch ======")
es = ElasticsearchClient(
    host=ES_HOST_IP,
    port=ES_HOST_PORT,
)

annotation_expressions = [
    'variant_id = %s' % get_expr_for_variant_id(),
    'contig = %s' % get_expr_for_contig(),
    'pos = %s' % get_expr_for_start_pos(),
    "xpos = %s" % get_expr_for_xpos(field_prefix="", pos_field="pos"),
]

for expression in annotation_expressions:
    kt_variants = kt_variants.annotate(expression)
    kt_pop = kt_pop.annotate(expression)

kt_variants = kt_variants.drop(['v'])
kt_pop = kt_pop.drop(['v'])

kt_variants = kt_variants.rename({
    'AC_case': 'ac_case',
    'AC_ctrl': 'ac_ctrl',
    'AN_case': 'an_case',
    'AN_ctrl': 'an_ctrl',
    '`nonpsych_gnomad.AC`': 'gnomad',
    "`cadd13.phred`": 'cadd',
    'MPC': 'mpc',
    'gene_id': 'gene_id',
    'csq': 'consequence',
    'polyphen': 'polyphen',
    'Pval': 'pval',
    'Estimate': 'estimate',
    'AC_denovo': 'ac_denovo',
    'AF': 'allele_freq',
})

pprint(kt_variants.schema)

kt_gene_results = kt_gene_results.rename({
    'gene_name': 'gene_name',
    'description': 'description',
    'ensembl_gene_id': 'gene_id',
    'Xcase_lof': 'case_lof',
    'Xctrl_lof': 'ctrl_lof',
    'Pval_lof': 'pval_lof',
    'Xcase_mpc': 'case_mpc',
    'Xctrl_mpc': 'ctrl_mpc',
    'Pval_mpc': 'pval_mpc',
    'Pval_meta': 'pval_meta',
})

pprint(kt_gene_results.schema)

kt_pop = kt_pop.rename({
    'group': 'group',
    'AC_case': 'ac_case',
    'AC_ctrl': 'ac_ctrl',
    'AN_case': 'an_case',
    'AN_ctrl': 'an_ctrl',
    'AF': 'allele_freq',
    'beta': 'beta',
    'pval': 'pval',
})

pprint(kt_pop.schema)

# es.export_kt_to_elasticsearch(
#     kt_variants,
#     index_name='schizophrenia_variants',
#     index_type_name='schizophrenia_variant',
#     block_size=1000,
#     num_shards=2,
#     delete_index_before_exporting=True,
#     verbose=True,
# )
es.export_kt_to_elasticsearch(
    kt_pop,
    index_name='schizophrenia_groups',
    index_type_name='group',
    block_size=1000,
    num_shards=2,
    delete_index_before_exporting=True,
    verbose=True,
)

#
# es.export_kt_to_elasticsearch(
#     kt_gene_results,
#     index_name='schizophrenia_gene_results_171214',
#     index_type_name='result',
#     block_size=1000,
#     num_shards=2,
#     delete_index_before_exporting=True,
#     verbose=True,
# )
