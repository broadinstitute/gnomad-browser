import fetch from 'graphql-fetch'

// import TestData from '@resources/1505910855-variantfx-myh7.json'
// export default () => new Promise(resolve => resolve(TestData))

const GNOMAD_API_URL = process.env.GNOMAD_API_URL
const VARIANT_FX_API_URL = process.env.VARIANT_FX_API_URL

const fetchVariantData = (geneName, url = VARIANT_FX_API_URL) => {
  const query = `{
  variantByGene(SYMBOL: "${geneName}") {
    VEP {
      ENST
      Consequence
      SYMBOL
      SYMBOL_SOURCE
      ENSG
      Feature
      BIOTYPE
      HGVSc
      HGVSp
      cDNA_position
      CDS_position
      Protein_position
      Amino_acids
      Codons
      Existing_variation
      STRAND
      CANONICAL
      CCDS
      ENSP
      SIFT
      PolyPhen
      ExAC_MAF
      PUBMED
    }
    VAR_ID
    CHROM
    POS
    REF
    ALT
    ID
    FILTER
    DP
    FS
    MLEAC
    MLEAF
    MQ
    MQ0
    QD
    EGY_DCM_AFR_AC
    EGY_DCM_AFR_AN
    EGY_HCM_AFR_AC
    EGY_HCM_AFR_AN
    EGY_HVO_AFR_AC
    EGY_HVO_AFR_AN
    EGY_DCM_HH
    EGY_HCM_HH
    EGY_HVO_HH
    SGP_DCM_SAS_AC
    SGP_DCM_SAS_AN
    SGP_HCM_SAS_AC
    SGP_HCM_SAS_AN
    SGP_HVO_SAS_AC
    SGP_HVO_SAS_AN
    SGP_DCM_HH
    SGP_HCM_HH
    SGP_HVO_HH
    RBH_DCM_AFR_AC
    RBH_DCM_AFR_AN
    RBH_DCM_SAS_AC
    RBH_DCM_SAS_AN
    RBH_DCM_NFE_AC
    RBH_DCM_NFE_AN
    RBH_DCM_EAS_AC
    RBH_DCM_EAS_AN
    RBH_DCM_OTH_AC
    RBH_DCM_OTH_AN
    RBH_HCM_AFR_AC
    RBH_HCM_AFR_AN
    RBH_HCM_SAS_AC
    RBH_HCM_SAS_AN
    RBH_HCM_NFE_AC
    RBH_HCM_NFE_AN
    RBH_HCM_EAS_AC
    RBH_HCM_EAS_AN
    RBH_HCM_OTH_AC
    RBH_HCM_OTH_AN
    RBH_HVO_AFR_AC
    RBH_HVO_AFR_AN
    RBH_HVO_SAS_AC
    RBH_HVO_SAS_AN
    RBH_HVO_NFE_AC
    RBH_HVO_NFE_AN
    RBH_HVO_EAS_AC
    RBH_HVO_EAS_AN
    RBH_HVO_OTH_AC
    RBH_HVO_OTH_AN
    RBH_DCM_HH
    RBH_HCM_HH
    RBH_HVO_HH
    RBH_DCM_0_10_AC
    RBH_DCM_11_20_AC
    RBH_DCM_21_30_AC
    RBH_DCM_31_40_AC
    RBH_DCM_41_50_AC
    RBH_DCM_51_60_AC
    RBH_DCM_61_70_AC
    RBH_DCM_71_80_AC
    RBH_DCM_81_90_AC
    RBH_HCM_0_10_AC
    RBH_HCM_11_20_AC
    RBH_HCM_21_30_AC
    RBH_HCM_31_40_AC
    RBH_HCM_41_50_AC
    RBH_HCM_51_60_AC
    RBH_HCM_61_70_AC
    RBH_HCM_71_80_AC
    RBH_HCM_81_90_AC
    RBH_HVO_11_20_AC
    RBH_HVO_21_30_AC
    RBH_HVO_31_40_AC
    RBH_HVO_41_50_AC
    RBH_HVO_51_60_AC
    RBH_HVO_61_70_AC
    RBH_HVO_71_80_AC
    LMM_DCM_UNK_AC
    LMM_DCM_UNK_AN
    LMM_HCM_UNK_AC
    LMM_HCM_UNK_AN
    OMG_HCM_UNK_AC
    OMG_HCM_UNK_AN
    OMG_DCM_UNK_AC
    OMG_DCM_UNK_AN
    GNO_HVO_UNK_AC
    GNO_HVO_UNK_AN
    GNO_HVO_UNK_AF
    CTL_AC
    HCM_AC
    DCM_AC
    HCM_AN
    DCM_AN
    CTL_AN
  }
}`

  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.variantByGene))
      .catch((error) => {
        reject(error)
      })
  })
}

const fetchGeneData = (geneName, url = GNOMAD_API_URL) => {
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
      strand
      canonical_transcript
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

export default function fetchData(geneName) {
  return Promise.all([
    fetchVariantData(geneName),
    fetchGeneData(geneName),
  ]).then(([variantsRaw, gene]) => {
    const variants = variantsRaw.map(({
      VAR_ID,
      CHROM,
      REF,
      ALT,
      ID,
      FILTER,
      POS,
      CTL_AC,
      HCM_AC,
      DCM_AC,
      HCM_AN,
      DCM_AN,
      CTL_AN,
      VEP,
      ...rest
    }) => {
      return ({
        variant_id: VAR_ID,
        chrom: CHROM,
        ref: REF,
        alt: ALT,
        rsid: ID,
        filter: FILTER,
        pos: POS,
        CTL_AC,
        HCM_AC,
        DCM_AC,
        HCM_AN,
        DCM_AN,
        CTL_AN,
        allele_freq: (CTL_AC + HCM_AC + DCM_AC) / (HCM_AN + DCM_AN + CTL_AN),
        ...VEP[0],
        ...rest,
      })
    })
    return ({ ...gene, variants })
  }).catch(error => console.log(error))
}

// fetchData('MYH7').then(data => console.log(data.variants[0]))
