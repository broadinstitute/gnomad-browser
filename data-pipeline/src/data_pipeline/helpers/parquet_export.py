import logging

import hail as hl

logger = logging.getLogger("gnomad_data_pipeline")


def export_table_to_parquet(
    table,
    output_path,
    *,
    drop=None,
    rename=None,
    chunk_by=None,
    partition_count=0,
    partition_fields=None,
    sort_by=None,
    one_file_per_partition=False,
    compression="snappy",
    write_options=None,
    overwrite=False,
):
    drop = drop or []
    rename = rename or {}
    partition_fields = partition_fields or []
    sort_by = sort_by or []
    write_options = write_options or {}

    if one_file_per_partition and not partition_fields:
        raise ValueError("one_file_per_partition requires partition_fields")

    # Validate the config and build the chunks before deleting the existing output.
    fields_to_export = table.key_by().drop(*drop).rename(rename).row.dtype.fields
    missing = (set(partition_fields) | set(sort_by)) - set(fields_to_export)
    if missing:
        raise ValueError(f"There are partition or sort fields not in fields to export: {sorted(missing)}")

    output_exists = hl.hadoop_exists(output_path)
    if output_exists and not overwrite:
        raise FileExistsError(f"{output_path} already exists; rerun with --overwrite to replace it")

    chunks = chunk_by(table) if chunk_by else [("full table", table)]

    if output_exists:
        hl.current_backend().fs.rmtree(output_path)

    for label, chunk in chunks:
        logger.info("exporting %s to %s", label, output_path)

        if partition_count > 0:
            current_partitions = chunk.n_partitions()
            if current_partitions > partition_count:
                chunk = chunk.naive_coalesce(partition_count)
            elif current_partitions < partition_count:
                chunk = chunk.repartition(partition_count, shuffle=True)

        chunk = chunk.key_by().drop(*drop).rename(rename)

        df = chunk.to_spark(flatten=False)

        if one_file_per_partition:
            # Spark writes one file per task for each output directory it has rows for.
            df = df.repartition(*partition_fields)

        if sort_by:
            # Sorting by partition_fields first means Spark doesn't add its own sort before writing.
            df = df.sortWithinPartitions(*partition_fields, *sort_by)

        writer = df.write
        for key, value in write_options.items():
            writer = writer.option(key, value)

        writer.parquet(
            output_path,
            mode="append",
            compression=compression,
            partitionBy=partition_fields or None,
        )
