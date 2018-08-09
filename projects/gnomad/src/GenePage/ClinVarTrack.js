import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { variantFilter } from '@broad/redux-variants'
import { StackedVariantsPlot } from '@broad/track-variant'
import { SegmentedControl } from '@broad/ui'
import { getCategoryFromConsequence } from '@broad/utilities'

function isPathogenicOrLikelyPathogenic(clinvarVariant) {
  return (
    clinvarVariant.clinicalSignificance &&
    (clinvarVariant.clinicalSignificance.includes('Pathogenic') ||
      clinvarVariant.clinicalSignificance.includes('Likely_pathogenic'))
  )
}

const CONSEQUENCE_COLORS = {
  lof: '#dd2c00',
  missense: 'orange',
  synonymous: '#2e7d32',
}

const DEFAULT_COLOR = '#424242'

function variantColor(clinvarVariant) {
  if (!clinvarVariant.majorConsequence) {
    return DEFAULT_COLOR
  }
  const category = getCategoryFromConsequence(clinvarVariant.majorConsequence)
  return CONSEQUENCE_COLORS[category] || DEFAULT_COLOR
}

const Container = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin-top: 5px;
`

const TopPanel = styled.div`
  display: flex;
  flex-shrink: 0;
  flex-direction: row;
  justify-content: flex-end;
  width: ${props => props.width}px;
  margin-right: ${props => props.rightMargin}px;
  margin-left: ${props => props.leftMargin}px;
`

const LeftPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  box-sizing: border-box;
  width: ${props => props.width}px;
  padding-right: 20px;
`

const CenterPanel = styled.div`
  display: flex;
  align-items: center;
  width: ${props => props.width}px;
  padding-top: 10px;
`

class ClinVarTrack extends Component {
  state = {
    isExpanded: false,
  }

  renderBinnedVariants(variants) {
    const { positionOffset, xScale, width } = this.props

    const height = 30
    const nBins = 100
    const binWidth = width / nBins
    const binPadding = 1
    const bins = [...Array(nBins)].map(() => ({ lof: 0, missense: 0, synonymous: 0, all: 0 }))

    const variantBinIndex = variant => {
      const variantPosition = xScale(positionOffset(variant.pos).offsetPosition)
      return Math.floor(variantPosition / binWidth)
    }

    variants.forEach(variant => {
      const category = variant.majorConsequence
        ? getCategoryFromConsequence(variant.majorConsequence)
        : 'all'

      bins[variantBinIndex(variant)][category] += 1
    })

    const categories = ['lof', 'missense', 'synonymous', 'all']

    const maxVariantsInBin = bins.reduce((max, bin) => {
      const binTotal = bin.lof + bin.missense + bin.synonymous + bin.all
      return Math.max(max, binTotal)
    }, -Infinity)

    const y = scaleLinear()
      .domain([0, maxVariantsInBin])
      .range([0, height])

    function renderBin(bin, binIndex) {
      let yOffset = 0
      return (
        <g key={binIndex} transform={`translate(${binIndex * binWidth + binPadding},0)`}>
          {categories.map(category => {
            const barHeight = y(bin[category])
            const bar = (
              <rect
                key={category}
                x={0}
                y={height - yOffset - barHeight}
                width={binWidth - binPadding * 2}
                height={barHeight}
                fill={CONSEQUENCE_COLORS[category] || DEFAULT_COLOR}
              />
            )
            yOffset += barHeight
            return bar
          })}
        </g>
      )
    }

    return (
      <svg height={height} width={width} style={{ overflow: 'visible' }}>
        <g>
          <text x={-7} y={0} dy="0.3em" textAnchor="end">
            {maxVariantsInBin}
          </text>
          <line x1={-5} y1={0} x2={0} y2={0} stroke={'black'} strokeWidth={1} />

          <text x={-7} y={height} dy="0.3em" textAnchor="end">
            0
          </text>

          <line x1={-5} y1={height} x2={0} y2={height} stroke={'black'} strokeWidth={1} />
        </g>
        <g>{bins.map(renderBin)}</g>
        <line x1={0} y1={height} x2={width} y2={height} stroke={'#424242'} />
      </svg>
    )
  }

  renderVariants(variants) {
    const { positionOffset, xScale, width } = this.props

    const variantsByConsequence = {
      lof: [],
      missense: [],
      synonymous: [],
      all: [],
    }

    variants.forEach(variant => {
      const category = variant.majorConsequence
        ? getCategoryFromConsequence(variant.majorConsequence)
        : 'all'

      variantsByConsequence[category].push(variant)
    })

    const layers = [
      variantsByConsequence.lof,
      variantsByConsequence.missense,
      variantsByConsequence.synonymous,
      variantsByConsequence.all,
    ]

    return (
      <StackedVariantsPlot
        positionOffset={positionOffset}
        symbolColor={variantColor}
        variantLayers={layers}
        width={width}
        xScale={xScale}
      />
    )
  }

  render() {
    const { leftPanelWidth, rightPanelWidth, variants, variantFilter, width } = this.props

    const isCategoryIncluded = {
      lof: variantFilter.lof,
      missense: variantFilter.missense,
      synonymous: variantFilter.synonymous,
      all: variantFilter.other,
    }
    const matchesConsequenceFilter = variant => {
      const category = getCategoryFromConsequence(variant.majorConsequence) || 'all'
      return isCategoryIncluded[category]
    }

    const filteredVariants = variants
      .filter(isPathogenicOrLikelyPathogenic)
      .filter(matchesConsequenceFilter)

    return (
      <Container>
        <TopPanel leftMargin={leftPanelWidth} rightMargin={rightPanelWidth} width={width}>
          <SegmentedControl
            id="clinvar-track-mode"
            options={[{ label: 'Bins', value: false }, { label: 'All variants', value: true }]}
            value={this.state.isExpanded}
            onChange={isExpanded => {
              this.setState({ isExpanded })
            }}
          />
        </TopPanel>
        <LeftPanel width={leftPanelWidth}>
          ClinVar pathogenic and likely pathogenic variants ({filteredVariants.length})
        </LeftPanel>
        <CenterPanel width={width}>
          {this.state.isExpanded
            ? this.renderVariants(filteredVariants)
            : this.renderBinnedVariants(filteredVariants)}
        </CenterPanel>
      </Container>
    )
  }
}

ClinVarTrack.propTypes = {
  leftPanelWidth: PropTypes.number,
  rightPanelWidth: PropTypes.number,
  positionOffset: PropTypes.func,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      clinicalSignificance: PropTypes.string,
      consequence: PropTypes.string,
      pos: PropTypes.number.isRequired,
      variantId: PropTypes.string.isRequired,
    })
  ).isRequired,
  variantFilter: PropTypes.object.isRequired,
  width: PropTypes.number,
  xScale: PropTypes.func,
}

ClinVarTrack.defaultProps = {
  leftPanelWidth: undefined,
  positionOffset: undefined,
  rightPanelWidth: undefined,
  width: undefined,
  xScale: undefined,
}

const ConnectedClinVarTrack = connect(state => ({
  variantFilter: variantFilter(state),
}))(ClinVarTrack)

export default ConnectedClinVarTrack
