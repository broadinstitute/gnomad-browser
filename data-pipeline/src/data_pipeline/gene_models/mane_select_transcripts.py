import hail as hl


def import_mane_select_transcripts(path):
    ds = hl.import_table(path, force=True)

    ds = ds.select(
        gene_id=ds.Ensembl_Gene.split("\\.")[0],
        matched_gene_version=ds.Ensembl_Gene.split("\\.")[1],
        ensembl_id=ds.Ensembl_nuc.split("\\.")[0],
        ensembl_version=ds.Ensembl_nuc.split("\\.")[1],
        refseq_id=ds.RefSeq_nuc.split("\\.")[0],
        refseq_version=ds.RefSeq_nuc.split("\\.")[1],
    )

    ds = ds.key_by("gene_id")

    return ds
