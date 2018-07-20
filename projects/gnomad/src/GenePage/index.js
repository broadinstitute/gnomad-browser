import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { GenePageHoc } from '@broad/redux-genes'
import { actions as variantActions } from '@broad/redux-variants'
import { VariantTable } from '@broad/table'
import {
  GenePage,
  Summary,
  TableSection,
  ClassicExacButton,
} from '@broad/ui'

import { exportFetch } from './exportFetch'
import { fetchGnomadGenePage } from './fetch'
import GeneInfo from './GeneInfo'
import Settings from '../Settings'
import GeneViewer from './RegionViewer'
import tableConfig from '../tableConfig'


const BottomButtonSection = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 20px;
`

const ExportVariantsButton = connect(
  null,
  dispatch => ({
    onClick: () => dispatch(variantActions.exportVariantsToCsv(exportFetch)),
  })
)(ClassicExacButton)


const GenePageConnected = () => {
  return (
    <GenePage>
      <Summary>
        <GeneInfo />
      </Summary>
      <GeneViewer />
      <TableSection>
        <Settings />
        <VariantTable tableConfig={tableConfig} />
        <BottomButtonSection>
          <ExportVariantsButton>
            Export variants
          </ExportVariantsButton>
        </BottomButtonSection>
      </TableSection>
    </GenePage>
  )
}

export default GenePageHoc(GenePageConnected, fetchGnomadGenePage)
