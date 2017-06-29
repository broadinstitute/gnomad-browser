import React from 'react'
import { Route } from 'react-router-dom'
import Manhattan from 'lens-manhattan'

import GenePage from './GenePage'

import css from './styles.css'

import MANHATTAN_DATA from '/Users/msolomon/lens/resources/schizophrenia-manhattan.json'

const App = () => (
  <div className={css.app}>
    <div>
      <div className={css.mainPanel}>
        <h1 className={css.title}>Schizophrenia genome-wide</h1>
        <h2 className={css.manhattan}>Top {MANHATTAN_DATA.length} hits in dataset</h2>
        <Manhattan data={MANHATTAN_DATA} width={1050} height={300}/>
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
