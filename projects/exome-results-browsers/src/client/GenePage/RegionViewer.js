import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { geneData, exonPadding } from '@broad/redux-genes'
import { finalFilteredVariants, variantFilter } from '@broad/redux-variants'
import { RegionViewer } from '@broad/region-viewer'
import { actions as tableActions } from '@broad/table'
import { NavigatorTrackConnected } from '@broad/track-navigator'
import { TranscriptTrackConnected } from '@broad/track-transcript'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { screenSize, Loading } from '@broad/ui'

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

class GeneViewer extends PureComponent {
  render() {
    const { gene, visibleVariants, exonPadding, screenSize } = this.props

    const smallScreen = screenSize.width < 900
    const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

    const geneJS = gene.toJS()
    const canonicalExons = geneJS.transcript.exons
    const variantsReversed = visibleVariants.reverse()

    console.log(variantsReversed)
    if (variantsReversed.isEmpty()) {
      return <Loading />
    }

    const cases = variantsReversed
      .filter(v => v.ac_case > 0)
      .map(v => v.set('allele_freq', v.af_case))

    const controls = variantsReversed
      .filter(v => v.ac_ctrl > 0)
      .map(v => v.set('allele_freq', v.af_ctrl))

    return (
      <div>
        <RegionViewer
          width={regionViewerWidth}
          padding={exonPadding}
          regions={canonicalExons}
          regionAttributes={attributeConfig}
          leftPanelWidth={100}
        >
          <TranscriptTrackConnected height={12} showRightPanel={!smallScreen} />
          <VariantAlleleFrequencyTrack title={`Cases\n(${cases.size})`} variants={cases.toJS()} />
          <VariantAlleleFrequencyTrack
            title={`Controls\n(${controls.size})`}
            variants={controls.toJS()}
          />
          <NavigatorTrackConnected title={'Viewing in table'} />
        </RegionViewer>
      </div>
    )
  }
}

GeneViewer.propTypes = {
  exonPadding: PropTypes.number.isRequired,
  gene: PropTypes.object.isRequired,
  screenSize: PropTypes.object.isRequired,
  visibleVariants: PropTypes.any.isRequired,
}

export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    visibleVariants: finalFilteredVariants(state),
    screenSize: screenSize(state),
    variantFilter: variantFilter(state),
  }),
  dispatch => ({
    setCurrentTableScrollData: data => dispatch(tableActions.setCurrentTableScrollData(data)),
  })
)(GeneViewer)
