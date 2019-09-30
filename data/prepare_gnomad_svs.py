import argparse

import hail as hl


def xpos(chrom, position):
    contig_number = (
        hl.case().when(chrom == "X", 23).when(chrom == "Y", 24).when(chrom[0] == "M", 25).default(hl.int(chrom))
    )
    return hl.int64(contig_number) * 1_000_000_000 + position


TOP_LEVEL_INFO_FIELDS = [
    "ALGORITHMS",
    "CPX_INTERVALS",
    "CPX_TYPE",
    "EVIDENCE",
    "SOURCE",
    "STRANDS",
    "UNRESOLVED_TYPE",
    "PCRPLUS_DEPLETED",
    "PESR_GT_OVERDISPERSION",
]

PROTEIN_CODING_CONSEQUENCES = [
    "LOF",
    "DUP_LOF",
    "COPY_GAIN",
    "DUP_PARTIAL",
    "MSV_EXON_OVR",
    "INTRONIC",
    "INV_SPAN",
    "UTR",
    "NEAREST_TSS",
    "INTERGENIC",
    "PROMOTER",
]

PER_POPULATION_FIELDS = [
    "AN",
    "AC",
    "AF",
    "N_BI_GENOS",
    "N_HOMREF",
    "N_HET",
    "N_HOMALT",
    "FREQ_HOMREF",
    "FREQ_HET",
    "FREQ_HOMALT",
]

POPULATIONS = ["AFR", "AMR", "EAS", "EUR", "OTH"]

# Group per-population values in a struct for each field
def expr_for_per_population_field(row, field):
    return hl.struct(**dict(((pop.lower(), row.info[f"{pop}_{field}"]) for pop in POPULATIONS), total=row.info[field]))


# For MCNVs, sum AC/AF for all alt alleles except CN=2
def total_ac_or_af(variant, field):
    return hl.cond(
        variant.type == "MCNV",
        hl.bind(
            lambda cn2_index: hl.bind(
                lambda values_to_sum: values_to_sum.fold(lambda acc, n: acc + n, 0),
                hl.cond(hl.is_defined(cn2_index), field[0:cn2_index].extend(field[cn2_index + 1 :]), field),
            ),
            hl.zip_with_index(variant.alts).find(lambda t: t[1] == "<CN=2>")[0],
        ),
        field[0],
    )


def import_structural_variants(vcf_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True).rows()
    ds = ds.repartition(8, shuffle=True)

    ds = ds.annotate(**{field.lower(): ds.info[field] for field in TOP_LEVEL_INFO_FIELDS})

    ds = ds.annotate(
        variant_id=ds.rsid.replace("^gnomAD_v2_", ""),
        chrom=ds.locus.contig,
        pos=ds.locus.position,
        xpos=xpos(ds.locus.contig, ds.locus.position),
        end_chrom=ds.info.CHR2,
        end_pos=ds.info.END,
        end_xpos=xpos(ds.info.CHR2, ds.info.END),
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
    ds = ds.annotate(**{field.lower(): expr_for_per_population_field(ds, field) for field in PER_POPULATION_FIELDS})

    # For MCNVs, sum AC/AF for all alt alleles except CN=2
    ds = ds.annotate(mcnv_ac=hl.or_missing(ds.type == "MCNV", ds.ac), mcnv_af=hl.or_missing(ds.type == "MCNV", ds.af))
    ds = ds.annotate(
        **{
            f: ds[f].annotate(**{pop: total_ac_or_af(ds, ds[f][pop]) for pop in ds[f].dtype.fields})
            for f in ["ac", "af"]
        }
    )

    ds = ds.annotate(af=ds.af.annotate(popmax=ds.info.POPMAX_AF))

    ds = ds.key_by("variant_id")

    ds = ds.drop("locus", "alleles", "info")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sv-vcf", help="URL of gnomAD SV VCF", default="gs://gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz"
    )
    parser.add_argument("--output", help="URL to write Hail table to", required=True)
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = import_structural_variants(args.sv_vcf)

    ds.write(args.output)


if __name__ == "__main__":
    main()
