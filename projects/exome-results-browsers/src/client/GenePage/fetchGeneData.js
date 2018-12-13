import fetch from 'graphql-fetch'

export default geneName => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      full_gene_name
      canonical_transcript
      strand
      overallGeneResult {
        gene_id
        gene_name
        gene_description
        analysis_group
        categories {
          id
          xcase
          xctrl
          pval
        }
        pval_meta
      }
      groupGeneResults {
        gene_id
        gene_name
        gene_description
        analysis_group
        categories {
          id
          xcase
          xctrl
          pval
        }
        pval_meta
      }
      transcripts {
        transcript_id
        exons {
          feature_type
          start
          stop
        }
        gtex_tissue_tpms_by_transcript: gtex_tissue_expression {
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
  }
}`

  return fetch('/api')(query)
}
