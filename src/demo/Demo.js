import React from 'react'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'

import RegionViewerDemo from '../RegionViewer/RegionViewer.example'

import css from './styles.css'

const Demo = () =>
  <div className={css.demoArea}>
    <h1>Demo area</h1>
    <RegionViewerDemo />
  </div>

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: '#4682b4',
  },
  appBar: {
    height: 50,
  },
})

const WrappedDemo = () =>
  <MuiThemeProvider muiTheme={getMuiTheme(muiTheme)}>
    <Demo />
  </MuiThemeProvider>

export default WrappedDemo
