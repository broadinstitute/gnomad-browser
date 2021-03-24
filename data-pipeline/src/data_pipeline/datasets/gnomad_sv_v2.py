import itertools

import hail as hl


def x_position(chrom, position):
    contig_number = (
        hl.case().when(chrom == "X", 23).when(chrom == "Y", 24).when(chrom[0] == "M", 25).default(hl.int(chrom))
    )
    return hl.int64(contig_number) * 1_000_000_000 + position


TOP_LEVEL_INFO_FIELDS = [
    "ALGORITHMS",
    "BOTHSIDES_SUPPORT",
    "CPX_INTERVALS",
    "CPX_TYPE",
    "EVIDENCE",
    "PCRPLUS_DEPLETED",
    "PESR_GT_OVERDISPERSION",
    "SOURCE",
    "STRANDS",
    "UNRESOLVED_TYPE",
    "UNSTABLE_AF_PCRPLUS",
    "VARIABLE_ACROSS_BATCHES",
    "PAR",
]

RANKED_CONSEQUENCES = [
    "LOF",
    "COPY_GAIN",
    "DUP_LOF",
    "MSV_EXON_OVR",
    "DUP_PARTIAL",
    "UTR",
    "PROMOTER",
    "INV_SPAN",
    "INTRONIC",
    "INTERGENIC",
    "NEAREST_TSS",
]

FREQ_FIELDS = [
    "AC",
    "AN",
    "AF",
    "N_HOMALT",
]

POPULATIONS = ["afr", "amr", "eas", "eur", "oth"]

DIVISIONS = list(
    itertools.chain.from_iterable(
        [(pop, pop.upper()), (f"{pop}_XX", f"{pop.upper()}_FEMALE"), (f"{pop}_XY", f"{pop.upper()}_MALE")]
        for pop in POPULATIONS
    )
) + [("XX", "FEMALE"), ("XY", "MALE")]

# For MCNVs, sum AC/AF for all alt alleles except CN=2
def sum_mcnv_ac_or_af(alts, values):
    return hl.bind(
        lambda cn2_index: hl.bind(
            lambda values_to_sum: values_to_sum.fold(lambda acc, n: acc + n, 0),
            hl.if_else(hl.is_defined(cn2_index), values[0:cn2_index].extend(values[cn2_index + 1 :]), values),
        ),
        hl.zip_with_index(alts).find(lambda t: t[1] == "<CN=2>")[0],
    )


