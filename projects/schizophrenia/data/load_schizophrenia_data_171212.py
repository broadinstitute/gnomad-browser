import hail
from pprint import pprint
from utils.elasticsearch_client import ElasticsearchClient

from utils.computed_fields_utils import get_expr_for_xpos, get_expr_for_orig_alt_alleles_set, \
    get_expr_for_variant_id, get_expr_for_vep_gene_ids_set, get_expr_for_vep_transcript_ids_set, \
    get_expr_for_vep_consequence_terms_set, get_expr_for_vep_sorted_transcript_consequences_array, \
    get_expr_for_worst_transcript_consequence_annotations_struct, get_expr_for_end_pos, \
    get_expr_for_contig, get_expr_for_start_pos, get_expr_for_alt_allele, get_expr_for_ref_allele

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

path_pop = 'gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-count-by-population.kt'
path_annotations = 'gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-annotation.kt'
path_variants = 'gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-in-schema.kt'

kt_pop = hc.read_table(path_pop)
kt_annotations = hc.read_table(path_annotations)
kt_variants = hc.read_table(path_variants)

pprint(kt_pop.schema)
pprint(kt_annotations.schema)
pprint(kt_variants.schema)

ES_HOST_IP = '10.4.0.13'
ES_HOST_PORT = 9200

print("======== Export to elasticsearch ======")
es = ElasticsearchClient(
    host=ES_HOST_IP,
    port=ES_HOST_PORT,
)

annotation_expressions = [
    'variantId = %s' % get_expr_for_variant_id(),
    'contig = %s' % get_expr_for_contig(),
    'pos = %s' % get_expr_for_start_pos(),
    "xpos = %s" % get_expr_for_xpos(field_prefix="", pos_field="pos"),
]

for expr in annotation_expressions:
    kt_variants = kt_variants.annotate(expr)

kt_variants = kt_variants.drop(['v'])

pprint(kt_variants.schema)

es.export_kt_to_elasticsearch(
    kt_variants,
    index_name='schizophrenia_variants',
    index_type_name='schizophrenia_variant',
    block_size=1000,
    num_shards=2,
    delete_index_before_exporting=True,
    verbose=True,
)
