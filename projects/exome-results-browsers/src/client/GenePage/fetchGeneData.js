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
      variants {
        ac
        ac_case
        ac_ctrl
        af_case
        af_ctrl
        allele_freq
        an
        an_case
        an_ctrl
        cadd
        canonical_transcript_id
        chrom
        comment
        consequence
        csq_analysis
        csq_canonical
        csq_worst
        estimate
        flags
        gene_id
        gene_name
        hgvsc
        hgvsc_canonical
        hgvsp
        hgvsp_canonical
        i2
        in_analysis
        mpc
        n_analysis_groups
        ac_denovo
        polyphen
        pos
        pval_meta
        qp
        se
        source
        transcript_id
        variant_id
        xpos
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

  return fetch('/api')(query).then(data => data.data.gene)
}
