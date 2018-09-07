import fetch from 'graphql-fetch'
import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { connect } from 'react-redux'

import { actions as geneActions, currentGene, exonPadding, geneData } from '@broad/redux-genes'

import { RegionViewer } from './RegionViewer'

const API_URL = 'http://gnomad-api2.broadinstitute.org/'

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

  return fetch(API_URL)(query).then(data => data.data.gene)
}

class GeneViewer extends PureComponent {
  static propTypes = {
    children: PropTypes.node,
    currentGene: PropTypes.string.isRequired,
    exonPadding: PropTypes.number.isRequired,
    fetchPageDataByGene: PropTypes.func.isRequired,
    geneData: PropTypes.object.isRequired,
  }

  static defaultProps = {
    children: undefined,
  }

  componentDidMount() {
    const { currentGene, fetchPageDataByGene } = this.props
    fetchPageDataByGene(currentGene, fetchGeneData)
  }

  render() {
    const { children, exonPadding, geneData, ...rest } = this.props

    if (!geneData) {
      return <div />
    }

    const geneJS = geneData.toJS()
    const canonicalExons = geneJS.transcript.exons

    return (
      <RegionViewer {...rest} padding={exonPadding} regions={canonicalExons}>
        {children}
      </RegionViewer>
    )
  }
}

const mapStateToProps = state => ({
  exonPadding: exonPadding(state),
  geneData: geneData(state),
  currentGene: currentGene(state),
})

export default connect(
  mapStateToProps,
  geneActions
)(GeneViewer)
