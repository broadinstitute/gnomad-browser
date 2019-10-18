import argparse

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
    ds = hl.import_vcf(vcf_path, force_bgz=True).rows()
    ds = ds.repartition(8, shuffle=True)

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
                if csq != "INTERGENIC" and csq != "NEAREST_TSS"
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
    # ds = ds.annotate(**{field.lower(): expr_for_per_population_field(ds, field) for field in PER_POPULATION_FIELDS})
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
                    for pop in POPULATIONS
                ),
                total=hl.struct(**{field.lower(): ds.info[field] for field in PER_POPULATION_FIELDS}),
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
                for pop in POPULATIONS + ["total"]
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
                for pop in POPULATIONS + ["total"]
            }
        )
    )

    ds = ds.key_by("variant_id")

    ds = ds.drop("locus", "alleles", "info", "rsid")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output")
    parser.add_argument("--vcf", default="gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.sites.vcf.gz")
    parser.add_argument(
        "--subset-vcf",
        default=[
            "controls=gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.vcf.gz",
            "non_neuro=gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.vcf.gz",
        ],
    )
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = import_structural_variants(args.vcf)
    ds = ds.annotate(freq=hl.struct(all=ds.freq))
    for subset_arg in args.subset_vcf:
        subset_name, subset_vcf = subset_arg.split("=")
        subset_ds = import_structural_variants(subset_vcf)
        ds = ds.annotate(freq=ds.freq.annotate(**{subset_name: subset_ds[ds.variant_id].freq}))

    ds.write(args.output)


if __name__ == "__main__":
    main()