def import_structural_variants(vcf_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True, min_partitions=32).rows()

    ds = ds.annotate(**{field.lower(): ds.info[field] for field in TOP_LEVEL_INFO_FIELDS})

    ds = ds.annotate(
        variant_id=ds.rsid.replace("^gnomAD-SV_v2.1_", ""),
        reference_genome="GRCh37",
        # Start
        chrom=ds.locus.contig,
        pos=ds.locus.position,
        xpos=x_position(ds.locus.contig, ds.locus.position),
        # End
        end=ds.info.END,
        xend=x_position(ds.locus.contig, ds.info.END),
        # Start 2
        chrom2=ds.info.CHR2,
        pos2=ds.info.POS2,
        xpos2=x_position(ds.info.CHR2, ds.info.POS2),
        # End 2
        end2=ds.info.END2,
        xend2=x_position(ds.info.CHR2, ds.info.END2),
        # Other
        length=ds.info.SVLEN,
        type=ds.info.SVTYPE,
        alts=ds.alleles[1:],
    )

    # MULTIALLELIC should not be used as a quality filter in the browser
    ds = ds.annotate(filters=ds.filters.difference(hl.set(["MULTIALLELIC"])))

    # Group gene lists for all consequences in one field
    ds = ds.annotate(
        consequences=hl.array(
            [
                hl.struct(
                    consequence=csq.lower(),
                    genes=hl.or_else(ds.info[f"PROTEIN_CODING__{csq}"], hl.empty_array(hl.tstr)),
                )
                for csq in RANKED_CONSEQUENCES
                if csq not in ("INTERGENIC", "NEAREST_TSS")
            ]
        ).filter(lambda csq: hl.len(csq.genes) > 0)
    )
    ds = ds.annotate(intergenic=ds.info.PROTEIN_CODING__INTERGENIC)

    ds = ds.annotate(
        major_consequence=hl.rbind(
            ds.consequences.find(lambda csq: hl.len(csq.genes) > 0),
            lambda csq: hl.or_else(csq.consequence, hl.or_missing(ds.intergenic, "intergenic")),
        )
    )

    # Collect set of all genes for which a variant has a consequence
    ds = ds.annotate(genes=hl.set(ds.consequences.flatmap(lambda c: c.genes)))

    # Group per-population frequency values
    ds = ds.annotate(
        freq=hl.struct(
            **{field.lower(): ds.info[field] for field in FREQ_FIELDS},
            populations=[
                hl.struct(id=pop_id, **{field.lower(): ds.info[f"{pop_key}_{field}"] for field in FREQ_FIELDS})
                for (pop_id, pop_key) in DIVISIONS
            ],
        )
    )

    # For MCNVs, store per-copy number allele counts
    ds = ds.annotate(
        freq=ds.freq.annotate(
            copy_numbers=hl.or_missing(
                ds.type == "MCNV",
                hl.zip_with_index(ds.alts).map(
                    lambda pair: hl.rbind(
                        pair[0],
                        pair[1],
                        lambda index, alt: hl.struct(
                            # Extract copy number. Example, get 2 from "CN=<2>"
                            copy_number=hl.int(alt[4:-1]),
                            ac=ds.freq.ac[index],
                        ),
                    )
                ),
            )
        )
    )

    # For MCNVs, sum AC/AF for all alt alleles except CN=2
    ds = ds.annotate(
        freq=ds.freq.annotate(
            ac=hl.if_else(ds.type == "MCNV", sum_mcnv_ac_or_af(ds.alts, ds.freq.ac), ds.freq.ac[0]),
            af=hl.if_else(ds.type == "MCNV", sum_mcnv_ac_or_af(ds.alts, ds.freq.af), ds.freq.af[0]),
            populations=hl.if_else(
                ds.type == "MCNV",
                ds.freq.populations.map(
                    lambda pop: pop.annotate(
                        ac=sum_mcnv_ac_or_af(ds.alts, pop.ac), af=sum_mcnv_ac_or_af(ds.alts, pop.af),
                    )
                ),
                ds.freq.populations.map(lambda pop: pop.annotate(ac=pop.ac[0], af=pop.af[0])),
            ),
        )
    )

    # Add hemizygous frequencies
    ds = ds.annotate(
        hemizygote_count=hl.dict(
            [
                (
                    pop_id,
                    hl.if_else(
                        ((ds.chrom == "X") | (ds.chrom == "Y")) & ~ds.par,
                        ds.info[f"{pop_id.upper()}_MALE_N_HEMIALT"],
                        0,
                    ),
                )
                for pop_id in POPULATIONS
            ]
            + [(f"{pop_id}_XX", 0) for pop_id in POPULATIONS]
            + [
                (
                    f"{pop_id}_XY",
                    hl.if_else(
                        ((ds.chrom == "X") | (ds.chrom == "Y")) & ~ds.par,
                        ds.info[f"{pop_id.upper()}_MALE_N_HEMIALT"],
                        0,
                    ),
                )
                for pop_id in POPULATIONS
            ]
            + [("XX", 0)]
            + [("XY", hl.if_else(((ds.chrom == "X") | (ds.chrom == "Y")) & ~ds.par, ds.info.MALE_N_HEMIALT, 0))]
        )
    )

    ds = ds.annotate(
        freq=ds.freq.annotate(
            hemizygote_count=hl.or_missing(
                ds.type != "MCNV",
                hl.if_else(((ds.chrom == "X") | (ds.chrom == "Y")) & ~ds.par, ds.info.MALE_N_HEMIALT, 0),
            ),
            populations=hl.if_else(
                ds.type != "MCNV",
                ds.freq.populations.map(lambda pop: pop.annotate(hemizygote_count=ds.hemizygote_count[pop.id])),
                ds.freq.populations.map(lambda pop: pop.annotate(hemizygote_count=hl.null(hl.tint))),
            ),
        )
    )

    ds = ds.drop("hemizygote_count")

    # Rename n_homalt
    ds = ds.annotate(
        freq=ds.freq.annotate(
            homozygote_count=ds.freq.n_homalt,
            populations=ds.freq.populations.map(
                lambda pop: pop.annotate(homozygote_count=pop.n_homalt).drop("n_homalt")
            ),
        ).drop("n_homalt")
    )

    # Re-key
    ds = ds.key_by("variant_id")

    ds = ds.drop("locus", "alleles", "info", "rsid")

    return ds


def annotate_with_histograms(ds, histograms):
    histograms = histograms.transmute(
        **{
            field: hl.struct(
                bin_freq=histograms[f"{field}_bin_freq"].split(r"\|").map(hl.float),
                bin_edges=histograms[f"{field}_bin_edges"].split(r"\|").map(hl.float),
                n_smaller=histograms[f"{field}_n_smaller"],
                n_larger=histograms[f"{field}_n_larger"],
            )
            for field in ["age_hist_het", "age_hist_hom", "gq_hist_alt", "gq_hist_all"]
        }
    )

    histograms = histograms.transmute(
        age_distribution=hl.struct(het=histograms.age_hist_het, hom=histograms.age_hist_hom,),
        genotype_quality=hl.struct(all=histograms.gq_hist_all, alt=histograms.gq_hist_alt),
    )

    histograms = histograms.transmute(variant_id=histograms.rsid.replace("^gnomAD-SV_v2.1_", ""))

    histograms = histograms.key_by(histograms.variant_id).drop("locus", "alleles")

    ds = ds.annotate(**hl.or_missing(ds.type != "MCNV", histograms[ds.variant_id]))

    return ds


def prepare_gnomad_structural_variants(vcf_path, controls_vcf_path, non_neuro_vcf_path, histograms_path):
    ds = import_structural_variants(vcf_path)
    ds = ds.annotate(freq=hl.struct(all=ds.freq))

    for subset_name, subset_vcf_path in [("controls", controls_vcf_path), ("non_neuro", non_neuro_vcf_path)]:
        subset_ds = import_structural_variants(subset_vcf_path)
        ds = ds.annotate(freq=ds.freq.annotate(**{subset_name: subset_ds[ds.variant_id].freq}))

    histograms = hl.read_table(histograms_path)
    ds = annotate_with_histograms(ds, histograms)

    return ds
