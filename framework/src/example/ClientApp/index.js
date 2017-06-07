import React from 'react'
import { Route } from 'react-router-dom'

import GenePage from './GenePage'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div>
      <div className={css.mainPanel}>
        <Route exact path="/" component={GenePage} />
        <Route path="/gene/:gene" component={GenePage} />
        <Route path="/variant/:variant" component={GenePage} />
        <Route path="/rsid/:rsid" component={GenePage} />
        <Route path="/gene-name/:geneName" component={GenePage} />
      </div>
    </div>
  </div>
)

export default App
