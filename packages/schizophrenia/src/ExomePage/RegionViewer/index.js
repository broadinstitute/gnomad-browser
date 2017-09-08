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
import { scaleLinear } from 'd3-scale'
import { max } from 'd3-array'

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

  // function getColor (variant) {
  //
  //   const color = scaleLinear()
  //     .domain([])
  // }

  // const modifiedVariants = visibleVariants.map(v => v.set('color', getColor(v)))
  const modifiedVariants = visibleVariants
  const markerConfigOther = {
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',

  }

  const lof = ['splice_acceptor_variant', 'splice_donor_variant', 'stop_gained', 'frameshift_variant']
  const missense = ['missense_variant']

  const consequenceCategories = [
    { annotation: 'lof', groups: lof, colour: '#757575' },
    { annotation: 'missense', groups: missense, colour: '#757575' },
  ]

  const factor = 50

  const splitTracks = consequenceCategories.map((consequence, index) => {
    let rowHeight
    const filteredVariants = modifiedVariants.filter(variant =>
      R.contains(variant.transcriptConsequenceTerms, consequence.groups))
    if (filteredVariants.size / factor < 20) {
      rowHeight = 30
    } else {
      rowHeight = filteredVariants.size / factor
    }
    return (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={`${consequence.annotation} (${filteredVariants.size})`}
        height={rowHeight}
        markerConfig={markerConfigOther}
        variants={filteredVariants}
      />
    )
  })

  const otherVariants = modifiedVariants.filter(v =>
    !R.contains(v.consequence, [...lof, ...missense]))

  let otherHeight
  if (otherVariants.size / factor < 20) {
    otherHeight = 30
  } else {
    otherHeight = otherVariants.size / factor
  }

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`other (${otherVariants.size})`}
      height={otherHeight}
      color={'#75757'}
      markerConfig={markerConfigOther}
      variants={otherVariants}
    />
  )

  return (
    <div className={css.geneRegion}>
      <RegionViewer
        css={css}
        width={1000}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
        leftPanelWidth={100}
      >
        <TranscriptTrack
          css={css}
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
        {splitTracks}
        {allTrack}
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
        <Navigator noVariants />
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
