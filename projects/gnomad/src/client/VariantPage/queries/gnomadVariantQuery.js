export default `
query GnomadVariant($variantId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  variant(variantId: $variantId, dataset: $datasetId) {
    variantId
    reference_genome
    chrom
    pos
    ref
    alt
    ... on GnomadVariantDetails {
      colocatedVariants
      multiNucleotideVariants {
        combined_variant_id
        changes_amino_acids
        n_individuals
        other_constituent_snvs
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
            pab_max
            QD
            ReadPosRankSum
            RF
            SiteQuality
            SOR
            VQSLOD
          }
        }
        reads {
          bamPath
          category
          indexPath
          readGroup
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
            pab_max
            QD
            ReadPosRankSum
            RF
            SiteQuality
            SOR
            VQSLOD
          }
        }
        reads {
          bamPath
          category
          indexPath
          readGroup
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
        major_consequence
        polyphen_prediction
        sift_prediction
        transcript_id
      }
    }
  }
  clinvar_variant(variant_id: $variantId, reference_genome: $referenceGenome) {
    allele_id
  }
}
`
