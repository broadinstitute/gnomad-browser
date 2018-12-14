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
      colocatedVariants
      multiNucleotideVariants {
        ac
        category
        mnvAminoAcidChange
        mnvCodonChange
        mnvConsequence
        otherVariantId
        otherAminoAcidChange
        otherCodonChange
        otherConsequence
        snvAminoAcidChange
        snvCodonChange
        snvConsequence
      }
      exome {
        ac
        an
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
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
          alleleBalance {
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
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
            RF
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
        faf95 {
          popmax
          popmax_population
        }
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
          alleleBalance {
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
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
            RF
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
        canonical
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
        polyphen_prediction
        sift_prediction
        transcript_id
      }
    }
  }
}
`
