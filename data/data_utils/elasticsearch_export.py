import elasticsearch
import hail as hl

HAIL_TYPE_TO_ES_TYPE_MAPPING = {
    hl.tint: "integer",
    hl.tint32: "integer",
    hl.tint64: "long",
    hl.tfloat: "double",
    hl.tfloat32: "float",
    hl.tfloat64: "double",
    hl.tstr: "keyword",
    hl.tbool: "boolean",
}


# https://hail.is/docs/devel/types.html
# https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html
def _elasticsearch_mapping_for_hail_type(dtype):
    if isinstance(dtype, hl.tstruct):
        return {"properties": {field: _elasticsearch_mapping_for_hail_type(dtype[field]) for field in dtype.fields}}

    if isinstance(dtype, (hl.tarray, hl.tset)):
        element_mapping = _elasticsearch_mapping_for_hail_type(dtype.element_type)

        if isinstance(dtype.element_type, hl.tstruct):
            element_mapping["type"] = "nested"

        return element_mapping

    if isinstance(dtype, hl.tlocus):
        return {"type": "object", "properties": {"locus": {"type": "keyword"}, "position": {"type": "integer"}}}

    if dtype in HAIL_TYPE_TO_ES_TYPE_MAPPING:
        return {"type": HAIL_TYPE_TO_ES_TYPE_MAPPING[dtype]}

    # tdict, ttuple, tinterval, tcall
    raise NotImplementedError


def _set_field_parameter(mapping, field, parameter, value):
    keys = field.split(".")
    ref = mapping
    for key in keys:
        ref = ref["properties"][key]

    ref[parameter] = value


def elasticsearch_mapping_for_table(table, disable_fields=None, override_types=None):
    """
    Creates an Elasticsearch mapping definition for a Hail table's row value type.

    https://www.elastic.co/guide/en/elasticsearch/guide/current/root-object.html
    """
    mapping = _elasticsearch_mapping_for_hail_type(table.key_by().row_value.dtype)

    if disable_fields:
        for field in disable_fields:
            _set_field_parameter(mapping, field, "enabled", False)

    if override_types:
        for field, field_type in override_types.items():
            _set_field_parameter(mapping, field, "type", field_type)

    return mapping


def export_table_to_elasticsearch(
    table, host, index_name, block_size=5000, id_field=None, mapping=None, num_shards=10, port=9200, verbose=True
):
    es_client = elasticsearch.Elasticsearch(host, port=port)

    elasticsearch_config = {"es.write.operation": "index"}

    if id_field is not None:
        elasticsearch_config["es.mapping.id"] = id_field

    if not mapping:
        mapping = elasticsearch_mapping_for_table(table)

    # Delete the index before creating it
    if es_client.indices.exists(index=index_name):
        es_client.indices.delete(index=index_name)

    # TODO This is disabled by default in ES 6+
    mapping["_all"] = {"enabled": "false"}
    mapping["_meta"] = dict(hl.eval(table.globals))

    # Hard code type name for all indices
    # Mapping types are removed in ES 7
    type_name = "documents"

    # https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#index-modules-settings
    request_body = {
        # TODO Mapping types are removed in ES 7
        "mappings": {type_name: mapping},
        "settings": {
            "index.codec": "best_compression",
            "index.mapping.total_fields.limit": 10000,
            "index.number_of_replicas": 0,
            "index.number_of_shards": num_shards,
            "index.refresh_interval": -1,
        },
    }

    es_client.indices.create(index=index_name, body=request_body)

    hl.export_elasticsearch(table, host, port, index_name, type_name, block_size, elasticsearch_config, verbose)

    es_client.indices.forcemerge(index=index_name)
