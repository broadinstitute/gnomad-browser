import hail as hl

from data_pipeline.data_types.variant import variant_id


def prepare_variant_cooccurrence(path):
    ds = hl.read_table(path)

    ds = ds.key_by()

    ds = ds.select(
        variant_ids=[variant_id(ds.locus1, ds.alleles1), variant_id(ds.locus2, ds.alleles2)],
        genotype_counts=ds.phase_info["all"].gt_counts.adj,
        p_compound_heterozygous=hl.or_missing(
            ~hl.is_nan(ds.phase_info["all"].em.adj.p_chet),  # pylint: disable=invalid-unary-operand-type
            ds.phase_info["all"].em.adj.p_chet,
        ),
        populations=hl.sorted(ds.phase_info.keys())
        .filter(lambda pop: pop != "all")
        .map(
            lambda pop: hl.struct(
                id=pop,
                genotype_counts=ds.phase_info[pop].gt_counts.adj,
                p_compound_heterozygous=hl.or_missing(
                    ~hl.is_nan(ds.phase_info[pop].em.adj.p_chet),  # pylint: disable=invalid-unary-operand-type
                    ds.phase_info[pop].em.adj.p_chet,
                ),
            )
        ),
    )

    return ds
