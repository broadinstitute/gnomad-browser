import React from 'react'
import { render } from 'react-dom'
import { hot } from 'react-hot-loader/root'

// scripts/example.js sets a resolver alias for this
import ExampleComponent from 'example-component' // eslint-disable-line import/no-unresolved

const Example = hot(ExampleComponent)

render(<Example />, document.getElementById('root'))
