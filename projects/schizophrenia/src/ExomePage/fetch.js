import fetch from 'graphql-fetch'

const API_URL = process.env.GNOMAD_API_URL

export const fetchSchz = (geneName) => {
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
      canonical_transcript
      strand
      schzGeneResult {
        gene_name
        description
        gene_id
        case_lof
        ctrl_lof
        pval_lof
        case_mpc
        ctrl_mpc
        pval_mpc
        pval_meta
      }
      schizophreniaRareVariants {
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

  return fetch(API_URL)(query)
    .then(data => data.data.gene)
}
