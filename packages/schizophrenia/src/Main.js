import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import createGenePageStore from 'lens-redux-gene-page/lib/store/store'

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
