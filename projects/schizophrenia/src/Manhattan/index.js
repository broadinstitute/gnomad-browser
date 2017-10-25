import React, { PropTypes } from 'react'
import Manhattan from '@broad/manhattan'
import MANHATTAN_DATA from '@resources/schizophrenia-manhattan.json'  // eslint-disable-line
// import MANHATTAN_DATA from '@resources/gwas-eg.json'  // eslint-disable-line

const SchizophreniaManhattan = () => {
  return (
    <div>
      <h1>Schizophrenia genome-wide</h1>
      <h2>Top {MANHATTAN_DATA.length} hits</h2>
      <Manhattan data={MANHATTAN_DATA} width={1050} height={800} />
    </div>
  )
}

export default SchizophreniaManhattan
