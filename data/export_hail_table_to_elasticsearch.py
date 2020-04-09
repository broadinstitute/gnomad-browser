import argparse
import datetime

import hail as hl

from data_utils.elasticsearch_export import elasticsearch_mapping_for_table, export_table_to_elasticsearch


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("table_url", help="URL of Hail table to export")
    parser.add_argument("host", help="Elasticsearch host or IP")
    parser.add_argument("index_name", help="Elasticsearch index name")
    parser.add_argument("--block-size", help="Elasticsearch block size to use when exporting", default=200, type=int)
    parser.add_argument("--disable-fields", help="Disable a field in Elasticsearch", action="append", default=[])
    parser.add_argument(
        "--es-config",
        help="Configuration for Elasticsearch Hadoop connector",
        action="append",
        default=[],
        nargs=2,
        metavar=("property", "value"),
    )
    parser.add_argument("--id-field", help="Field to use as Elasticsearch document ID", default=None)
    parser.add_argument("--num-shards", help="Number of elasticsearch shards", default=1, type=int)
    parser.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
    parser.add_argument("--set-type", help="Set a specific Elasticsearch type for a field", action="append", default=[])
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    table = hl.read_table(args.table_url)

    table = table.select_globals(
        exported_from=args.table_url,
        exported_at=datetime.datetime.utcnow().isoformat(timespec="seconds"),
        table_globals=table.globals,
    )

    mapping = elasticsearch_mapping_for_table(
        table, disable_fields=args.disable_fields, override_types=dict(arg.split("=") for arg in args.set_type)
    )

    export_table_to_elasticsearch(
        table,
        host=args.host,
        index_name=args.index_name,
        block_size=args.block_size,
        id_field=args.id_field,
        mapping=mapping,
        num_shards=args.num_shards,
        port=args.port,
        verbose=True,
        es_config=dict(args.es_config),
    )


if __name__ == "__main__":
    main()
