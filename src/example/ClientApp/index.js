import React from 'react'
import { Route } from 'react-router-dom'

import TopBar from './AppTopBar'
import AppGenePage from './AppGenePage'

import css from './styles.css'

const App = () => (
  <div className={css.app}>
    <div>
      <TopBar />
      <div className={css.mainPanel}>
        <Route exact path="/" component={AppGenePage} />
        <Route path="/gene/:gene" component={AppGenePage} />
        <Route path="/variant/:variant" component={AppGenePage} />
        <Route path="/rsid/:rsid" component={AppGenePage} />
        <Route path="/gene-name/:geneName" component={AppGenePage} />
      </div>
    </div>
  </div>
)

export default App
