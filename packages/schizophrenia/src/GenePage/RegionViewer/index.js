/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import R from 'ramda'

import RegionViewer from 'lens-region'
import TranscriptTrack from 'lens-track-transcript'
import VariantTrack from 'lens-track-variant'
import Navigator from 'lens-redux-gene-page/lib/containers/Navigator'
import { groupExonsByTranscript } from 'lens-utilities/lib/transcriptTools'
import { exonPadding } from 'lens-redux-gene-page/lib/resources/active'
import { geneData } from 'lens-redux-gene-page/lib/resources/genes'
import { visibleVariants } from 'lens-redux-gene-page/lib/resources/table'

import css from './styles.css'

const {
  exonColor,
  paddingColor,
  masterExonThickness,
  masterPaddingThickness,
} = css

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

const factor = 50

const GeneRegion = ({
  gene,
  visibleVariants,
  exonPadding,
}) => {
  const geneJS = gene.toJS()
  const geneExons = geneJS.exons
  const canonicalExons = geneJS.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)

  const markerConfigOther = {
    markerType: 'af',
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',
    afMax: 0.001,
  }

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`All variants: (${visibleVariants.length})`}
      height={30}
      color={'#75757'}
      markerConfig={markerConfigOther}
      variants={visibleVariants}
    />
  )

  return (
    <div className={css.geneRegion}>
      <RegionViewer
        css={css}
        width={1150}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
      >
        <TranscriptTrack
          css={css}
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
        {allTrack}
        <Navigator />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  visibleVariants: PropTypes.array.isRequired,
  exonPadding: PropTypes.number.isRequired,
}
export default connect(state => ({
  gene: geneData(state),
  exonPadding: exonPadding(state),
  visibleVariants: visibleVariants(state),
}))(GeneRegion)
