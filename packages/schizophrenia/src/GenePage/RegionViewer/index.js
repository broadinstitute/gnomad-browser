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
import { searchFilteredVariants as visibleVariants } from 'lens-redux-gene-page/lib/resources/table'

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

  // const variantsArray = visibleVariants.map(v => {
  //   return v.set('-log10p', -Math.log10(v.get('p_value')))
  // }).toArray()
  const variantsArray = visibleVariants.map(v => {
    return v.set('-log10p', -Math.log10(v.get('p_value')))
  }).toJS()

  const markerConfig = {
    markerType: 'circle',
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'attribute',
    yPositionAttribute: '-log10p',
    fillColor: '#757575',
  }

  const markerConfigP = { ...markerConfig, yPositionAttribute: '-log10p' }
  const markerConfigOdds = { ...markerConfig, yPositionAttribute: 'odds_ratio' }
  const markerConfigSczAF = { ...markerConfig, yPositionAttribute: 'scz_af' }
  const markerConfigHCAF = { ...markerConfig, yPositionAttribute: 'hc_af' }

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
        <VariantTrack
          key={'-log10p'}
          title={''}
          height={200}
          color={'#75757'}
          markerConfig={markerConfigP}
          variants={variantsArray}
        />
        {/*<VariantTrack
          key={'odds_ratio'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigOdds}
          variants={variantsArray}
        />
        <VariantTrack
          key={'scz_af'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigSczAF}
          variants={variantsArray}
        />
        <VariantTrack
          key={'hc_af'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigHCAF}
          variants={variantsArray}
        />*/}
        <Navigator />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  visibleVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
}
export default connect(state => ({
  gene: geneData(state),
  exonPadding: exonPadding(state),
  visibleVariants: visibleVariants(state),
}))(GeneRegion)
