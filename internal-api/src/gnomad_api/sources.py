import os

from .settings import DATA_DIRECTORY

########################################################################################################
# Gene/Transcript models
########################################################################################################
GRCH37_GENES = os.path.join(DATA_DIRECTORY, "gene_models_grch37.ht")
GRCH38_GENES = os.path.join(DATA_DIRECTORY, "gene_models_grch38.ht")

GRCH37_TRANSCRIPTS = os.path.join(DATA_DIRECTORY, "transcript_models_grch37.ht")
GRCH38_TRANSCRIPTS = os.path.join(DATA_DIRECTORY, "transcript_models_grch38.ht")

GENE_SEARCH_TERMS = os.path.join(DATA_DIRECTORY, "search_terms.json")

########################################################################################################
# gnomAD v3
########################################################################################################
GNOMAD_V3_VARIANTS = os.path.join(DATA_DIRECTORY, "gnomad_v3_variants.ht")

GNOMAD_V3_GENOME_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v3_genome_coverage.ht")

GNOMAD_V3_GENE_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v3_gene_coverage.ht")
GNOMAD_V3_TRANSCRIPT_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v3_transcript_coverage.ht")

########################################################################################################
# gnomAD v2
########################################################################################################
GNOMAD_V2_VARIANTS = os.path.join(DATA_DIRECTORY, "gnomad_v2_variants.ht")

GNOMAD_V2_EXOME_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v2_exome_coverage.ht")
GNOMAD_V2_GENOME_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v2_genome_coverage.ht")

GNOMAD_V2_GENE_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v2_gene_coverage.ht")
GNOMAD_V2_TRANSCRIPT_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "gnomad_v2_transcript_coverage.ht")

########################################################################################################
# gnomAD v2 MNVs
########################################################################################################

GNOMAD_V2_MULTI_NUCLEOTIDE_VARIANTS = os.path.join(DATA_DIRECTORY, "gnomad_v2_mnvs.ht")

########################################################################################################
# gnomAD v2 structural variants
########################################################################################################
GNOMAD_STRUCTURAL_VARIANTS = os.path.join(DATA_DIRECTORY, "structural_variants.ht")
GNOMAD_STRUCTURAL_VARIANTS_BY_GENE = os.path.join(DATA_DIRECTORY, "structural_variants_by_gene.ht")

########################################################################################################
# ExAC
########################################################################################################
EXAC_VARIANTS = os.path.join(DATA_DIRECTORY, "exac_variants.ht")

EXAC_EXOME_COVERAGE = os.path.join(DATA_DIRECTORY, "exac_coverage.ht")

EXAC_GENE_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "exac_gene_coverage.ht")
EXAC_TRANSCRIPT_FEATURE_COVERAGE = os.path.join(DATA_DIRECTORY, "exac_transcript_coverage.ht")

########################################################################################################
# ClinVar
########################################################################################################
CLINVAR_GRCH37_VARIANTS = os.path.join(DATA_DIRECTORY, "clinvar_grch37.ht")
CLINVAR_GRCH38_VARIANTS = os.path.join(DATA_DIRECTORY, "clinvar_grch38.ht")

########################################################################################################
# Other
########################################################################################################
RSID_INDEX = os.path.join(DATA_DIRECTORY, "rsids.ht")
