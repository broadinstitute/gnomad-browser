import argparse
import re

import hail as hl


def format_tissue_name(tissue_name):
    return re.sub(r"[-\(\)_ ]+", "_", tissue_name).rstrip("_").lower()


def prepare_gtex_expression_data(transcript_tpms_path, sample_annotations_path):
    # Import data
    ds = hl.import_matrix_table(
        transcript_tpms_path, row_fields={"transcript_id": hl.tstr, "gene_id": hl.tstr}, entry_type=hl.tfloat
    )
    ds = ds.rename({"col_id": "sample_id"})
    ds = ds.repartition(100, shuffle=True)

    samples = hl.import_table(sample_annotations_path, key="SAMPID")

    # Separate version numbers from transcript and gene IDs
    ds = ds.annotate_rows(
        transcript_id=ds.transcript_id.split(r"\.")[0],
        transcript_version=hl.int(ds.transcript_id.split(r"\.")[1]),
        gene_id=ds.gene_id.split(r"\.")[0],
        gene_version=hl.int(ds.gene_id.split(r"\.")[1]),
    )

    # Annotate columns with the tissue the sample came from
    ds = ds.annotate_cols(tissue=samples[ds.sample_id].SMTSD)

    # Collect expression into median across all samples in each tissue
    ds = ds.group_cols_by(ds.tissue).aggregate(**{"": hl.agg.approx_median(ds.x)}).make_table()

    # Format tissue names
    other_fields = {"transcript_id", "transcript_version", "gene_id", "gene_version"}
    tissues = [f for f in ds.row_value.dtype.fields if f not in other_fields]
    ds = ds.transmute(tissues=hl.struct(**{format_tissue_name(tissue): ds[tissue] for tissue in tissues}))

    ds = ds.key_by("transcript_id").drop("row_id")

    return ds


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--gtex-version", type=int, choices=[7])
    group.add_argument("--gtex-files", nargs=2, metavar=("transcript_tpms", "sample_annotations"))
    parser.add_argument("output")
    args = parser.parse_args()

    if args.gtex_version:
        transcript_tpms, sample_annotations = {
            7: (
                "gs://gtex_analysis_v7/rna_seq_data/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz",
                "gs://gtex_analysis_v7/annotations/GTEx_v7_Annotations_SampleAttributesDS.txt",
            ),
        }[args.gtex_version]
    else:
        transcript_tpms, sample_annotations = args.gtex_files

    ds = prepare_gtex_expression_data(transcript_tpms, sample_annotations)

    ds.write(args.output)


if __name__ == "__main__":
    main()
