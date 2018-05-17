import PropTypes from 'prop-types'
import React from 'react'

import { generateComponentAsPDF } from '../index'

const TestComponent = ({ message }) => {
  return (
    <h1>This is a test! {message}</h1>
  )
}

TestComponent.propTypes = {
  message: PropTypes.string.isRequired,
}

const options = {
  component: TestComponent,
  props: { message: 'hello' },
  fileName: 'test.pdf',
}

generateComponentAsPDF(options)
