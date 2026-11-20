from collections import Counter, defaultdict

import hail as hl
import pytest
from pyspark.sql import SparkSession
from pyspark.sql.functions import input_file_name

from data_pipeline.data_types.locus import chunk_by_contig, posbin
from data_pipeline.data_types.variant import annotate_parquet_variant_location
from data_pipeline.helpers.parquet_export import export_table_to_parquet

SCHEMA = hl.tstruct(
    locus=hl.tlocus("GRCh38"),
    alleles=hl.tarray(hl.tstr),
    chrom=hl.tstr,
    pos=hl.tint32,
    ref=hl.tstr,
    alt=hl.tstr,
    posbin=hl.tint64,
    rsids=hl.tset(hl.tstr),
)


def make_variants(*loci):
    rows = [
        {
            "locus": hl.Locus(contig, position, "GRCh38"),
            "alleles": ["A", "C"],
            "chrom": contig.replace("chr", ""),
            "pos": position,
            "ref": "A",
            "alt": "C",
            "posbin": (position - 1) // 1_000_000,
            "rsids": {"rs1"},
        }
        for contig, position in loci
    ]
    return hl.Table.parallelize(rows, schema=SCHEMA, key=["locus", "alleles"])


def export_variants(ds, output_path, drop=["locus", "alleles"], **kwargs):
    export_table_to_parquet(
        ds,
        output_path,
        drop=drop,
        chunk_by=chunk_by_contig,
        partition_fields=["chrom", "posbin"],
        sort_by=["pos", "ref", "alt"],
        **kwargs,
    )


@pytest.mark.parametrize(
    ("position", "expected"),
    [(1, 0), (1_000_000, 0), (1_000_001, 1), (2_000_001, 2)],
)
def test_posbin(position, expected):
    result = posbin(hl.int32(position))
    assert result.dtype == hl.tint64
    assert hl.eval(result) == expected


def test_annotate_parquet_variant_location():
    ds = make_variants(("chr22", 1_000_001)).select("rsids")

    row = annotate_parquet_variant_location(ds).collect()[0]

    assert (row.chrom, row.pos, row.ref, row.alt, row.posbin) == ("22", 1_000_001, "A", "C", 1)


def test_chunk_by_contig_splits_by_contig():
    ds = make_variants(("chr1", 1), ("chr1", 2), ("chr22", 1))

    chunks = chunk_by_contig(ds)

    assert [(label, chunk.count()) for label, chunk in chunks] == [("chr1", 2), ("chr22", 1)]


def test_export_checks_config_before_deleting_old_output(tmp_path):
    output_path = tmp_path / "variants"
    output_path.mkdir()
    (output_path / "old.parquet").touch()

    with pytest.raises(IndexError, match="no field"):
        export_variants(
            make_variants(("chr1", 1)), str(output_path), drop=["locus", "alleles", "misspelled"], overwrite=True
        )

    assert (output_path / "old.parquet").exists()


def test_export_writes_each_row_once_and_sorted(tmp_path):
    ds = make_variants(("chr1", 3), ("chr1", 1), ("chr22", 2_000_001), ("chr22", 5))
    output_path = str(tmp_path / "variants")

    # A second export must replace the first, not add to it.
    for _ in range(2):
        export_variants(ds, output_path, rename={"rsids": "rs_ids"}, overwrite=True)

    df = SparkSession.builder.getOrCreate().read.parquet(output_path).withColumn("file", input_file_name())
    rows = df.collect()

    assert "rs_ids" in df.columns
    assert "locus" not in df.columns
    assert sorted((str(row.chrom), row.pos) for row in rows) == [("1", 1), ("1", 3), ("22", 5), ("22", 2_000_001)]

    positions_by_file = defaultdict(list)
    for row in rows:
        positions_by_file[row.file].append(row.pos)
    assert all(positions == sorted(positions) for positions in positions_by_file.values())


def test_export_refuses_to_replace_existing_output_without_overwrite(tmp_path):
    output_path = tmp_path / "variants"
    output_path.mkdir()
    (output_path / "old.parquet").touch()

    with pytest.raises(FileExistsError, match="already exists"):
        export_variants(make_variants(("chr1", 1)), str(output_path))

    assert (output_path / "old.parquet").exists()


@pytest.mark.parametrize("fields", [{"sort_by": ["misspelled"]}, {"partition_fields": ["locus"]}])
def test_export_rejects_fields_missing_from_exported_table(tmp_path, fields):
    with pytest.raises(ValueError, match="There are partition or sort fields not in fields to export:"):
        export_table_to_parquet(
            make_variants(("chr1", 1)), str(tmp_path / "variants"), drop=["locus", "alleles"], **fields
        )


def test_export_without_chunks_coalesces_partitions(tmp_path):
    ds = make_variants(("chr1", 1), ("chr1", 2), ("chr22", 1))
    output_path = tmp_path / "clinvar"

    export_table_to_parquet(
        ds, str(output_path), drop=["locus", "alleles"], partition_count=1, partition_fields=["chrom"]
    )

    rows = SparkSession.builder.getOrCreate().read.parquet(str(output_path)).collect()
    assert sorted((str(row.chrom), row.pos) for row in rows) == [("1", 1), ("1", 2), ("22", 1)]

    files_per_chrom = Counter(path.parent.name for path in output_path.glob("*/*.parquet"))
    assert files_per_chrom == {"chrom=1": 1, "chrom=22": 1}
