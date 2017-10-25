import fetch from 'graphql-fetch'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8007'

export const fetchSchz = (geneName, options, url = API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      omim_accession
      full_gene_name
      start
      stop
      xstart
      xstop
      schzGeneResults {
        geneName
        dnmLof
        caseLof
        ctrlLof
        caseMis
        ctrlMis
        pCaco
        pMeta
      }
      schizophreniaExomeVariants {
        variant_id
        chrom
        pos
        xpos
        ref
        alt
        rsid
        qual
        geneIds
        transcriptIds
        consequence
        sortedTranscriptConsequences
        AC
        AF
        AC_cases
        AC_ctrls
        AC_UK_cases
        AC_UK_ctrls
        AC_FIN_cases
        AC_FIN_ctrls
        AC_SWE_cases
        AC_SWE_ctrls
      }
      schizophreniaGwasVariants {
        variant_id
        chr
        pos
        ref
        alt
        n_study
        study
        p_value
        scz_af
        hc_af
        odds_ratio
        se
        qp
        i_squared
        mhtp
        comment
      }
      transcripts {
        _id
        start
        transcript_id
        strand
        stop
        xstart
        chrom
        gene_id
        xstop
        exons {
          _id
          start
          transcript_id
          feature_type
          strand
          stop
          chrom
          gene_id
        }
        gtex_tissue_tpms_by_transcript {
          adiposeSubcutaneous
          adiposeVisceralOmentum
          adrenalGland
          arteryAorta
          arteryCoronary
          arteryTibial
          bladder
          brainAmygdala
          brainAnteriorcingulatecortexBa24
          brainCaudateBasalganglia
          brainCerebellarhemisphere
          brainCerebellum
          brainCortex
          brainFrontalcortexBa9
          brainHippocampus
          brainHypothalamus
          brainNucleusaccumbensBasalganglia
          brainPutamenBasalganglia
          brainSpinalcordCervicalc1
          brainSubstantianigra
          breastMammarytissue
          cellsEbvTransformedlymphocytes
          cellsTransformedfibroblasts
          cervixEctocervix
          cervixEndocervix
          colonSigmoid
          colonTransverse
          esophagusGastroesophagealjunction
          esophagusMucosa
          esophagusMuscularis
          fallopianTube
          heartAtrialappendage
          heartLeftventricle
          kidneyCortex
          liver
          lung
          minorSalivaryGland
          muscleSkeletal
          nerveTibial
          ovary
          pancreas
          pituitary
          prostate
          skinNotsunexposedSuprapubic
          skinSunexposedLowerleg
          smallIntestineTerminalileum
          spleen
          stomach
          testis
          thyroid
          uterus
          vagina
          wholeBlood
        }
      }
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
      exons {
        _id
        start
        transcript_id
        feature_type
        strand
        stop
        chrom
        gene_id
      }
  }
}`

  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}
