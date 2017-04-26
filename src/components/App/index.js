import React from 'react'
import { Route } from 'react-router-dom'

import ConnectedComponent from '../Connected'
import Component from '../Component'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <h1>Welcome to the app</h1>
    <div>
      <Route path="/browser" component={Component} />
      <Route path="browser/gene/:gene" component={Component} />
      <Route path="browser/variant/:variant" component={Component} />
      <Route path="browser/rsid/:rsid" component={Component} />
      <Route path="browser/gene-name/:geneName" component={Component} />
      <Route path="/connected" component={ConnectedComponent} />
    </div>
  </div>
)

export default App
