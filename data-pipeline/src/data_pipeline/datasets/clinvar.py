import functools
import gzip

import hail as hl

from data_pipeline.data_types.locus import normalized_contig, x_position
from data_pipeline.data_types.variant import variant_id


CLINVAR_GOLD_STARS = hl.dict(
    {
        "no_interpretation_for_the_single_variant": 0,
        "no_assertion_provided": 0,
        "no_assertion_criteria_provided": 0,
        "criteria_provided,_single_submitter": 1,
        "criteria_provided,_conflicting_interpretations": 1,
        "criteria_provided,_multiple_submitters,_no_conflicts": 2,
        "reviewed_by_expert_panel": 3,
        "practice_guideline": 4,
    }
)


def get_gold_stars(review_status):
    review_status_str = hl.delimit(hl.sorted(review_status, key=lambda s: s.replace("^_", "z")))
    return CLINVAR_GOLD_STARS[review_status_str]


def _parse_clinvar_release_date(vcf_path):
    open_file = hl.hadoop_open if vcf_path.startswith("gs://") else functools.partial(gzip.open, mode="rt")
    with open_file(vcf_path) as vcf_file:
        for line in vcf_file:
            if line.startswith("##fileDate="):
                clinvar_release_date = line.split("=")[-1].strip()
                return clinvar_release_date

            if not line.startswith("#"):
                return None

    return None


def import_clinvar_vcf(vcf_path, reference_genome):
    if reference_genome not in ("GRCh37", "GRCh38"):
        raise ValueError("Unsupported reference genome: " + str(reference_genome))

    clinvar_release_date = _parse_clinvar_release_date(vcf_path)

    # contigs in the ClinVar GRCh38 VCF are not prefixed with "chr"
    contig_recoding = None
    if reference_genome == "GRCh38":
        ref = hl.get_reference("GRCh38")
        contig_recoding = {
            ref_contig.replace("chr", ""): ref_contig for ref_contig in ref.contigs if "chr" in ref_contig
        }

    ds = hl.import_vcf(
        vcf_path,
        reference_genome=reference_genome,
        contig_recoding=contig_recoding,
        min_partitions=2000,
        force_bgz=True,
        drop_samples=True,
        skip_invalid_loci=True,
    ).rows()

    ds = ds.annotate_globals(version=clinvar_release_date)

    # Verify assumption that there are no multi-allelic variants and that splitting is not necessary.
    n_multiallelic_variants = ds.aggregate(hl.agg.filter(hl.len(ds.alleles) > 2, hl.agg.count()))
    assert n_multiallelic_variants == 0, "ClinVar VCF contains multi-allelic variants"

    return ds


def prepare_clinvar_variants(vcf_path, reference_genome):
    ds = import_clinvar_vcf(vcf_path, reference_genome)

    # There are some variants with only one entry in alleles, ignore them for now.
    # These could be displayed in the ClinVar track even though they will never match a gnomAD variant.
    ds = ds.filter(hl.len(ds.alleles) == 2)

    ds = hl.vep(ds)

    ds = ds.select(
        clinical_significance=hl.sorted(ds.info.CLNSIG, key=lambda s: s.replace("^_", "z")).map(
            lambda s: s.replace("^_", "")
        ),
        clinvar_variation_id=ds.rsid,
        gold_stars=get_gold_stars(ds.info.CLNREVSTAT),
        review_status=hl.sorted(ds.info.CLNREVSTAT, key=lambda s: s.replace("^_", "z")).map(
            lambda s: s.replace("^_", "")
        ),
        vep=ds.vep,
    )

    ds = ds.annotate(
        chrom=normalized_contig(ds.locus.contig), variant_id=variant_id(ds.locus, ds.alleles), xpos=x_position(ds.locus)
    )

    return ds
