export default `
query GnomadVariant($variantId: String!) {
  variant(dataset: gnomad, variantId: $variantId) {
    alt
    chrom
    pos
    ref
    variantId
    xpos
    ...on GnomadVariantDetails {
      exome {
        ac
        an
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
          siteQualityMetrics {
            AB_MEDIAN
            AS_RF
            BaseQRankSum
            ClippingRankSum
            DP
            DP_MEDIAN
            DREF_MEDIAN
            FS
            GQ_MEDIAN
            InbreedingCoeff
            MQ
            MQRankSum
            QD
            ReadPosRankSum
            SiteQuality
            VQSLOD
          }
        }
        reads {
          het {
            available
            readGroups
          }
          hom {
            available
            readGroups
          }
          hemi {
            available
            readGroups
          }
          bamPath
          indexPath
        }
      }
      genome {
        ac
        an
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
          siteQualityMetrics {
            AB_MEDIAN
            AS_RF
            BaseQRankSum
            ClippingRankSum
            DP
            DP_MEDIAN
            DREF_MEDIAN
            FS
            GQ_MEDIAN
            InbreedingCoeff
            MQ
            MQRankSum
            QD
            ReadPosRankSum
            SiteQuality
            VQSLOD
          }
        }
        reads {
          het {
            available
            readGroups
          }
          hom {
            available
            readGroups
          }
          hemi {
            available
            readGroups
          }
          bamPath
          indexPath
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
