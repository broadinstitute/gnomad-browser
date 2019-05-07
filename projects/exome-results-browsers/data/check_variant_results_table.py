#!/usr/bin/env python3
import argparse

import hail as hl


parser = argparse.ArgumentParser()
parser.add_argument("table")
args = parser.parse_args()

ds = hl.read_table(args.table)

fields = ds.row_value.dtype.fields

# Required fields
required_fields = {
    "variant_id": hl.tstr,
    "chrom": hl.tstr,
    "pos": hl.tint,
    "canonical_transcript_id": hl.tstr,
    "gene_id": hl.tstr,
    "gene_name": hl.tstr,
    "hgvsc": hl.tstr,
    "hgvsc_canonical": hl.tstr,
    "hgvsp": hl.tstr,
    "hgvsp_canonical": hl.tstr,
    "transcript_id": hl.tstr,
}
for field, expected_type in required_fields.items():
    assert field in fields, f"missing required field: {field}"
    assert (
        ds[field].dtype == expected_type
    ), f"{field} does not have expected type {str(expected_type)}"

assert (
    "csq_analysis" in fields or "csq_canonical" in fields
), "one of csq_analyis or csq_canonical is required"
if "csq_analysis" in fields:
    assert ds.csq_analysis.dtype == hl.tstr, "csq_analysis must be a string"
if "csq_canonical" in fields:
    assert ds.csq_canonical.dtype == hl.tstr, "csq_canonical must be a string"

optional_fields = {"cadd": hl.tfloat, "mpc": hl.tfloat, "polyphen": hl.tstr}
for field, expected_type in optional_fields.items():
    if field in fields:
        assert (
            ds[field].dtype == expected_type
        ), f"{field} does not have expected type {str(expected_type)}"

analysis_groups = ds.groups.dtype.fields

for group in analysis_groups:
    assert all(
        c.isascii() and (c.isalnum() or c == "_") for c in group
    ), f"{group} is not alphanumeric"

for group in analysis_groups[1:]:
    assert (
        ds.groups[group].dtype == ds.groups[analysis_groups[0]].dtype
    ), f"{group} group does not have same type as other groups"

print("\nAnalysis Groups\n==========")
for group in analysis_groups:
    print(group)
