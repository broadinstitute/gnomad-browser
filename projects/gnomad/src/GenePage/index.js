import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { GenePageHoc } from '@broad/redux-genes'
import { actions as variantActions } from '@broad/redux-variants'
import { VariantTable } from '@broad/table'
import { ClassicExacButton, GenePage, SectionHeading, TableSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Settings from '../Settings'
import tableConfig from '../tableConfig'
import { ConstraintTableOrPlaceholder } from './Constraint'
import { exportFetch } from './exportFetch'
import { fetchGnomadGenePage } from './fetch'
import GeneInfo from './GeneInfo'
import GeneViewer from './RegionViewer'

const BottomButtonSection = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 20px;
`

const ExportVariantsButton = connect(
  null,
  dispatch => ({
    onClick: () => dispatch(variantActions.exportVariantsToCsv(exportFetch)),
  })
)(ClassicExacButton)

/**
 * FIXME
 * This section previously had a 97% width left aligned div nested in a 90% width centered div.
 * This imitates the same layout with fewer elements. The horizontal alignment of various sections
 * needs to be made consistent.
 */
const GeneInfoSection = styled.div`
  width: 87%;
  padding-right: 3%;
  margin-bottom: 10px;
`

const GeneFullName = styled.span`
  font-size: 22px;
  font-weight: 400;
`

const GeneInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
  }
`

const GenePageConnected = ({ gene }) => {
  console.log(gene)
  const { gene_name: geneSymbol, full_gene_name: fullGeneName } = gene
  return (
    <GenePage>
      <GeneInfoSection>
        <GnomadPageHeading>
          {geneSymbol} <GeneFullName>{fullGeneName}</GeneFullName>
        </GnomadPageHeading>
        <GeneInfoColumnWrapper>
          <GeneInfo />
          <div>
            <SectionHeading>
              Gene Constraint <QuestionMark display="inline" topic="gene-constraint" />
            </SectionHeading>
            <ConstraintTableOrPlaceholder />
          </div>
        </GeneInfoColumnWrapper>
      </GeneInfoSection>
      <GeneViewer />
      <TableSection>
        <Settings />
        <VariantTable tableConfig={tableConfig} />
        <BottomButtonSection>
          <ExportVariantsButton>Export variants</ExportVariantsButton>
        </BottomButtonSection>
      </TableSection>
    </GenePage>
  )
}

GenePageConnected.propTypes = {
  gene: PropTypes.shape({
    gene_name: PropTypes.string.isRequired,
    full_gene_name: PropTypes.string.isRequired,
  }).isRequired,
}

export default GenePageHoc(GenePageConnected, fetchGnomadGenePage)
