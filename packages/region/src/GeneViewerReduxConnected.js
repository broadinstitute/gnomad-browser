/* eslint-disable react/prop-types */

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import fetch from 'graphql-fetch'

// import {
//   exonPadding,
// } from '@broad/gene-page/src/resources/active'

import {
  currentGene,
  geneData,
  exonPadding,
  actions as geneActions,
} from '@broad/redux-genes'

import RegionViewer from './RegionViewer'

const API_URL = 'http://gnomad-api2.broadinstitute.org/'

class GeneViewer extends PureComponent {
  componentDidMount() {
    const { currentGene, fetchPageDataByGene } = this.props
    fetchPageDataByGene(currentGene, this.fetchData)
  }

  fetchData = (geneName) => {
    // console.log(geneName)
    const query = `{
      gene(gene_name: "${geneName}") {
        gene_name
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
            transcriptId
            geneId
          }
        }
      }
    }`
    // console.log(query)
    return new Promise((resolve, reject) => {
      // console.log(API_URL)
      fetch(API_URL)(query)
        .then((data) => {
          // console.log(data)
          resolve(data.data.gene)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  render() {
    const { exonPadding, geneData, children, ...rest } = this.props
    console.log(geneData)
    if (!geneData) {
      return <div></div>
    }

    const geneJS = geneData.toJS()
    const canonicalExons = geneJS.transcript.exons

    return (
      <RegionViewer
        width={500}
        padding={exonPadding}
        regions={canonicalExons}
        rightPanelWidth={100}
        {...rest}
      >
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

export default connect(mapStateToProps, geneActions)(GeneViewer)
