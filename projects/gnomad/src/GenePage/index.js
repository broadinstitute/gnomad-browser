/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { withRouter, Route } from 'react-router-dom'

import FetchHoc from '@broad/gene-page/src/containers/FetchHoc'
import VariantTableConnected from '@broad/gene-page/src/containers/VariantTableConnected'

import {
  SectionTitle,
  GenePage,
  Summary,
  TableSection,
} from '@broad/gene-page/src/presentation/UserInterface'

import { HelpLink } from '@broad/help'

import GeneInfo from './GeneInfo'
import Settings from '../Settings'
import GeneRegion from './RegionViewer'
import VariantPage from '../VariantPage'

import tableConfig from '../tableConfig'
import { fetchWithExac, fetchGnomadOnly } from './fetch'

const Loading = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  margin-top: 20px;
  width: 100%;
  height: 100%;

  h1 {
    font-weight: bold;
  }
`

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
    ${'' /* font-weight: bold; */}
    &:hover  {
      color: #BE4248;
    }
  }
  font-size: 16px;
  margin-right: 10px;
`

const VariantTable = withRouter(VariantTableConnected)

// const loading_gifs = [
//   'http://www.skirlrecords.com/sites/all/themes/valx/imgs/loading.gif',
//   'https://thumbs.gfycat.com/ClearcutGoldenKittiwake-size_restricted.gif',
//   'https://i2.wp.com/media.boingboing.net/wp-content/uploads/2015/10/tumblr_nlohpxGdBi1tlivlxo1_12801.gif?w=970',
// ]

const AppGenePage = ({
  gene,
  isFetching,
}) => {
  if (isFetching || !gene) {
    return (
      <Loading>
        {/* <img src={loading_gifs[Math.floor(Math.random() * loading_gifs.length)]} alt=""/> */}
        <h1>Loading...</h1>
      </Loading>
    )
  }
  return (
    <GenePage>
      <Summary>
        <GeneInfo />
      </Summary>
      <GeneRegion />
      <TableSection>
        {/* <SectionTitle>Variant table</SectionTitle> */}
        <Settings />
        <Route path={'/gene/:gene/:variantId'} component={VariantPage} />
        {/* <Route
          exact
          path="/gene/:gene"
          component={Table}
        /> */}
        <Route
          exact
          path="/gene/:gene"
          render={() => {
            return (
              <div>
                <VariantTable
                  tableConfig={tableConfig}
                />
              </div>

            )
          }}
        />
      </TableSection>
      <Footer>
        <FooterItem>
          <HelpLink topic={'about-gnomad'}>About</HelpLink>
        </FooterItem>
        <FooterItem>
          <HelpLink topic={'terms'}>Terms</HelpLink>
        </FooterItem>
      </Footer>
    </GenePage>
  )
}

AppGenePage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}
AppGenePage.defaultProps = {
  gene: null,
}

export default withRouter(FetchHoc(AppGenePage, fetchWithExac))
