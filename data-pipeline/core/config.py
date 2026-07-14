"""Shared configuration for the data pipeline."""

from core.enums import DataType, ReferenceGenome

# Contigs (1-22, X, Y, M) to keep per reference genome, using each assembly's naming.
CONTIGS_TO_KEEP = {
    ReferenceGenome.GRCh37: set([str(i) for i in range(1, 23)] + ["X", "Y", "MT"]),
    ReferenceGenome.GRCh38: set([f"chr{i}" for i in range(1, 23)] + ["chrX", "chrY", "chrM"]),
}

# GCS paths to the source data for each dataset.
#
# Most datasets are a single Hail Table; gnomAD v2.1.1 is the join of separate
# exomes and genomes tables, and ExAC is a VCF rather than a Hail Table.
DATASETS = {
    "ExAC": "gs://gcp-public-data--gnomad/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz",
    "gnomAD v2.1.1": {
        DataType.EXOMES: "gs://gcp-public-data--gnomad/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        DataType.GENOMES: "gs://gcp-public-data--gnomad/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
    "gnomAD v3.1.1": "gs://gcp-public-data--gnomad/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht",
    "gnomAD v4.0": "gs://gcp-public-data--gnomad/release/4.0/ht/genomes/gnomad.genomes.v4.0.sites.ht",
}
