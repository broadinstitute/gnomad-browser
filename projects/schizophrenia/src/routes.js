import React from 'react'
import { Route } from 'react-router-dom'
import GwasPage from './GwasPage'
import ExomePage from './ExomePage'
import TopBar from './TopBar'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div>
      <TopBar />
      <div className={css.mainPanel}>
        <Route path="/gwas" component={GwasPage} />
        <Route path="/exomes" component={ExomePage} />
      </div>
    </div>
  </div>
)

export default App
