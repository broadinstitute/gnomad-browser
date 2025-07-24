import itertools
import hail as hl
from data_pipeline.helpers.xposition import x_position
from data_pipeline.helpers.consequences import group_consequence_genes

import hail as hl
from pprint import pp

RANKED_CONSEQUENCES = [
    "LOF",
    "INTRAGENIC_EXON_DUP",
    "PARTIAL_EXON_DUP",
    "COPY_GAIN",
    "TSS_DUP",
    "MSV_EXON_OVERLAP",
    "DUP_PARTIAL",
    "BREAKEND_EXONIC",
    "UTR",
    "PROMOTER",
    "INTRONIC",
    "INV_SPAN",
    "NONCODING_BREAKPOINT",
    "NONCODING_SPAN",
    "INTERGENIC",
    "NEAREST_TSS",
]

FREQ_FIELDS = [
    "AN",
    "AC",
    "AF",
    # "N_BI_GENOS",
    "N_HOMREF",
    "N_HET",
    "N_HOMALT",
    "FREQ_HOMREF",
    "FREQ_HET",
    "FREQ_HOMALT",
    #   "CN_NUMBER",
    #   "CN_COUNT",
    #   "CN_FREQ",
    #   "CN_NONREF_COUNT",
    #   "CN_NONREF_FREQ",
]

POPULATIONS = ["afr", "amr", "asj", "eas", "eur", "sas"]

NONEXISTENT_DIVISIONS = ["asj_FEMALE"]

DIVISIONS = list(itertools.chain.from_iterable([pop, f"{pop}_FEMALE", f"{pop}_MALE"] for pop in POPULATIONS)) + [
    "FEMALE",
    "MALE",
]
DIVISIONS = [div for div in DIVISIONS if div not in NONEXISTENT_DIVISIONS]


def import_variants_from_vcfs(vcf_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True, reference_genome="GRCh38")
    ds = ds.rows()

    ds = ds.annotate(
        variant_id=ds.rsid.replace("^chr", ""),
        reference_genome="GRCh38",
        chrom=ds.locus.contig.replace("chr", ""),
        pos=ds.locus.position,
        end=ds.info.END,
        length=ds.info.SVLEN,
        type=ds.info.SVTYPE,
        alts=ds.alleles[1:],
    )

    ds = ds.annotate(
        xpos=x_position(ds.chrom, ds.pos),
        xend=x_position(ds.chrom, ds.end),
    )

    ds = group_consequence_genes(ds, RANKED_CONSEQUENCES)
    ds = ds.annotate(
        freq=hl.struct(
            **{field.lower(): ds.info[field] for field in FREQ_FIELDS},
            populations=[
                hl.struct(id=division, **{field.lower(): ds.info[f"{division}_{field}"] for field in FREQ_FIELDS})
                for division in DIVISIONS
            ],
        )
    )

    ds = ds.annotate(
        freq=ds.freq.annotate(
            ac=ds.freq.ac[0],
            af=ds.freq.af[0],
        )
    )

    ds = ds.annotate(
        freq=ds.freq.rename(
            {
                "n_homref": "homozygote_ref_count",
                "n_homalt": "homozygote_alt_count",
                "n_het": "heterozygote_count",
                "freq_homref": "homozygote_ref_freq",
                "freq_homalt": "homozygote_alt_freq",
                "freq_het": "heterozygote_freq",
            }
        )
    )

    ds = ds.annotate(
        freq=ds.freq.annotate(
            populations=ds.freq.populations.map(
                lambda pop_struct: pop_struct.annotate(ac=pop_struct.ac[0], af=pop_struct.af[0]).rename(
                    {
                        "n_homref": "homozygote_ref_count",
                        "n_homalt": "homozygote_alt_count",
                        "n_het": "heterozygote_count",
                        "freq_homref": "homozygote_ref_freq",
                        "freq_homalt": "homozygote_alt_freq",
                        "freq_het": "heterozygote_freq",
                    }
                )
            )
        )
    )
    ds = ds.annotate(freq=hl.struct(all=ds.freq))
    ds = ds.annotate(freq=ds.freq.annotate(populations=ds.freq.all.populations))
    ds = ds.annotate(freq=ds.freq.annotate(all=ds.freq.all.drop("populations")))

    ds = ds.key_by("variant_id")
    ds = ds.drop("locus", "alleles", "info", "rsid")
    return ds
