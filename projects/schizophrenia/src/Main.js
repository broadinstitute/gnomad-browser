import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import createGenePageStore from '@broad/gene-page/src/store/store'

import injectTapEventPlugin from 'react-tap-event-plugin'

import App from './routes'

injectTapEventPlugin()

const appSettings = {
  searchIndexes: ['variant_id', 'rsid', 'consequence'],
  logger: true,
  projectDefaults: {
    startingGene: 'TRIO',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'schizophreniaExomeVariants',
  },
  variantDatasets: {
    schizophreniaExomeVariants: {
      id: null,
      chrom: null,
      pos: null,
      xpos: null,
      ref: null,
      alt: null,
      rsid: null,
      variant_id: null,
      consequence: null,
      AC: null,
      AF: null,
      AC_cases: null,
      AC_ctrls: null,
      AC_UK_cases: null,
      AC_UK_ctrls: null,
      AC_FIN_cases: null,
      AC_FIN_ctrls: null,
      AC_SWE_cases: null,
      AC_SWE_ctrls: null,
    },
    schizophreniaGwas: {
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
    },
  },
  // combinedDatasets: {
  //   schizophreniaCombinedVariants: {
  //     sources: ['schizophreniaExomeVariants', 'schizophreniaGwas'],
  //     combineKeys: {}
  //   }
  // }
}

const store = createGenePageStore(appSettings)

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
        <App />
      </Router>
    </MuiThemeProvider>
  </Provider>
)

export default Main
