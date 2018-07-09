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

import { HelpLink } from '@broad/help'

import GeneInfo from './GeneInfo'
import Settings from '../Settings'
import GeneViewer from './RegionViewer'

import tableConfig from '../tableConfig'
import { fetchGnomadGenePage } from './fetch'
import { exportFetch } from './exportFetch'

const Footer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
`

const FooterItem = styled.div`
  & > a {
    text-decoration: none;
    color: #428bca;
    &:hover  {
      color: #BE4248;
    }
  }
  font-size: 16px;
  margin-right: 10px;
`

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
      {/* <Footer>
        <FooterItem>
          <HelpLink topic={'about-gnomad'}>About</HelpLink>
        </FooterItem>
        <FooterItem>
          <HelpLink topic={'terms'}>Terms</HelpLink>
        </FooterItem>
      </Footer> */}
    </GenePage>
  )
}

export default GenePageHoc(GenePageConnected, fetchGnomadGenePage)
