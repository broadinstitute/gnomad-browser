/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import R from 'ramda'

import { RegionViewer, markerExacClassic } from '@broad/region'

import VariantTrack from '@broad/track-variant'
import { NavigatorTrackConnected } from '@broad/track-navigator'
import { TranscriptTrackConnected } from '@broad/track-transcript'

import { screenSize, Loading } from '@broad/ui'

import { actions as tableActions } from '@broad/table'

import {
  geneData,
  exonPadding,
  transcriptFanOut,
  actions as geneActions
} from '@broad/redux-genes'

import {
  finalFilteredVariants,
  variantFilter,
  focusedVariant,
  allVariantsInCurrentDataset,
  actions as variantActions,
} from '@broad/redux-variants'

const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

const attributeConfig = {
  CDS: {
    color: '#424242',
    thickness: masterExonThickness,
  },
  start_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  end_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  intron: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  default: {
    color: 'grey',
    thickness: masterPaddingThickness,
  },
}

class SchizophreniaGeneViewer extends PureComponent {
  componentDidMount() {
    const {
      allVariantsInCurrentDataset,
      focusedVariant,
      setFocusedVariant,
    } = this.props

    // HACK display variant with highest allele count to fill out variant section
    if (!allVariantsInCurrentDataset.has(focusedVariant)) {
      const maxAc = allVariantsInCurrentDataset.maxBy(variant => variant.get('ac_case'))
      setFocusedVariant(maxAc.get('variant_id'))
    }
  }

  render() {
    const {
      gene,
      visibleVariants,
      exonPadding,
      screenSize,
      transcriptFanOut,
      toggleTranscriptFanOut,
      variantFilter,
      allVariantsInCurrentDataset,
      focusedVariant,
      setFocusedVariant,
      setCurrentTableScrollData,
    } = this.props

    const smallScreen = screenSize.width < 900
    const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

    const geneJS = gene.toJS()
    const canonicalExons = geneJS.transcript.exons
    const { transcript } = geneJS
    const variantsReversed = visibleVariants.reverse()

    console.log(variantsReversed)
    if (variantsReversed.isEmpty()) {
      return <Loading />
    }

    const cases = variantsReversed
      .map((v) => {
        if (v.ac_denovo) {
          const cases = v.ac_case ? v.ac_case : 0
          return v
            .set('ac_case', v.ac_denovo + cases)
            .set('an_case', 46846) // HACK
        }
        return v
      })
      .filter(v => v.ac_case > 0)
      .map(v => v.set('allele_freq', v.af_case))

    const controls = variantsReversed
      .filter(v => v.ac_ctrl > 0)
      .map(v => v.set('allele_freq', v.af_ctrl))

    const consequenceTranslations = {
      all: 'All variants',
      missenseOrLoF: 'Missense/LoF',
      lof: 'LoF',
    }

    // const casesCount = cases.reduce((acc, v) => acc + v.ac_case, 0)
    // const controlsCount = controls.reduce((acc, v) => acc + v.ac_ctrl, 0)

    return (
      <div>
        <RegionViewer
          width={regionViewerWidth}
          padding={exonPadding}
          regions={canonicalExons}
          regionAttributes={attributeConfig}
          leftPanelWidth={100}
        >
          <TranscriptTrackConnected
            height={12}
            showRightPanel={!smallScreen}
            transcriptFanOut={transcriptFanOut}
            transcriptButtonOnClick={toggleTranscriptFanOut}
          />
          <VariantTrack
            key={'cases'}
            height={60}
            markerConfig={{ ...markerExacClassic }}
            variants={cases}
            title={`Cases|${consequenceTranslations[variantFilter]}|variants|(${cases.size})`}
          />
          <VariantTrack
            key={'controls'}
            height={60}
            markerConfig={{ ...markerExacClassic }}
            variants={controls}
            title={`Controls|${consequenceTranslations[variantFilter]}|variants|(${controls.size})`}
          />
          <NavigatorTrackConnected title={'Viewing in table'} />
        </RegionViewer>
      </div>
    )
  }
}
SchizophreniaGeneViewer.propTypes = {
  gene: PropTypes.object.isRequired,
  visibleVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  variantFilter: PropTypes.string.isRequired,
  screenSize: PropTypes.object.isRequired,
  transcriptFanOut: PropTypes.bool.isRequired,
  toggleTranscriptFanOut: PropTypes.func.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    visibleVariants: finalFilteredVariants(state),
    screenSize: screenSize(state),
    transcriptFanOut: transcriptFanOut(state),
    variantFilter: variantFilter(state),
    focusedVariant: focusedVariant(state),
    allVariantsInCurrentDataset: allVariantsInCurrentDataset(state),
  }),
  dispatch => ({
    toggleTranscriptFanOut: () => dispatch(geneActions.toggleTranscriptFanOut()),
    setFocusedVariant: variantId => dispatch(variantActions.setFocusedVariant(variantId)),
    setCurrentTableScrollData: data => dispatch(tableActions.setCurrentTableScrollData(data))

  })
)(SchizophreniaGeneViewer)
