import fetch from 'graphql-fetch'
import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { connect } from 'react-redux'

import { actions as geneActions, geneData } from '@broad/redux-genes'

import { RegionViewer } from '..'

const API_URL = 'http://gnomad-api.broadinstitute.org/'

const fetchGeneData = geneName => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_name
      canonical_transcript
      strand
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
      transcripts {
        start
        transcript_id
        strand
        stop
        xstart
        chrom
        gene_id
        xstop
        exons {
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
    }
  }`

  return fetch(API_URL)(query)
}

class GeneViewer extends PureComponent {
  static propTypes = {
    geneName: PropTypes.string.isRequired,
    loadGene: PropTypes.func.isRequired,
  }

  componentDidMount() {
    const { loadGene } = this.props
    loadGene()
  }

  componentDidUpdate(prevProps) {
    const { geneName, loadGene } = this.props
    if (geneName !== prevProps.geneName) {
      loadGene()
    }
  }

  render() {
    const { children, gene, ...rest } = this.props

    if (!gene) {
      return null
    }

    const canonicalTranscriptExons = gene.toJS().transcript.exons

    return (
      <RegionViewer {...rest} padding={75} regions={canonicalTranscriptExons}>
        {children}
      </RegionViewer>
    )
  }
}

export default connect(
  state => ({
    gene: geneData(state),
  }),
  (dispatch, ownProps) => ({
    loadGene() {
      return dispatch(thunkDispatch => {
        thunkDispatch(geneActions.setCurrentGene(ownProps.geneName))
        thunkDispatch(geneActions.requestGeneData(ownProps.geneName))
        return fetchGeneData(ownProps.geneName).then(response => {
          thunkDispatch(geneActions.receiveGeneData(ownProps.geneName, response.data.gene))
          return response
        })
      })
    },
  })
)(GeneViewer)
