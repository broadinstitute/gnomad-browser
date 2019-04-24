import '@babel/polyfill'
import React from 'react'
import { render } from 'react-dom'

import App from './App'

const mount = document.getElementById('root')

render(<App />, mount)
