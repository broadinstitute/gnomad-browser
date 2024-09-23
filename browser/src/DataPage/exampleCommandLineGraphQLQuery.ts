const content = `curl https://gnomad.broadinstitute.org/api \
-H 'Content-Type: application/graphql; charset=utf-8' \
--data-binary @- << END_OF_QUERY
# Lines beginning with a "#" character are comments that are ignored by the API.
#
# "VariantsInGene" is the operation name for the query. This is optional but
# recommended.
#
query VariantsInGene {
  # We could alternatively look up the gene by Ensembl ID by using the
  # "gene_id" argument rather than "gene_symbol".
  #
  # In this query, the gene symbol must be provided with quotes ("BRCA1"). This
  # does not apply to the reference genome build or gnomAD dataset version
  # because the gene symbol is defined as a string, but the reference genome
  # and dataset version are defined as enumerated types that only have specific
  # values (e.g., reference genome can only be one of GRCh37 or GRCh38). See
  # https://graphql.org/learn/schema/#enumeration-types.
  #
  gene(gene_symbol: "BRCA1", reference_genome: GRCh38) {
    variants(dataset: gnomad_r4) {
      variant_id

      # Position
      pos

      # dbSNP reference SNP IDs
      rsids

      transcript_id
      transcript_version

      # HGVS DNA, coding sequence, and protein consequences
      hgvs
      hgvsc
      hgvsp

      # VEP annotation
      consequence

      # Flags on the variant generally
      flags

      # The API separates the frequency data into exome data, genome data, and
      # joint frequency data. Which of these are available depends on the
      # dataset used, and not all variants in a dataset necessarily have all
      # of the possible kinds.
      #
      # Note that the exome and genome data have the same schema, but joint
      # frequency data is slightly different.
      #
      exome {
        # Full allele count, and hemizygote/homozygote allele counts.
        ac
        ac_hemi
        ac_hom

	# Allele number
        an

	# Allele frequency
        af

	# Allele counts and numbers by population
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }

	# Filters and flags for exome data
        filters
	flags
      }

      # Schema for genome data is same for that as exome data
      genome {
        ac
        ac_hemi
        ac_hom
        an
        af
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        filters
	flags
      }

      joint {
        # Full allele count, and hemizygote/homozygote allele counts.
        ac
        hemizygote_count
        homozygote_count

	# Allele number
        an

	# Allele counts and numbers by population
        populations {
          id
          ac
          an
          homozygote_count
          hemizygote_count
        }

	# Filters for joint-frequency data
        filters
      }

      # In-silico variant prediction annotations
      in_silico_predictors {
        id
        value
        flags
      }
    }
  }
}
END_OF_QUERY
`

export default content
