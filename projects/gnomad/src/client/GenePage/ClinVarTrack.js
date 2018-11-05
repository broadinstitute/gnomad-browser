import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { variantFilter } from '@broad/redux-variants'
import { StackedVariantsPlot } from '@broad/track-variant'
import { SegmentedControl } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

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

const ClinVarVariantAttributeList = styled.dl`
  margin: 0.5em 0;

  div {
    margin-bottom: 0.25em;
  }

  dt,
  dd {
    display: inline;
  }

  dt {
    font-weight: bold;
  }

  dd {
    margin: 0 0 0 0.5em;
  }
`

const ClinVarVariantAttribute = ({ label, value }) => (
  <div>
    <dt>{label}:</dt>
    <dd>{value === undefined || value === null ? '-' : value}</dd>
  </div>
)

ClinVarVariantAttribute.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
}

ClinVarVariantAttribute.defaultProps = {
  value: undefined,
}

const ClinVarTooltip = ({ variant }) => (
  <div>
    <strong>{variant.variantId}</strong>
    <ClinVarVariantAttributeList>
      <ClinVarVariantAttribute label="Clinical Signficance" value={variant.clinicalSignificance} />
      <ClinVarVariantAttribute
        label="Consequence"
        value={getLabelForConsequenceTerm(variant.majorConsequence)}
      />
      <ClinVarVariantAttribute label="Gold stars" value={variant.goldStars} />
    </ClinVarVariantAttributeList>
    Click to view in ClinVar
  </div>
)

ClinVarTooltip.propTypes = {
  variant: PropTypes.shape({
    alleleId: PropTypes.number.isRequired,
    clinicalSignificance: PropTypes.string,
    consequence: PropTypes.string,
    goldStars: PropTypes.number,
    variantId: PropTypes.string.isRequired,
  }).isRequired,
}

const onClickVariant = variant => {
  const clinVarWindow = window.open()
  // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
  clinVarWindow.opener = null
  clinVarWindow.location = `http://www.ncbi.nlm.nih.gov/clinvar/?term=${variant.alleleId}[alleleid]`
}

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
    const bins = [...Array(nBins)].map(() => ({ lof: 0, missense: 0, synonymous: 0, other: 0 }))

    const variantBinIndex = variant => {
      const variantPosition = xScale(positionOffset(variant.pos).offsetPosition)
      return Math.floor(variantPosition / binWidth)
    }

    variants.forEach(variant => {
      const category = variant.majorConsequence
        ? getCategoryFromConsequence(variant.majorConsequence)
        : 'other'

      const binIndex = variantBinIndex(variant)
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex][category] += 1
      }
    })

    const categories = ['lof', 'missense', 'synonymous', 'other']

    const maxVariantsInBin = bins.reduce((max, bin) => {
      const binTotal = bin.lof + bin.missense + bin.synonymous + bin.other
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
      other: [],
    }

    variants.forEach(variant => {
      const category = variant.majorConsequence
        ? getCategoryFromConsequence(variant.majorConsequence)
        : 'other'

      variantsByConsequence[category].push(variant)
    })

    const layers = [
      variantsByConsequence.lof,
      variantsByConsequence.missense,
      variantsByConsequence.synonymous,
      variantsByConsequence.other,
    ]

    return (
      <StackedVariantsPlot
        onClickVariant={onClickVariant}
        positionOffset={positionOffset}
        symbolColor={variantColor}
        tooltipComponent={ClinVarTooltip}
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
      other: variantFilter.other,
    }
    const matchesConsequenceFilter = variant => {
      const category = getCategoryFromConsequence(variant.majorConsequence) || 'other'
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
      alleleId: PropTypes.number.isRequired,
      clinicalSignificance: PropTypes.string,
      consequence: PropTypes.string,
      goldStars: PropTypes.number,
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
