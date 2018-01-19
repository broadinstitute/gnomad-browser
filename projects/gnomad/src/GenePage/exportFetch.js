import fetch from 'graphql-fetch'

const API_URL = process.env.GNOMAD_API_URL

export const exportFetch = (variantIdList, transcriptId, dataset, url = API_URL) => {
  const datasetMap = {
    gnomadExomeVariants: 'gnomad_exomes_202_37',
    gnomadGenomeVariants: 'gnomad_genomes_202_37',
  }
  const variables = {
    dataset: datasetMap[dataset],
    variantIdList,
    transcriptId,
  }
  const query = `
    query fetchForExport ($dataset: String, $variantIdList: [String], $transcriptId: String) {
      gnomadVariants(dataset: $dataset variantIdList: $variantIdList transcriptId: $transcriptId) {
          variant_id
          rsid
          pos
          xpos
          hgvsc
          hgvsp
          allele_count
          allele_freq
          allele_num
          hom_count
          hemi_count
          popmax
          popmax_ac
          popmax_an
          popmax_af
          lcr
          segdup
          filters
          consequence
          lof
          originalAltAlleles
          transcriptIds
          exon
          fitted_score
          pop_acs {
            european_non_finnish
            east_asian
            other
            african
            latino
            south_asian
            european_finnish
            ashkenazi_jewish
          }
          pop_ans {
            european_non_finnish
            east_asian
            other
            african
            latino
            south_asian
            european_finnish
            ashkenazi_jewish
          }
          pop_homs {
            european_non_finnish
            east_asian
            other
            african
            latino
            south_asian
            european_finnish
            ashkenazi_jewish
          }
          pop_hemi {
            european_non_finnish
            east_asian
            other
            african
            latino
            south_asian
            european_finnish
            ashkenazi_jewish
          }
          quality_metrics {
            FS
            MQRankSum
            InbreedingCoeff
            VQSLOD
            BaseQRankSum
            MQ
            ClippingRankSum
            ReadPosRankSum
            DP
            QD
            AS_RF
            DREF_MEDIAN
            DP_MEDIAN
            GQ_MEDIAN
            AB_MEDIAN
          }
        }
  }
`
  return new Promise((resolve, reject) => {
    fetch(url)(query, variables)
      .then(data => resolve(data.data.gnomadVariants))
      .catch((error) => {
        reject(error)
      })
  })
}
