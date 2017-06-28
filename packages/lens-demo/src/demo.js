import React, { PropTypes } from 'react'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'

import DemoAll from './demo-all'

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
        <DemoAll />
      </MuiThemeProvider>
    </div>
  )
}

export default Demo
