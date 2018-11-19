import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { GenePageHoc } from '@broad/redux-genes'
import { PageHeading, TrackPage, TrackPageSection } from '@broad/ui'

import VariantDetails from '../VariantDetails/VariantDetails'
import fetchGeneData from './fetchGeneData'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import VariantTable from './VariantTable'

const GeneFullName = styled.span`
  font-size: 22px;
  font-weight: 400;
`

const GenePageConnected = ({ gene }) => {
  const { gene_name: geneName, full_gene_name: fullGeneName } = gene
  return (
    <TrackPage>
      <TrackPageSection>
        <PageHeading>
          {geneName} <GeneFullName>{fullGeneName}</GeneFullName>
        </PageHeading>
        <GeneInfo />
      </TrackPageSection>
      <RegionViewer />
      <TrackPageSection>
        <GeneSettings />
        <VariantTable />
      </TrackPageSection>
      <VariantDetails />
    </TrackPage>
  )
}

GenePageConnected.propTypes = {
  gene: PropTypes.shape({
    full_gene_name: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
  }).isRequired,
}

export default GenePageHoc(GenePageConnected, fetchGeneData)
