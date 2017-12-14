/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import R from 'ramda'

import { RegionViewer, markerExacClassic } from '@broad/region'

import VariantTrack from '@broad/track-variant'
import { NavigatorTrackConnected } from '@broad/track-navigator'
import { TranscriptTrackConnected } from '@broad/track-transcript'

import { screenSize } from '@broad/ui'

import {
  geneData,
  exonPadding,
  transcriptFanOut,
  actions as geneActions
} from '@broad/redux-genes'

import {
  finalFilteredVariants,
  variantFilter,
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

const SchizophreniaGeneViewer = ({
  gene,
  visibleVariants,
  exonPadding,
  screenSize,
  transcriptFanOut,
  toggleTranscriptFanOut,
  variantFilter,
}) => {
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

  const geneJS = gene.toJS()
  const canonicalExons = geneJS.transcript.exons
  const { transcript } = geneJS
  const variantsReversed = visibleVariants.reverse().map(variant => variant.set('allele_freq', 0.01)) // HACK

  const cases = variantsReversed.filter(v => v.affected === 1)
  const controls = variantsReversed.filter(v => v.affected === 0)

  const consequenceTranslations = {
    all: 'All variants',
    missenseOrLoF: 'Missense/LoF',
    lof: 'LoF',
  }

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
          markerConfig={{ disableScale: true, ...markerExacClassic }}
          variants={cases}
          title={`Cases|${consequenceTranslations[variantFilter]}|variants|(${cases.size})`}
        />
        <VariantTrack
          key={'controls'}
          height={60}
          markerConfig={{ disableScale: true, ...markerExacClassic }}
          variants={controls}
          title={`Controls|${consequenceTranslations[variantFilter]}|variants|(${controls.size})`}
        />
        <NavigatorTrackConnected title={'Viewing in table'} disableScale />
      </RegionViewer>
    </div>
  )
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
  }),
  dispatch => ({
    toggleTranscriptFanOut: () => dispatch(geneActions.toggleTranscriptFanOut()),
  })
)(SchizophreniaGeneViewer)
