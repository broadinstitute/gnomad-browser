export default `
query ExacVariant ($variantId: String!) {
  variant(dataset: exac, variantId: $variantId) {
    variantId
    reference_genome
    chrom
    pos
    ref
    alt
    variantId
    ...on ExacVariantDetails {
      ac
      ac_hemi
      ac_hom
      an
      filters
      other_alt_alleles
      populations {
        id
        ac
        an
        ac_hemi
        ac_hom
      }
      age_distribution {
        het {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
        hom {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
      }
      qualityMetrics {
        genotypeDepth {
          all {
            bin_edges
            bin_freq
          }
          alt {
            bin_edges
            bin_freq
          }
        }
        genotypeQuality {
          all {
            bin_edges
            bin_freq
          }
          alt {
            bin_edges
            bin_freq
          }
        }
        siteQualityMetrics {
          BaseQRankSum
          ClippingRankSum
          DP
          FS
          InbreedingCoeff
          MQ
          MQRankSum
          QD
          ReadPosRankSum
          SiteQuality
          VQSLOD
        }
      }
      rsid
      sortedTranscriptConsequences {
        canonical
        gene_id
        gene_symbol
        hgvs
        hgvsc
        hgvsp
        lof
        lof_flags
        lof_filter
        major_consequence
        polyphen_prediction
        sift_prediction
        transcript_id
      }
    }
  }
}
`
