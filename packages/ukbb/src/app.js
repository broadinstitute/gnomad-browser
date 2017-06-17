import React from 'react'
import { Route } from 'react-router-dom'

import Phenotype from './Phenotype'
import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div>
      <div className={css.mainPanel}>
        <Route exact path="/" component={Phenotype} />
        <Route path="/phenotype/:phenotype" component={Phenotype} />
      </div>
    </div>
  </div>
)

export default App
