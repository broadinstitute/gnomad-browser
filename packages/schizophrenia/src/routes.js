import React from 'react'
import { Route } from 'react-router-dom'
import Manhattan from 'lens-manhattan'

import GenePage from './GenePage'
import GeneSettings from './GenePage/GeneSettings'

import css from './styles.css'

import MANHATTAN_DATA from '/Users/msolomon/lens/resources/schizophrenia-manhattan.json'

const App = () => (
  <div className={css.app}>
    <div>
      <div className={css.mainPanel}>
        <GeneSettings />
        <h1>Schizophrenia exome meta-analysis</h1>
        <Manhattan data={MANHATTAN_DATA} />
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
