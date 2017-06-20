import React from 'react'
import InlineCss from 'react-inline-css'
import { TrafficBar } from 'lens-plot-traffic'
import { generateComponentAsPDF } from '../index'

const TestComponent = ({ message }) => {
  return (
    <h1>This is a test! {message}</h1>
  )
}

const options = {
  component: TrafficBar,
  props: { message: 'hello' },
  fileName: 'test.pdf',
}

generateComponentAsPDF(options)
