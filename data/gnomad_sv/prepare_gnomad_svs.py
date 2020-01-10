import argparse
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

PROTEIN_CODING_CONSEQUENCES = [
    "COPY_GAIN",
    "DUP_LOF",
    "DUP_PARTIAL",
    "INTERGENIC",
    "INTRONIC",
    "INV_SPAN",
    "LOF",
    "MSV_EXON_OVR",
    "NEAREST_TSS",
    "PROMOTER",
    "UTR",
]

PER_POPULATION_FIELDS = [
    "AC",
    "AF",
    "AN",
    "FREQ_HET",
    "FREQ_HOMALT",
    "FREQ_HOMREF",
    "N_BI_GENOS",
    "N_HET",
    "N_HOMALT",
    "N_HOMREF",
]

POPULATIONS = ["afr", "amr", "eas", "eur", "oth"]

DIVISIONS = POPULATIONS + ["".join(s) for s in itertools.product(POPULATIONS, ["_female", "_male"])]

# For MCNVs, sum AC/AF for all alt alleles except CN=2
def sum_mcnv_ac_or_af(alts, values):
    return hl.bind(
        lambda cn2_index: hl.bind(
            lambda values_to_sum: values_to_sum.fold(lambda acc, n: acc + n, 0),
            hl.cond(hl.is_defined(cn2_index), values[0:cn2_index].extend(values[cn2_index + 1 :]), values),
        ),
        hl.zip_with_index(alts).find(lambda t: t[1] == "<CN=2>")[0],
    )


