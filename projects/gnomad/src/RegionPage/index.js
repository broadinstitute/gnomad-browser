import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { VariantTable } from '@broad/table'
import { TrackPage, TrackPageSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Settings from '../Settings'
import StatusMessage from '../StatusMessage'
import tableConfig from '../tableConfig'
import { fetchRegion } from './fetch'
import fetchVariantsByRegion from './fetchVariantsByRegion'
import RegionDataContainer from './RegionDataContainer'
import RegionInfo from './RegionInfo'
import RegionViewer from './RegionViewer'

const tooManyVariantsError = /Individual variants can only be returned for regions with fewer than \d+ variants/

class RegionPage extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    regionId: PropTypes.string.isRequired,
  }

  renderRegion = ({ isLoadingVariants, variantErrors }) => {
    const tooManyVariants =
      variantErrors && variantErrors.some(err => tooManyVariantsError.test(err.message))
    return (
      <TrackPage>
        <TrackPageSection>
          <GnomadPageHeading selectedDataset={this.props.datasetId}>
            {this.props.regionId}
          </GnomadPageHeading>
          <div>
            <RegionInfo showVariants={!tooManyVariants} />
          </div>
        </TrackPageSection>
        <RegionViewer coverageStyle={'new'} showVariants={!isLoadingVariants && !tooManyVariants} />
        {this.renderVariants({ isLoadingVariants, tooManyVariants })}
      </TrackPage>
    )
  }

  /* eslint-disable class-methods-use-this */
  renderVariants({ isLoadingVariants, tooManyVariants }) {
    if (isLoadingVariants) {
      return (
        <TrackPageSection>
          <StatusMessage>Loading variants...</StatusMessage>
        </TrackPageSection>
      )
    }

    if (tooManyVariants) {
      return (
        <TrackPageSection>
          <StatusMessage>
            This region has too many variants to display.
            <br />
            To view individual variants, select a smaller region.
          </StatusMessage>
        </TrackPageSection>
      )
    }

    return (
      <TrackPageSection>
        <Settings />
        <VariantTable tableConfig={tableConfig} />
      </TrackPageSection>
    )
  }

  render() {
    return (
      <RegionDataContainer
        datasetId={this.props.datasetId}
        fetchRegion={fetchRegion}
        fetchVariants={fetchVariantsByRegion}
        regionId={this.props.regionId}
      >
        {this.renderRegion}
      </RegionDataContainer>
    )
  }
}

export default RegionPage
