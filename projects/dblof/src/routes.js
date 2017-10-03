import React from 'react'
import { Route } from 'react-router-dom'

import GenePage from './GenePage'
import TopBar from './TopBar'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div className={css.mainPanel}>
      <TopBar />
      <Route exact path="/" component={GenePage} />
      <Route path="/gene/:gene" component={GenePage} />
      <Route path="/variant/:variant" component={GenePage} />
      <Route path="/rsid/:rsid" component={GenePage} />
      <Route path="/gene-name/:geneName" component={GenePage} />
    </div>
  </div>
)

export default App