def import_structural_variants(vcf_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True, min_partitions=32).rows()

    ds = ds.annotate(**{field.lower(): ds.info[field] for field in TOP_LEVEL_INFO_FIELDS})

    ds = ds.annotate(
        variant_id=ds.rsid.replace("^gnomAD-SV_v2.1_", ""),
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

    # Group gene lists for all consequences in a struct
    ds = ds.annotate(
        consequences=hl.struct(
            **{
                csq.lower(): ds.info[f"PROTEIN_CODING__{csq}"]
                for csq in PROTEIN_CODING_CONSEQUENCES
                if csq not in ("INTERGENIC", "NEAREST_TSS")
            }
        )
    )
    ds = ds.annotate(intergenic=ds.info.PROTEIN_CODING__INTERGENIC)

    # Collect set of all genes for which a variant has a consequence
    all_genes = hl.empty_array(hl.tstr)
    for csq in ds.consequences.dtype.fields:
        all_genes = all_genes.extend(hl.or_else(ds.consequences[csq.lower()], hl.empty_array(hl.tstr)))
    ds = ds.annotate(genes=hl.set(all_genes))

    # Group per-population values in a struct for each field
    ds = ds.annotate(
        freq=hl.struct(
            **dict(
                (
                    (
                        pop,
                        hl.struct(
                            **{field.lower(): ds.info[f"{pop.upper()}_{field}"] for field in PER_POPULATION_FIELDS}
                        ),
                    )
                    for pop in DIVISIONS
                ),
                total=hl.struct(**{field.lower(): ds.info[field] for field in PER_POPULATION_FIELDS}),
                total_female=hl.struct(
                    **{field.lower(): ds.info[f"FEMALE_{field}"] for field in PER_POPULATION_FIELDS}
                ),
                total_male=hl.struct(**{field.lower(): ds.info[f"MALE_{field}"] for field in PER_POPULATION_FIELDS}),
            )
        )
    )

    # Store per-copy number AC/AF for MCNVs
    ds = ds.annotate(
        freq=ds.freq.annotate(
            **{
                pop: ds.freq[pop].annotate(
                    mcnv=hl.or_missing(ds.type == "MCNV", hl.struct(ac=ds.freq[pop].ac, af=ds.freq[pop].af))
                )
                for pop in DIVISIONS + ["total", "total_female", "total_male"]
            }
        )
    )

    # For MCNVs, sum AC/AF for all alt alleles except CN=2
    ds = ds.annotate(
        freq=ds.freq.annotate(
            **{
                pop: ds.freq[pop].annotate(
                    **{
                        "ac": hl.cond(
                            ds.type != "MCNV", ds.freq[pop].ac[0], sum_mcnv_ac_or_af(ds.alts, ds.freq[pop].ac)
                        ),
                        "af": hl.cond(
                            ds.type != "MCNV", ds.freq[pop].af[0], sum_mcnv_ac_or_af(ds.alts, ds.freq[pop].af)
                        ),
                    }
                )
                for pop in DIVISIONS + ["total", "total_female", "total_male"]
            }
        )
    )

    # Nest female/male values under populations
    ds = ds.annotate(
        freq=ds.freq.annotate(
            **{
                pop: ds.freq[pop].annotate(female=ds.freq[f"{pop}_female"], male=ds.freq[f"{pop}_male"])
                for pop in POPULATIONS + ["total"]
            }
        )
    )
    ds = ds.annotate(
        freq=ds.freq.drop(*["".join(s) for s in itertools.product(POPULATIONS + ["total"], ["_female", "_male"])])
    )

    # Add hemizygote fields
    ds = ds.annotate(
        freq=ds.freq.annotate(
            **{
                pop: ds.freq[pop].annotate(
                    male=ds.freq[pop].male.annotate(
                        n_hemiref=ds.info[f"{pop.upper()}_MALE_N_HEMIREF"],
                        n_hemialt=ds.info[f"{pop.upper()}_MALE_N_HEMIALT"],
                        freq_hemiref=ds.info[f"{pop.upper()}_MALE_FREQ_HEMIREF"],
                        freq_hemialt=ds.info[f"{pop.upper()}_MALE_FREQ_HEMIALT"],
                    )
                )
                for pop in POPULATIONS
            },
            total=ds.freq.total.annotate(
                male=ds.freq.total.male.annotate(
                    n_hemiref=ds.info.MALE_N_HEMIREF,
                    n_hemialt=ds.info.MALE_N_HEMIALT,
                    freq_hemiref=ds.info.MALE_FREQ_HEMIREF,
                    freq_hemialt=ds.info.MALE_FREQ_HEMIALT,
                )
            ),
        )
    )

    ds = ds.key_by("variant_id")

    ds = ds.drop("locus", "alleles", "info", "rsid")

    return ds


def annotate_with_histograms(ds, histograms):
    histograms = histograms.transmute(
        **{
            field: hl.struct(
                bin_freq=histograms[f"{field}_bin_freq"],
                bin_edges=histograms[f"{field}_bin_edges"],
                n_smaller=histograms[f"{field}_n_smaller"],
                n_larger=histograms[f"{field}_n_larger"],
            )
            for field in ["age_hist_het", "age_hist_hom", "gq_hist_alt", "gq_hist_all"]
        }
    )

    histograms = histograms.transmute(variant_id=histograms.rsid.replace("^gnomAD-SV_v2.1_", ""))

    histograms = histograms.key_by(histograms.variant_id).drop("locus", "alleles")

    ds = ds.annotate(**histograms[ds.variant_id])

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output")
    parser.add_argument("--vcf", default="gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.sites.vcf.gz")
    parser.add_argument(
        "--subset-vcf",
        nargs="+",
        default=[
            "controls=gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.vcf.gz",
            "non_neuro=gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.vcf.gz",
        ],
    )
    parser.add_argument("--histograms", default="gs://gnomad-public/papers/2019-sv/gnomad_sv_hists.ht")
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = import_structural_variants(args.vcf)
    ds = ds.annotate(freq=hl.struct(all=ds.freq))
    for subset_arg in args.subset_vcf:
        subset_name, subset_vcf = subset_arg.split("=")
        subset_ds = import_structural_variants(subset_vcf)
        ds = ds.annotate(freq=ds.freq.annotate(**{subset_name: subset_ds[ds.variant_id].freq}))

    if args.histograms:
        histograms = hl.read_table(args.histograms)
        ds = annotate_with_histograms(ds, histograms)

    ds.write(args.output)


if __name__ == "__main__":
    main()
