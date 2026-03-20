import hail as hl


def patch_rnu4atac_transcript_consequences(variants_path):
    ds = hl.read_table(variants_path)
    ds = ds.annotate(
        transcript_consequences=ds.transcript_consequences.map(
            lambda tc: hl.if_else(
                tc.transcript_id == "ENST00000580972",
                tc.annotate(is_canonical=True, is_mane_select=True, is_mane_select_version=True),
                tc,
            )
        )
    )
    return ds
