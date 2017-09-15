import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import createGenePageStore from '@broad/gene-page/lib/store/store'

import App from './routes'

const genePageSettings = {
  searchIndexes: [],
  // fetchFunction,
  variantSchema: {
    id: null,
    variant_id: null,
    chr: null,
    pos: null,
    xpos: null,
    ref: null,
    alt: null,
    n_study: null,
    study: null,
    p_value: null,
    scz_af: null,
    hc_af: null,
    odds_ratio: null,
    se: null,
    qp: null,
    i_squared: null,
    mhtp: null,
    comment: null,
    '-log10p': null,
  }
}

// const genePageSettings = {
//   searchIndexes: [],
//   // fetchFunction,
//   variantSchema: {
//     chrom: null,
//     pos: null,
//     xpos: null,
//     ref: null,
//     alt: null,
//     rsid: null,
//     variantId: null,
//     transcriptConsequenceTerms: null,
//     AC: null,
//     AF: null,
//     AC_cases: null,
//     AC_ctrls: null,
//     AC_UK_cases: null,
//     AC_UK_ctrls: null,
//     AC_FIN_cases: null,
//     AC_FIN_ctrls: null,
//     AC_SWE_cases: null,
//     AC_SWE_ctrls: null,
//   }
// }

const store = createGenePageStore(genePageSettings)

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: '#4682b4',
  },
  appBar: {
    height: 50,
  },
})

const Main = () => (
  <Provider store={store}>
    <MuiThemeProvider muiTheme={getMuiTheme(muiTheme)}>
      <Router>
        <Route path="/" component={App} />
      </Router>
    </MuiThemeProvider>
  </Provider>
)

export default Main
