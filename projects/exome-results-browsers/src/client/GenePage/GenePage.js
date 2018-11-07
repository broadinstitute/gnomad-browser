import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { GenePageHoc } from '@broad/redux-genes'
import { GenePage, PageHeading, TableSection } from '@broad/ui'

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

const GeneInfoSection = styled.div`
  width: 85%;
  margin-bottom: 1em;
`

const GenePageConnected = ({ gene }) => {
  const { gene_name: geneName, full_gene_name: fullGeneName } = gene
  return (
    <GenePage>
      <GeneInfoSection>
        <PageHeading>
          {geneName} <GeneFullName>{fullGeneName}</GeneFullName>
        </PageHeading>
        <GeneInfo />
      </GeneInfoSection>
      <RegionViewer />
      <TableSection>
        <GeneSettings />
        <VariantTable />
      </TableSection>
      <VariantDetails />
    </GenePage>
  )
}

GenePageConnected.propTypes = {
  gene: PropTypes.shape({
    full_gene_name: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
  }).isRequired,
}

export default GenePageHoc(GenePageConnected, fetchGeneData)
