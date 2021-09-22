import csv
import re

import hail as hl

from data_pipeline.data_types.variant import variant_id


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


def import_gnomad_v2_lof_curation_results(curation_result_paths, genes_path):
    all_flags = set()

    with hl.hadoop_open("/tmp/import_temp.tsv", "w") as temp_output_file:
        writer = csv.writer(temp_output_file, delimiter="\t", quotechar='"')
        writer.writerow(["chrom", "position", "ref", "alt", "genes", "verdict", "flags", "project", "project_index"])

        for project_index, path in enumerate(curation_result_paths):
            with hl.hadoop_open(path, "r") as input_file:
                reader = csv.DictReader(input_file)

                project = re.sub(r"(_curation_results)?\.csv$", "", path.split("/")[-1])

                raw_dataset_flags = [f[5:] for f in reader.fieldnames if f.startswith("Flag ")]

                dataset_flags = [FLAG_MAPPING.get(f, f) for f in raw_dataset_flags]

                all_flags = all_flags.union(set(dataset_flags))

                for row in reader:
                    [chrom, pos, ref, alt] = row["Variant ID"].split("-")

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
                        project,
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

    genes = hl.read_table(genes_path)
    ds = ds.annotate(gene_symbol=genes[ds.gene_id].symbol, gene_version=genes[ds.gene_id].gene_version)

    ds = ds.group_by(ds.locus, ds.alleles, ds.gene_id).aggregate(
        result=hl.agg.take(ds.row.drop("locus", "alleles", "gene_id"), 1, ds.project_index)
    )

    ds = ds.annotate(**ds.result[0]).drop("result", "project_index")

    ds = ds.group_by("locus", "alleles").aggregate(lof_curations=hl.agg.collect(ds.row.drop("locus", "alleles")))

    ds = ds.annotate(variant_id=variant_id(ds.locus, ds.alleles))

    for flag in sorted(list(all_flags)):
        print(flag)

    return ds
