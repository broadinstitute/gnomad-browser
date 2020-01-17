import argparse
import gzip
import os
import subprocess
import tempfile

import hail as hl

from data_utils.computed_fields import normalized_contig, sorted_transcript_consequences_v3, variant_id, x_position


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
    with gzip.open(vcf_path, "rt") as vcf_file:
        for line in vcf_file:
            if line.startswith("##fileDate="):
                clinvar_release_date = line.split("=")[-1].strip()
                return clinvar_release_date

            if not line.startswith("#"):
                return None

    return None


def download_and_import_latest_clinvar_vcf(reference_genome):
    if reference_genome not in ("GRCh37", "GRCh38"):
        raise ValueError("Unsupported reference genome: " + str(reference_genome))

    # Download ClinVar VCF
    clinvar_url = f"ftp://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_{reference_genome}/clinvar.vcf.gz"

    temp_file, temp_file_path = tempfile.mkstemp(
        suffix=".vcf.gz", prefix=f"clinvar_{reference_genome}-", dir=os.getcwd()
    )
    os.close(temp_file)

    subprocess.run(["curl", "-o", temp_file_path, clinvar_url], check=True)

    # Copy into HDFS
    clinvar_vcf_hdfs_path = "/clinvar.vcf.gz"
    subprocess.run(["hdfs", "dfs", "-cp", "-f", f"file://{temp_file_path}", clinvar_vcf_hdfs_path], check=True)

    clinvar_release_date = _parse_clinvar_release_date(temp_file_path)

    # contigs in the ClinVar GRCh38 VCF are not prefixed with "chr"
    contig_recoding = None
    if reference_genome == "GRCh38":
        ref = hl.get_reference("GRCh38")
        contig_recoding = {
            ref_contig.replace("chr", ""): ref_contig for ref_contig in ref.contigs if "chr" in ref_contig
        }

    ds = hl.import_vcf(
        clinvar_vcf_hdfs_path,
        reference_genome=reference_genome,
        contig_recoding=contig_recoding,
        min_partitions=2000,
        force_bgz=True,
        drop_samples=True,
        skip_invalid_loci=True,
    ).rows()

    ds = ds.annotate_globals(version=clinvar_release_date)

    # Verify that there are no multi-allelic variants and that splitting is not necessary.
    n_multiallelic_variants = ds.aggregate(hl.agg.filter(hl.len(ds.alleles) > 2, hl.agg.count()))
    assert n_multiallelic_variants == 0, "ClinVar VCF contains multi-allelic variants"

    return ds


def format_clinvar_variants(ds):
    # There are some variants with only one entry in alleles, ignore them for now.
    # TODO: These could be displayed in the ClinVar track even though they will never match a gnomAD variant.
    ds = ds.filter(hl.len(ds.alleles) == 2)

    # When a cluster is started with hailctl dataproc start cluster_name --vep, the init script for the
    # selected version of VEP links the appropriate configuration file to /vep_data/vep-gcloud.json
    ds = hl.vep(ds, "file:///vep_data/vep-gcloud.json", name="vep", block_size=1000)
    ds = ds.annotate(sorted_transcript_consequences=sorted_transcript_consequences_v3(ds.vep))
    ds = ds.drop("vep")

    ds = ds.select(
        clinical_significance=hl.sorted(ds.info.CLNSIG, key=lambda s: s.replace("^_", "z")).map(
            lambda s: s.replace("^_", "")
        ),
        clinvar_variation_id=ds.rsid,
        gold_stars=get_gold_stars(ds.info.CLNREVSTAT),
        review_status=hl.sorted(ds.info.CLNREVSTAT, key=lambda s: s.replace("^_", "z")).map(
            lambda s: s.replace("^_", "")
        ),
        sorted_transcript_consequences=ds.sorted_transcript_consequences,
    )

    ds = ds.annotate(
        chrom=normalized_contig(ds.locus), variant_id=variant_id(ds.locus, ds.alleles), xpos=x_position(ds.locus)
    )

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reference_genome", choices=("GRCh37", "GRCh38"))
    parser.add_argument("output")
    args = parser.parse_args()

    ds = download_and_import_latest_clinvar_vcf(args.reference_genome)

    ds = format_clinvar_variants(ds)

    ds.write(args.output)


if __name__ == "__main__":
    main()
