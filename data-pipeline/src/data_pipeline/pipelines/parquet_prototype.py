import hail as hl
from data_pipeline.pipeline import Pipeline, run_pipeline
from hail.expr.expressions.typed_expressions import StructExpression
from pyspark.sql.functions import lit, when

# TK how to add the library legit in dataproc?
import pip

pip.main(["install", "pyspark-nested-functions"])
pip.main(["install", "duckdb"])
from nestedfunctions.functions.terminal_operations import apply_terminal_operation
from math import floor
import duckdb
from datetime import datetime
from os import environ
from sys import getsizeof

pipeline = Pipeline()

# sample_size = 10
# sample_size = 100000000
# suffix = sample_size
suffix = "chr22"


def take_variant_sample():
    variants = hl.read_table("gs://gnomad-v4-data-pipeline/output/gnomad_v4/gnomad_v4_variants_annotated_4.ht")
    sample = variants.filter(variants.locus.contig == "chr22")
    # sample = variants.head(sample_size)
    return sample


pipeline.add_task(
    name="take_variant_sample", task_function=take_variant_sample, output_path=f"/small_variants_{suffix}.ht"
)

BUILD_HT = False
BUILD_PARQUET = False
PROFILE_PARQUET = True


def is_struct_field(item):
    return issubclass(type(item[1]), StructExpression)


def find_leaf_structs(ds):
    top_level_schema_fields = list(ds.row.items())
    fields_to_check = list(filter(is_struct_field, top_level_schema_fields))
    leaf_fields = []

    while len(fields_to_check) > 0:
        field_to_check = fields_to_check[0]
        fields_to_check = fields_to_check[1:]

        subfields = list(field_to_check[1].items())
        struct_subfields = list(filter(is_struct_field, subfields))

        if len(struct_subfields) == 0:
            leaf_fields.append(field_to_check)
        else:
            name_prefix = field_to_check[0] + "."
            fully_qualified_struct_subfields = list(
                map(lambda field: (name_prefix + field[0], field[1]), struct_subfields)
            )
            fields_to_check = fields_to_check + fully_qualified_struct_subfields
    return leaf_fields


def identify_struct_fields(ds):
    top_level_schema_fields = list(ds.row.items())
    top_level_structs = list(filter(is_struct_field, top_level_schema_fields))
    top_level_struct_names = list(map(lambda struct: struct[0], top_level_structs))
    fields_to_check = top_level_structs.copy()
    tree = {}

    while len(fields_to_check) > 0:
        field_to_check = fields_to_check[0]
        fields_to_check = fields_to_check[1:]

        subfields = list(field_to_check[1].items())
        struct_subfields = list(filter(is_struct_field, subfields))
        name_prefix = field_to_check[0] + "."
        fully_qualified_struct_subfields = list(map(lambda field: (name_prefix + field[0], field[1]), struct_subfields))

        tree[field_to_check[0]] = fully_qualified_struct_subfields
        fields_to_check = fully_qualified_struct_subfields + fields_to_check
    return (top_level_struct_names, tree)


n_partitions = [100, 50, 25, 12, 6]
bucket_sizes = [1e4, 1e5, 1e6]


def bucket_size_path(suffix, path):
    return (
        f"gs://gnomad-browser-data-pipeline/phil-scratch/output/small_sample_parquet_{suffix}-bucket_size-{bucket_size}"
    )


def n_paritions_path(suffix, partition_count):
    return f"gs://gnomad-browser-data-pipeline/phil-scratch/output/small_sample_parquet_{suffix}-n_partitions_{partition_count}"


if __name__ == "__main__":
    if BUILD_HT:
        run_pipeline(pipeline)
    if BUILD_PARQUET:
        variants_path = f"gs://gnomad-browser-data-pipeline/phil-scratch/output/small_variants_{suffix}.ht"
        variants = hl.read_table(variants_path)
        base_df = variants.expand_types().to_spark(False)
        for leaf in find_leaf_structs(variants):
            leaf_name = leaf[0]
            base_df = apply_terminal_operation(
                base_df, leaf_name, lambda column, _type: when(~column.isNull(), column).otherwise(lit(None))
            )

        #       for partition_count in n_partitions:
        #           df = base_df.coalesce(partition_count)
        # path = n_paritions_path(suffix, partition_count)
        # print(f"WRITING TO {path}")
        # df.write.mode("overwrite").parquet(path)
        for bucket_size in bucket_sizes:
            df = base_df.withColumn("position_bucket", floor(base_df.locus.position / bucket_size))
            path = bucket_size_path(suffix, bucket_size)
            print(f"WRITING TO {path}")
            df.write.partitionBy("position_bucket").mode("overwrite").parquet(path)
    # TK
    if PROFILE_PARQUET:
        results = []
        position_base = 10750000
        n_rounds = 3
        region_sizes = [10000, 100000]
        # region_sizes = [10000, 100000, 1000000, 10000000]
        columns = ["variant_id", "variant_id, caid", "variant_id, caid, genome.freq", "variant_id, caid, genome"]
        #       n_rounds = 1
        #       region_sizes = [10000]
        #       columns = ["variant_id"]
        duckdb.sql("SET enable_external_file_cache=false;")
        duckdb.sql("SET home_directory='/home/hail';")
        duckdb.sql("SET secret_directory='/home/hail';")
        duckdb.sql("SET extension_directory='/home/hail';")
        duckdb.sql(f"CREATE SECRET ( TYPE gcs, KEY_ID '[REDACTED_KEY_ID]', SECRET '[REDACTED_SECRET]');")
        for round_index in range(1, n_rounds + 1):
            # for partition_count in n_partitions:
            for bucket_size in bucket_sizes:
                path = bucket_size_path(suffix, bucket_size) + "/*.parquet"
                for region_size in region_sizes:
                    for column_phrase in columns:
                        region_stop = position_base + region_size - 1
                        select_statement = f"SELECT {column_phrase} FROM read_parquet('{path}') WHERE locus.contig == 'chr22' AND locus.position >= {position_base} AND locus.position <= {region_stop};"
                        print(
                            f"ROUND {round_index}: QUERYING {path} WITH REGION SIZE {region_size} COLUMNS {column_phrase}"
                        )
                        # print(select_statement)
                        query_start_time = datetime.now()
                        db_response = duckdb.sql(select_statement).fetchall()
                        query_end_time = datetime.now()
                        query_duration = query_end_time - query_start_time
                        query_ms = query_duration.seconds * 1000 + round((query_duration.microseconds / 1000))
                        print(f"DURATION: {query_ms}")
                        result = [bucket_size, round_index, column_phrase, getsizeof(db_response), query_ms]
                        result = list(map(lambda x: repr(x), result))
                        results.append(result)
        print("-----")
        print("bucket_size\tround_index\tcolumn_phrase\tbytes\tquery_duration")
        for result in results:
            print("\t".join(result))
