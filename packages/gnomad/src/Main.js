import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import createGenePageStore from 'lens-redux-gene-page/lib/store/store'

import App from './routes'

const genePageSettings = {
  searchIndexes: ['variant_id', 'rsid', 'hgvsp', 'hgvsc', 'consequence'],
  variantSchema: {
    id: null,
    variant_id: null,
    pos: null,
    xpos: null,
    hgvsp: null,
    hgvsc: null,
    filters: null,
    rsid: null,
    consequence: null,
    allele_count: null,
    allele_num: null,
    allele_freq: null,
    hom_count: null,
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
