import argparse
import csv
import os

import hail as hl


FLAG_MAPPING = {
    "Essential Splice Rescue": "Splice Rescue",
    "Genotyping Error": "Genotyping Issue",
    "Low Relative Mean Pext": "Low Relative Mean Pext/Pext Does Not Support Splicing",
    "Low Relative Mean Pext/Pext does not Support Splicing": "Low Relative Mean Pext/Pext Does Not Support Splicing",
    "Mapping Error": "Mapping Issue",
    "Mnp": "MNV/Frame Restoring Indel",
    "Mnv/Frame Restore": "MNV/Frame Restoring Indel",
    "MNV": "MNV/Frame Restoring Indel",
    "Weak Essential Splice Rescue": "Weak/Unrecognized Splice Rescue",
    "Weak Exon Conservation": "Weak Gene Conservation",
}

VERDICT_MAPPING = {
    "conflicting_evidence": "Uncertain",
    "insufficient_evidence": "Uncertain",
    "uncertain": "Uncertain",
    "likely_lof": "Likely LoF",
    "likely_not_lof": "Likely not LoF",
    "lof": "LoF",
    "not_lof": "Not LoF",
}


def import_results(result_paths):
    all_flags = set()

    with hl.hadoop_open("/tmp/import_temp.tsv", "w") as temp_output_file:
        writer = csv.writer(temp_output_file, delimiter="\t", quotechar='"')
        writer.writerow(["chrom", "position", "ref", "alt", "genes", "verdict", "flags", "project_index"])

        for project_index, path in enumerate(result_paths):
            with hl.hadoop_open(path, "r") as input_file:
                reader = csv.DictReader(input_file)

                raw_dataset_flags = [f.lstrip("Flag ") for f in reader.fieldnames if f.startswith("Flag ")]

                dataset_flags = [FLAG_MAPPING.get(f, f) for f in raw_dataset_flags]

                all_flags = all_flags.union(set(dataset_flags))

                for row in reader:
                    variant_id = row["Variant ID"]
                    [chrom, pos, ref, alt] = variant_id.split("-")

                    variant_flags = [FLAG_MAPPING.get(f, f) for f in raw_dataset_flags if row[f"Flag {f}"] == "TRUE"]

                    genes = [gene_id for (gene_id, gene_symbol) in (gene.split(":") for gene in row["Gene"].split(";"))]

                    verdict = row["Verdict"]

                    if verdict == "inufficient_evidence":
                        verdict = "insufficient_evidence"

                    verdict = VERDICT_MAPPING[verdict]

                    output_row = [
                        chrom,
                        pos,
                        ref,
                        alt,
                        ",".join(genes),
                        verdict,
                        ",".join(variant_flags),
                        project_index,
                    ]

                    writer.writerow(output_row)

    ds = hl.import_table("/tmp/import_temp.tsv")

    ds = ds.transmute(locus=hl.locus(ds.chrom, hl.int(ds.position)), alleles=[ds.ref, ds.alt],)

    ds = ds.annotate(
        genes=ds.genes.split(","),
        flags=hl.set(hl.if_else(ds.flags == "", hl.empty_array(hl.tstr), ds.flags.split(","))),
    )

    ds = ds.explode(ds.genes, name="gene_id")

    ds = ds.group_by(ds.locus, ds.alleles, ds.gene_id).aggregate(
        result=hl.agg.take(ds.row.drop("locus", "alleles", "gene_id"), 1, ds.project_index)
    )

    ds = ds.annotate(**ds.result[0]).drop("result", "project_index")

    ds = ds.annotate(
        variant_id=hl.delimit([ds.locus.contig, hl.str(ds.locus.position), ds.alleles[0], ds.alleles[1],], "-",),
    )

    for flag in sorted(list(all_flags)):
        print(flag)

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    # Projects are ranked in order of priority. If a variant/gene pair appears in multiple projects, then the
    # result from the first project in this list will be used.
    results = [
        "gs://gnomad-public/truth-sets/source/lof-curation/AP4_curation_results.csv",
        "gs://gnomad-public/truth-sets/source/lof-curation/FIG4_curation_results.csv",
        "gs://gnomad-public/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv",
        "gs://gnomad-public/truth-sets/source/lof-curation/MCOLN1_curation_results.csv",
        "gs://gnomad-public/truth-sets/source/lof-curation/all_homozygous_curation_results.csv",
    ]

    hl.init(log=os.devnull, quiet=True)

    ds = import_results(results)

    ds.describe()

    ds.write(
        args.output, overwrite=True,
    )


if __name__ == "__main__":
    main()
