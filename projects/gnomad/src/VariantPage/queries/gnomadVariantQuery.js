export default `
query GnomadVariant($variantId: String!, $datasetId: DatasetsSupportingFetchVariantDetails!) {
  variant(variantId: $variantId, dataset: $datasetId) {
    alt
    chrom
    pos
    ref
    variantId
    xpos
    ... on GnomadVariantDetails {
      colocatedVariants
      exome {
        ac
        an
        ac_hemi
        ac_hom
        faf95
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
          subpopulations {
            id
            ac
            an
            ac_hom
          }
        }
        qualityMetrics {
          genotypeDepth {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotypeQuality {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
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
            SOR
            VQSLOD
          }
        }
        reads {
          het {
            available
            expected
            readGroups
          }
          hom {
            available
            expected
            readGroups
          }
          hemi {
            available
            expected
            readGroups
          }
          bamPath
          indexPath
        }
      }
      genome {
        ac
        an
        ac_hemi
        ac_hom
        faf95
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
          subpopulations {
            id
            ac
            an
            ac_hom
          }
        }
        qualityMetrics {
          genotypeDepth {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotypeQuality {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
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
            SOR
            VQSLOD
          }
        }
        reads {
          het {
            available
            expected
            readGroups
          }
          hom {
            available
            expected
            readGroups
          }
          hemi {
            available
            expected
            readGroups
          }
          bamPath
          indexPath
        }
      }
      flags
      rsid
      sortedTranscriptConsequences {
        gene_id
        gene_symbol
        hgvs
        hgvsc
        hgvsp
        lof
        lof_flags
        lof_filter
        lof_info
        major_consequence
        transcript_id
      }
    }
  }
}
`
