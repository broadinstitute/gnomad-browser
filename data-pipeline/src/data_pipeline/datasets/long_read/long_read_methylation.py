import glob

import hail as hl


def import_and_prepare_table(bedfile_path, sample_id):
    t = hl.import_table(
        bedfile_path,
        types={"f0": hl.tstr, "f1": hl.tint32, "f2": hl.tint32, "f3": hl.tfloat64},
        no_header=True,
    )
    t = t.rename({"f0": "chrom", "f1": "pos1", "f2": "pos2", "f3": "methylation"})
    t = t.annotate(sample_id=sample_id)
    return t


def prepare_long_read_methylation(bedgraph_paths: str):
    bedfile_paths = glob.glob(bedgraph_paths)

    tables = []
    for index, path in enumerate(bedfile_paths):
        sample_type = "high" if "high" in path.lower() else "normal"
        sample_id = f"sample_{index + 1}_{sample_type}"
        tables.append(import_and_prepare_table(path, sample_id))

    t = tables[0]
    for table in tables[1:]:
        t = t.union(table)

    t = t.annotate(document_id=t.sample_id + "_" + t.chrom + "_" + hl.str(t.pos1))
    return t.key_by("document_id")
