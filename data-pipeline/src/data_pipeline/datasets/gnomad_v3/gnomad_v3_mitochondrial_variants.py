import hail as hl

from data_pipeline.data_types.locus import normalized_contig
from data_pipeline.data_types.variant import variant_id


FILTER_NAMES = hl.dict(
    {"artifact_prone_site": "Artifact-prone site", "indel_stack": "Indel stack", "npg": "No passing genotype"}
)


def nullify_nan(value):
    return hl.cond(hl.is_nan(value), hl.null(value.dtype), value)


def prepare_mitochondrial_variants(path, mnvs_path=None):
    ds = hl.read_table(path)

    haplogroups = hl.eval(ds.globals.hap_order)

    ds = ds.annotate(
        hl_hist=ds.hl_hist.annotate(bin_edges=ds.hl_hist.bin_edges.map(lambda n: hl.float(hl.format("%.2f", n))))
    )

    ds = ds.select(
        # ID
        variant_id=variant_id(ds.locus, ds.alleles),
        reference_genome=ds.locus.dtype.reference_genome.name,
        chrom=normalized_contig(ds.locus.contig),
        pos=ds.locus.position,
        ref=ds.alleles[0],
        alt=ds.alleles[1],
        rsid=ds.rsid,
        # Quality
        filters=ds.filters.map(lambda f: FILTER_NAMES.get(f, f)),
        qual=ds.qual,
        genotype_quality_metrics=[hl.struct(name="Depth", alt=ds.dp_hist_alt, all=ds.dp_hist_all)],
        genotype_quality_filters=[
            hl.struct(
                name="Base Quality", filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.base_qual_hist),
            ),
            hl.struct(
                name="Contamination",
                filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.contamination_hist),
            ),
            hl.struct(
                name="Heteroplasmy below 10%",
                filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.heteroplasmy_below_10_percent_hist),
            ),
            hl.struct(name="Position", filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.position_hist)),
            hl.struct(
                name="Strand Bias", filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.strand_bias_hist),
            ),
            hl.struct(
                name="Weak Evidence",
                filtered=hl.struct(bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.weak_evidence_hist),
            ),
        ],
        site_quality_metrics=[
            hl.struct(name="Mean Depth", value=nullify_nan(ds.dp_mean)),
            hl.struct(name="Mean MQ", value=nullify_nan(ds.mq_mean)),
            hl.struct(name="Mean TLOD", value=nullify_nan(ds.tlod_mean)),
        ],
        # Frequency
        an=ds.AN,
        ac_hom=ds.AC_hom,
        ac_het=ds.AC_het,
        excluded_ac=ds.excluded_AC,
        # Heteroplasmy
        common_low_heteroplasmy=ds.common_low_heteroplasmy,
        heteroplasmy_distribution=ds.hl_hist,
        max_heteroplasmy=ds.max_hl,
        # Populations
        populations=hl.sorted(
            hl.range(hl.len(ds.globals.pop_order)).map(
                lambda pop_index: hl.struct(
                    id=ds.globals.pop_order[pop_index],
                    an=ds.pop_AN[pop_index],
                    ac_het=ds.pop_AC_het[pop_index],
                    ac_hom=ds.pop_AC_hom[pop_index],
                    heteroplasmy_distribution=hl.struct(
                        bin_edges=ds.hl_hist.bin_edges, bin_freq=ds.pop_hl_hist[pop_index], n_smaller=0, n_larger=0,
                    ),
                )
            ),
            key=lambda pop: pop.id,
        ),
        # Haplogroups
        hapmax_af_hom=ds.hapmax_AF_hom,
        hapmax_af_het=ds.hapmax_AF_het,
        faf_hapmax_hom=ds.faf_hapmax_hom,
        haplogroup_defining=ds.hap_defining_variant,
        haplogroups=[
            hl.struct(
                id=haplogroup,
                an=ds.hap_AN[i],
                ac_het=ds.hap_AC_het[i],
                ac_hom=ds.hap_AC_hom[i],
                faf_hom=ds.hap_faf_hom[i],
                heteroplasmy_distribution=ds.hap_hl_hist[i],
            )
            for i, haplogroup in enumerate(haplogroups)
        ],
        # Other
        age_distribution=hl.struct(het=ds.age_hist_het, hom=ds.age_hist_hom),
        flags=hl.set([hl.or_missing(ds.common_low_heteroplasmy, "common_low_heteroplasmy")]).filter(hl.is_defined),
        mitotip_score=ds.mitotip_score,
        mitotip_trna_prediction=ds.mitotip_trna_prediction,
        pon_ml_probability_of_pathogenicity=ds.pon_ml_probability_of_pathogenicity,
        pon_mt_trna_prediction=ds.pon_mt_trna_prediction,
        variant_collapsed=ds.variant_collapsed,
        vep=ds.vep,
    )

    if mnvs_path:
        mnvs = hl.import_table(mnvs_path, types={"pos": hl.tint, "ref": hl.tstr, "alt": hl.tstr, "AC_hom_MNV": hl.tint})
        mnvs = mnvs.key_by(
            locus=hl.locus("chrM", mnvs.pos, reference_genome=ds.locus.dtype.reference_genome),
            alleles=[mnvs.ref, mnvs.alt],
        )
        ds = ds.annotate(ac_hom_mnv=hl.or_else(mnvs[ds.key].AC_hom_MNV, 0))
        ds = ds.annotate(flags=hl.if_else(ds.ac_hom_mnv > 0, ds.flags.add("mnv"), ds.flags))

    return ds
