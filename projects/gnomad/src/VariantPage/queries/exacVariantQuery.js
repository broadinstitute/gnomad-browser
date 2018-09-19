export default `
query ExacVariant ($variantId: String!) {
  variant(dataset: exac, variantId: $variantId) {
    alt
    chrom
    pos
    ref
    variantId
    xpos
    ...on ExacVariantDetails {
      ac {
        raw
        adj
      }
      an {
        raw
        adj
      }
      filters
      populations {
        id
        ac
        an
        hemi
        hom
      }
      qualityMetrics {
        genotypeDepth {
          all
          alt
        }
        genotypeQuality {
          all
          alt
        }
      }
      rsid
      sortedTranscriptConsequences {
        amino_acids
        biotype
        category
        cdna_start
        cdna_end
        codons
        consequence_terms
        domains
        gene_id
        gene_symbol
        gene_symbol_source
        hgvs
        hgvsc
        hgvsp
        lof
        lof_flags
        lof_filter
        lof_info
        major_consequence
        major_consequence_rank
        protein_id
        transcript_id
      }
    }
  }
}
`
