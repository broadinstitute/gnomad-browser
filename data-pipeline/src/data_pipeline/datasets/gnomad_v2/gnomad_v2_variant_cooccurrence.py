import hail as hl

from data_pipeline.data_types.variant import variant_id


def fix_haplotype_counts(genotype_counts, haplotype_counts):
    # hl.experimental.haplotype_freq_em returns all NaNs in some cases
    # such as when one of the two variants does not occur.
    # However, we only need to use it when there are samples that are
    # heterozygous for both variants (genotype_counts[4] > 0).
    # In other cases, we can directly calculate haplotype counts.
    return hl.if_else(
        genotype_counts[4] > 0,
        haplotype_counts,
        # genotype counts are ordered [AABB, AABb, AAbb, AaBB, AaBb, Aabb, aaBB, aaBb, aabb]
        # haplotype counts are ordered [AB, aB, Ab, ab]
        [
            2.0 * genotype_counts[0] + genotype_counts[1] + genotype_counts[3],  # n.AB => 2*n.AABB + n.AABb + n.AaBB
            2.0 * genotype_counts[6] + genotype_counts[3] + genotype_counts[7],  # n.aB => 2*n.aaBB + n.AaBB + n.aaBb
            2.0 * genotype_counts[2] + genotype_counts[1] + genotype_counts[5],  # n.Ab => 2*n.AAbb + n.AABb + n.Aabb
            2.0 * genotype_counts[8] + genotype_counts[5] + genotype_counts[7],  # n.ab => 2*n.aabb + n.Aabb + n.aaBb
        ],
    )


def shape_phase_info_data(phase_info):
    return hl.rbind(
        fix_haplotype_counts(phase_info.gt_counts, phase_info.em.hap_counts),
        lambda haplotype_counts: hl.struct(
            genotype_counts=phase_info.gt_counts,
            haplotype_counts=haplotype_counts,
            p_compound_heterozygous=hl.rbind(
                (haplotype_counts[1] * haplotype_counts[2])
                / (haplotype_counts[0] * haplotype_counts[3] + haplotype_counts[1] * haplotype_counts[2]),
                lambda p_compound_heterozygous: hl.if_else(
                    hl.is_nan(p_compound_heterozygous),
                    hl.missing(p_compound_heterozygous.dtype),
                    p_compound_heterozygous,
                ),
            ),
        ),
    )


def prepare_variant_cooccurrence(path):
    ds = hl.read_table(path)

    ds = ds.key_by()

    ds = ds.select(
        variant_ids=[variant_id(ds.locus1, ds.alleles1), variant_id(ds.locus2, ds.alleles2)],
        **shape_phase_info_data(ds.phase_info["all"]),
        populations=hl.sorted(ds.phase_info.keys())
        .filter(lambda pop: pop != "all")
        .map(lambda pop: hl.struct(id=pop, **shape_phase_info_data(ds.phase_info[pop]))),
    )

    return ds
