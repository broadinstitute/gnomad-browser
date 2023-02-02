# This file consists of shared variables to be used by various pipeline
#   functions if given the '--create-test-datasets' flag.

SUBSAMPLE_FRACTION = 0.01
INTEGER = 1337

# The list of genes that should be included overall
#             PCSK9,             BRCA2,             DMD,               TTN
GENES_SET = {"ENSG00000169174", "ENSG00000139618", "ENSG00000198947", "ENSG00000155657"}

# TODO: There could be some sort of manual, and large (100+) set of genes such that
#   you never have to rely on ht.sample(n, m) - sample results in a random set of genes
#   and you need to have annotations in the tables for the same set of genes across everything
