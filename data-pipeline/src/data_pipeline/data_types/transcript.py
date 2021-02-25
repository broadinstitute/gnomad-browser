import hail as hl


def annotate_gene_transcripts_with_tissue_expression(table_path, gtex_tissue_expression_path):
    genes = hl.read_table(table_path)

    tissue_expression = hl.read_table(gtex_tissue_expression_path)

    transcripts = genes.select("transcripts")
    transcripts = transcripts.explode("transcripts")
    transcripts = transcripts.annotate(
        transcripts=transcripts.transcripts.annotate(
            gtex_tissue_expression=tissue_expression[transcripts.transcripts.transcript_id].tissues
        )
    )

    transcripts = transcripts.group_by("gene_id").aggregate(transcripts=hl.agg.collect(transcripts.transcripts))

    genes = genes.annotate(transcripts=transcripts[genes.gene_id].transcripts)

    return genes


def annotate_gene_transcripts_with_refseq_id(table_path, mane_select_transcripts_path):
    mane_select_transcripts = hl.read_table(mane_select_transcripts_path)

    ensembl_to_refseq_map = {}
    for transcript in mane_select_transcripts.collect():
        ensembl_to_refseq_map[transcript.ensembl_id] = {
            transcript.ensembl_version: hl.Struct(
                refseq_id=transcript.refseq_id, refseq_version=transcript.refseq_version
            )
        }

    ensembl_to_refseq_map = hl.literal(ensembl_to_refseq_map)

    genes = hl.read_table(table_path)

    genes = genes.annotate(
        transcripts=genes.transcripts.map(
            lambda transcript: transcript.annotate(
                **ensembl_to_refseq_map.get(
                    transcript.transcript_id,
                    hl.empty_dict(hl.tstr, hl.tstruct(refseq_id=hl.tstr, refseq_version=hl.tstr)),
                ).get(
                    transcript.transcript_version,
                    hl.struct(refseq_id=hl.null(hl.tstr), refseq_version=hl.null(hl.tstr)),
                )
            )
        )
    )

    return genes


def extract_transcripts(genes_path):
    ds = hl.read_table(genes_path)
    ds = ds.key_by()
    ds = ds.select(gene=ds.row_value)
    ds = ds.annotate(transcripts=ds.gene.transcripts)
    ds = ds.explode(ds.transcripts)
    ds = ds.annotate(**ds.transcripts).drop("transcripts")
    ds = ds.key_by("transcript_id")
    ds = ds.repartition(2000, shuffle=True)

    return ds
