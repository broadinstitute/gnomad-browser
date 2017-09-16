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

import RegionViewer from '@broad/region'
import TranscriptTrack from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import Navigator from '@broad/gene-page/src/containers/Navigator'
import { groupExonsByTranscript } from '@broad/utilities/src/transcriptTools'
import { exonPadding } from '@broad/gene-page/src/resources/active'
import { geneData } from '@broad/gene-page/src/resources/genes'

import {
  visibleVariants,
  regionViewerComponentState,
} from '@broad/gene-page/src/resources/table'

import VariantDensityTrack from './VariantDensityTrack'

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

const markerConfigLoF = {
  markerType: 'af',
  circleRadius: 3,
  circleStroke: 'black',
  circleStrokeWidth: 1,
  yPositionSetting: 'random',
  fillColor: 'red',
  afMax: 0.001,
}

const lof = ['splice_acceptor_variant', 'splice_donor_variant', 'stop_gained', 'frameshift_variant']
const missense = ['missense_variant']

const consequenceCategories = [
  { annotation: 'lof', groups: lof, colour: '#757575' },
  { annotation: 'missense', groups: missense, colour: '#757575' },
]

const factor = 50

const GeneRegion = ({
  gene,
  visibleVariants,
  exonPadding,
  setRegionViewerComponentState,
}) => {
  const geneJS = gene.toJS()
  const geneExons = geneJS.exons
  const canonicalExons = geneJS.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const { exome_coverage, genome_coverage } = geneJS

  const splitTracks = consequenceCategories.map((consequence, index) => {
    let rowHeight
    const filteredVariants = visibleVariants.filter(variant =>
      R.contains(variant.consequence, consequence.groups))
    if (filteredVariants.length / factor < 20) {
      rowHeight = 20
    } else {
      rowHeight = filteredVariants.length / factor
    }
    return (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={`${consequence.annotation} (${filteredVariants.length})`}
        height={rowHeight}
        markerConfig={markerConfigLoF}
        variants={filteredVariants}
      />
    )
  })

  const markerConfigOther = {
    markerType: 'af',
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',
    afMax: 0.001,
  }

  const markerConfigDensity = {
    markerType: 'density',
    stroke: 1,
  }

  const otherVariants = visibleVariants.filter(v =>
    !R.contains(v.consequence, [...lof, ...missense]))

  let otherHeight
  if (otherVariants.length / factor < 20) {
    otherHeight = 20
  } else {
    otherHeight = otherVariants.length / factor
  }

  const coverageConfigClassic = {
    datasets: [
      {
        name: 'exome',
        data: exome_coverage,
        type: 'area',
        color: 'rgba(70, 130, 180, 1)',
        opacity: 1,
      },
      {
        name: 'genome',
        data: genome_coverage,
        type: 'line',
        color: 'rgba(115, 171, 61,  1)',
        strokeWidth: 4,
        opacity: 1,
      },
    ],
  }

  const coverageConfig = {
    datasets: [
      {
        name: 'exome',
        data: exome_coverage,
        type: 'area',
        color: 'rgba(70, 130, 180, 1)',
        opacity: 0.5,
      },
      {
        name: 'genome',
        data: genome_coverage,
        type: 'area',
        color: 'rgba(115, 171, 61,  1)',
        strokeWidth: 4,
        opacity: 0.5,
      },
    ],
  }

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
        {splitTracks}
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
