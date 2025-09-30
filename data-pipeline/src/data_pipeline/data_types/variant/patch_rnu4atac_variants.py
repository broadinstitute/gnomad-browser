import hail as hl

from data_pipeline.data_types.variant.transcript_consequence.annotate_transcript_consequences import (
    annotate_transcript_consequences_in_table,
)


def patch_rnu4atac_variants(vepped_path=None, freq_path=None, transcripts_data={}):
    veps = hl.read_table(vepped_path)
    freqs = hl.read_table(freq_path)
    # Drop all consequences except for gene RNU4ATAC and transcript ENST00000580972
    veps = veps.filter(veps.vep.transcript_consequences.any(lambda tc: tc.gene_symbol == "RNU4ATAC"))
    veps = veps.annotate(
        vep=veps.vep.annotate(
            transcript_consequences=veps.vep.transcript_consequences.filter(
                lambda tc: tc.transcript_id == "ENST00000580972"
            )
        )
    )
    veps = veps.filter(veps.vep.transcript_consequences.length() > 0)
    veps = annotate_transcript_consequences_in_table(veps, transcripts_data=transcripts_data)

    # We filter the data again here because annotate_transcript_consequences_in_table removes consequences with unimportant consequences terms
    veps = veps.filter(veps.transcript_consequences.length() > 0)
    veps = veps.annotate(
        transcript_consequences=veps.transcript_consequences.map(
            lambda tc: tc.annotate(
                transcript_version="2",
                gene_version="2",
                is_mane_select=False,
                is_mane_select_version=False,
                refseq_id=hl.null(hl.tstr),
                refseq_version=hl.null(hl.tstr),
            )
        )
    )
    veps = veps.annotate(
        transcript_consequences=veps.transcript_consequences.map(
            lambda tc: tc.drop("polyphen_prediction", "sift_prediction")
        )
    )

    freqs = freqs.drop("transcript_consequences")
    veps = veps.join(freqs)

    # Include just consequences and index fields
    veps = veps.select(veps.variant_id, veps.rsids, veps.caid, veps.vrs, veps.transcript_consequences)
    return veps
