import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import { withWindowSize } from '../windowSize'
import GenePage from './GenePage'

const AutosizedGenePage = withWindowSize(GenePage)

const query = `
query Gene($geneId: String, $geneSymbol: String, $referenceGenome: ReferenceGenomeId!) {
  gene(gene_id: $geneId, gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
    reference_genome
    gene_id
    symbol
    name
    canonical_transcript_id
    hgnc_id
    omim_id
    chrom
    start
    stop
    strand
    exons {
      feature_type
      start
      stop
    }
    gnomad_constraint {
      exp_lof
      exp_mis
      exp_syn
      obs_lof
      obs_mis
      obs_syn
      oe_lof
      oe_lof_lower
      oe_lof_upper
      oe_mis
      oe_mis_lower
      oe_mis_upper
      oe_syn
      oe_syn_lower
      oe_syn_upper
      lof_z
      mis_z
      syn_z
      pLI
    }
    exac_constraint {
      exp_syn
      obs_syn
      syn_z
      exp_mis
      obs_mis
      mis_z
      exp_lof
      obs_lof
      lof_z
      pLI
    }
    transcripts {
      transcript_id
      strand
      exons {
        feature_type
        start
        stop
      }
      gtex_tissue_expression: gtex_tissue_tpms_by_transcript {
        adipose_subcutaneous: adiposeSubcutaneous
        adipose_visceral_omentum: adiposeVisceralOmentum
        adrenal_gland: adrenalGland
        artery_aorta: arteryAorta
        artery_coronary: arteryCoronary
        artery_tibial: arteryTibial
        bladder: bladder
        brain_amygdala: brainAmygdala
        brain_anterior_cingulate_cortex_ba24: brainAnteriorcingulatecortexBa24
        brain_caudate_basal_ganglia: brainCaudateBasalganglia
        brain_cerebellar_hemisphere: brainCerebellarhemisphere
        brain_cerebellum: brainCerebellum
        brain_cortex: brainCortex
        brain_frontal_cortex_ba9: brainFrontalcortexBa9
        brain_hippocampus: brainHippocampus
        brain_hypothalamus: brainHypothalamus
        brain_nucleus_accumbens_basal_ganglia: brainNucleusaccumbensBasalganglia
        brain_putamen_basal_ganglia: brainPutamenBasalganglia
        brain_spinal_cord_cervical_c_1: brainSpinalcordCervicalc1
        brain_substantia_nigra: brainSubstantianigra
        breast_mammary_tissue: breastMammarytissue
        cells_ebv_transformed_lymphocytes: cellsEbvTransformedlymphocytes
        cells_transformed_fibroblasts: cellsTransformedfibroblasts
        cervix_ectocervix: cervixEctocervix
        cervix_endocervix: cervixEndocervix
        colon_sigmoid: colonSigmoid
        colon_transverse: colonTransverse
        esophagus_gastroesophageal_junction: esophagusGastroesophagealjunction
        esophagus_mucosa: esophagusMucosa
        esophagus_muscularis: esophagusMuscularis
        fallopian_tube: fallopianTube
        heart_atrial_appendage: heartAtrialappendage
        heart_left_ventricle: heartLeftventricle
        kidney_cortex: kidneyCortex
        liver: liver
        lung: lung
        minor_salivary_gland: minorSalivaryGland
        muscle_skeletal: muscleSkeletal
        nerve_tibial: nerveTibial
        ovary: ovary
        pancreas: pancreas
        pituitary: pituitary
        prostate: prostate
        skin_not_sun_exposed_suprapubic: skinNotsunexposedSuprapubic
        skin_sun_exposed_lower_leg: skinSunexposedLowerleg
        small_intestine_terminal_ileum: smallIntestineTerminalileum
        spleen: spleen
        stomach: stomach
        testis: testis
        thyroid: thyroid
        uterus: uterus
        vagina: vagina
        whole_blood: wholeBlood
      }
    }
    pext {
      start
      stop
      mean
      tissues {
        adipose_subcutaneous
        adipose_visceral_omentum
        adrenal_gland
        artery_aorta
        artery_coronary
        artery_tibial
        bladder
        brain_amygdala
        brain_anterior_cingulate_cortex_ba24
        brain_caudate_basal_ganglia
        brain_cerebellar_hemisphere
        brain_cerebellum
        brain_cortex
        brain_frontal_cortex_ba9
        brain_hippocampus
        brain_hypothalamus
        brain_nucleus_accumbens_basal_ganglia
        brain_putamen_basal_ganglia
        brain_spinal_cord_cervical_c_1
        brain_substantia_nigra
        breast_mammary_tissue
        cells_ebv_transformed_lymphocytes
        cells_transformed_fibroblasts
        cervix_ectocervix
        cervix_endocervix
        colon_sigmoid
        colon_transverse
        esophagus_gastroesophageal_junction
        esophagus_mucosa
        esophagus_muscularis
        fallopian_tube
        heart_atrial_appendage
        heart_left_ventricle
        kidney_cortex
        liver
        lung
        minor_salivary_gland
        muscle_skeletal
        nerve_tibial
        ovary
        pancreas
        pituitary
        prostate
        skin_not_sun_exposed_suprapubic
        skin_sun_exposed_lower_leg
        small_intestine_terminal_ileum
        spleen
        stomach
        testis
        thyroid
        uterus
        vagina
        whole_blood
      }
    }
    exac_regional_missense_constraint_regions {
      start
      stop
      obs_mis
      exp_mis
      obs_exp
      chisq_diff_null
    }
  }
}
`

const GenePageContainer = ({ datasetId, geneIdOrSymbol, ...otherProps }) => {
  const variables = geneIdOrSymbol.startsWith('ENSG')
    ? { geneId: geneIdOrSymbol }
    : { geneSymbol: geneIdOrSymbol }

  variables.referenceGenome = referenceGenomeForDataset(datasetId)

  return (
    <Query query={query} variables={variables}>
      {({ data, error, graphQLErrors, loading }) => {
        if (loading) {
          return <StatusMessage>Loading gene...</StatusMessage>
        }

        if (error || !data) {
          return <StatusMessage>Unable to load gene</StatusMessage>
        }

        if (!data.gene) {
          return (
            <StatusMessage>
              {graphQLErrors ? graphQLErrors.map(e => e.message).join(', ') : 'Unable to load gene'}
            </StatusMessage>
          )
        }

        return (
          <AutosizedGenePage
            {...otherProps}
            datasetId={datasetId}
            gene={data.gene}
            geneId={data.gene.gene_id}
          />
        )
      }}
    </Query>
  )
}

GenePageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  geneIdOrSymbol: PropTypes.string.isRequired,
}

export default GenePageContainer
