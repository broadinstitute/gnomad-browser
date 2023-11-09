import React, { ReactNode } from 'react'
import { Router } from 'react-router'
import { createBrowserHistory } from 'history'

export const withDummyRouter = (children: ReactNode, history: any = null): JSX.Element => (
  <Router history={history || createBrowserHistory()}>{children}</Router>
)
