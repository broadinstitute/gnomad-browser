import React, { PropTypes } from 'react'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'

import LensTestExample from 'lens-test/lib/example'

import css from './styles.css'

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: '#4682b4',
  },
  appBar: {
    height: 50,
  },
})

const Demo = () => {
  return (
    <div className={css.demo}>
      <MuiThemeProvider muiTheme={getMuiTheme(muiTheme)}>
        <LensTestExample />
      </MuiThemeProvider>
    </div>
  )
}

export default Demo
