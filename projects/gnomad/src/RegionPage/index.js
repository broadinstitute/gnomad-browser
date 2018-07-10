import React from 'react'
import styled from 'styled-components'

import { RegionHoc } from '@broad/region'
import { VariantTable } from '@broad/table'

import Settings from '../Settings'
import tableConfig from '../tableConfig'

import { fetchRegion } from './fetch'
import RegionInfo from './RegionInfo'
import RegionViewer from './RegionViewer'


const RegionPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: #FAFAFA;
  color: black;
  margin-top: 40px;
  width: 95%;
  flex-shrink: 0;
  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    margin-top: 80px;
}
`

const Summary = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 95%;
  padding-left: 60px;
  margin-bottom: 10px;

  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    justify-content: center;
  }
`

const TableSection = styled.div`
  margin-left: 70px;
  margin-bottom: 100px;
  @media (max-width: 900px) {
    margin-left: 5px;
    align-items: center;
    margin-top: 10px;
  }
`


const RegionPage = () => {
  return (
    <RegionPageWrapper>
      <Summary>
        <RegionInfo />
      </Summary>
      <RegionViewer coverageStyle={'new'} />
      <Settings />
      <TableSection>
        <VariantTable tableConfig={tableConfig} />
      </TableSection>
    </RegionPageWrapper>
  )
}

export default RegionHoc(RegionPage, fetchRegion, 'gnomadCombinedVariants')
