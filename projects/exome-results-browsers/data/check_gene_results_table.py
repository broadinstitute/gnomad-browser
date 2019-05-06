#!/usr/bin/env python3
import argparse

import hail as hl


parser = argparse.ArgumentParser()
parser.add_argument("table")
args = parser.parse_args()

ds = hl.read_table(args.table)

fields = ds.row_value.dtype.fields

# Required fields
assert "gene_id" in fields, "missing required field: gene_id"
assert "gene_name" in fields, "missing required field: gene_name"
assert "gene_description" in fields, "missing required field: gene_description"
assert "analysis_group" in fields, "missing required field: analysis_group"

# Manhattan plot fields
if "chrom" in fields:
    assert ds.chrom.dtype == hl.tstr, "chrom must be a string"
if "pos" in fields:
    assert ds.pos.dtype == hl.tint, "pos must be an int"

assert (
    ds.filter(hl.is_missing(ds.gene_id) & hl.is_missing(ds.gene_name)).count() == 0
), "results must have at least one of gene_id or gene_name"

analysis_groups = ds.aggregate(hl.agg.collect_as_set(ds.analysis_group))
print("\nAnalysis Groups\n==========")
for group in analysis_groups:
    print(group)

print("\nResult Fields\n==========")
for field in sorted(
    list(
        set(fields)
        - {"gene_id", "gene_name", "gene_description", "analysis_group", "chrom", "pos"}
    )
):
    print(field, str(ds[field].dtype))
