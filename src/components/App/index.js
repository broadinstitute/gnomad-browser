import React from 'react'
import { Route } from 'react-router-dom'

import ConnectedComponent from '../Connected'
import TopBar from '../TopBar'
import GenePage from '../GenePage'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div>
      <TopBar />
      <div className={css.mainPanel}>
        <Route exact path="/" component={GenePage} />
        <Route path="/gene/:gene" component={GenePage} />
        <Route path="/variant/:variant" component={GenePage} />
        <Route path="/rsid/:rsid" component={GenePage} />
        <Route path="/gene-name/:geneName" component={GenePage} />
        <Route path="/connected" component={ConnectedComponent} />
      </div>
    </div>
  </div>
)

export default App
