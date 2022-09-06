import React, { ReactNode } from 'react'
import { Router } from 'react-router'
import { createBrowserHistory } from 'history'

export const withDummyRouter = (children: ReactNode): JSX.Element => (
  <Router history={createBrowserHistory()}>{children}</Router>
)
