import datetime
import hail as hl


def export_table_to_parquet(
    table,
    output_path,
    partition_count=0,
    partition_fields=[],
    compression="snappy",
):
    export_time = datetime.datetime.now(datetime.timezone.utc)

    table = table.select_globals(
        exported_at=export_time.isoformat(timespec="seconds"),
        table_globals=table.globals,
    )
    table = table.key_by()

    current_partitions = table.n_partitions()

    if partition_count > 0 and current_partitions > partition_count:
        # Reduce partitions without a full shuffle
        table = table.naive_coalesce(partition_count)

    elif partition_count > 0 and current_partitions < partition_count:
        # Increase partitions with a shuffle
        table = table.repartition(partition_count, shuffle=True)

    # Preserve nested struct fields instead of flattening them.
    spark_df = table.to_spark(flatten=False)

    spark_df.printSchema()

    spark_df.write.parquet(
        output_path,
        compression=compression,
        mode="overwrite",
        partitionBy=partition_fields,
    )


def export_variants_to_parquet(
    table,
    output_path,
    compression="snappy",
):
    export_time = datetime.datetime.now(datetime.timezone.utc)

    table = table.select_globals(
        exported_at=export_time.isoformat(timespec="seconds"),
        table_globals=table.globals,
    )
    table = table.key_by()

    # Get chromosome/contig names directly from Hail.
    chromosomes = table.aggregate(hl.agg.collect_as_set(table.locus.contig))

    chromosomes = sorted(chromosomes)

    print(f"Found {len(chromosomes)} chromosomes: {chromosomes}")

    for chrom in chromosomes:
        print(f"Exporting chromosome {chrom}")

        # Filter Hail Table before converting to Spark.
        chrom_table = table.filter(table.locus.contig == chrom)

        # Convert only this chromosome to Spark.
        chrom_df = chrom_table.to_spark(flatten=False)

        # Export chromosome.
        chrom_df.write.mode("overwrite").option("compression", compression).parquet(
            f"{output_path}/locus.contig={chrom}"
        )

        print(f"Finished chromosome {chrom}")
