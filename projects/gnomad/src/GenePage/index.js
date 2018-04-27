import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { withRouter, Route } from 'react-router-dom'

import { GenePageHoc } from '@broad/redux-genes'
import { VariantTable } from '@broad/table'

import {
  Loading,
  GenePage,
  Summary,
  TableSection,
  ClassicExacButton,
} from '@broad/ui'

import { HelpLink } from '@broad/help'

import GeneInfo from './GeneInfo'
import Settings from '../Settings'
import GeneViewer from './RegionViewer'
import VariantPage from '../VariantPage'

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

const VariantTableWithRouter = withRouter(VariantTable)

// const loading_gifs = [
//   'http://www.skirlrecords.com/sites/all/themes/valx/imgs/loading.gif',
//   'https://thumbs.gfycat.com/ClearcutGoldenKittiwake-size_restricted.gif',
//   'https://i2.wp.com/media.boingboing.net/wp-content/uploads/2015/10/tumblr_nlohpxGdBi1tlivlxo1_12801.gif?w=970',
// ]

const GenePageConnected = ({
  gene,
  isFetching,
  exportVariantsToCsv,
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
      <GeneViewer />
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
                <VariantTableWithRouter
                  tableConfig={tableConfig}
                />
              </div>

            )
          }}
        />
        <BottomButtonSection>
          <ClassicExacButton onClick={exportVariantsToCsv}>
            Export variants
          </ClassicExacButton>
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

GenePageConnected.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}
GenePageConnected.defaultProps = {
  gene: null,
}

export default withRouter(GenePageHoc(GenePageConnected, fetchGnomadGenePage, exportFetch))
