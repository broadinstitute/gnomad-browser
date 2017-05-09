import React, { PropTypes } from 'react'

import css from './styles.css'

const GeneSettings = ({ currentGene, setCurrentGene }) => {
  const testGenes = [
    'PCSK9',
    'ZNF658',
    'MYH9',
    'FMR1',
    'BRCA2',
    'CFTR',
    'FBN1',
    'TP53',
    'SCN5A',
    'MYH7',
    'MYBPC3',
    'ARSF',
    'CD33',
    'DMD',
    'TTN',
    'USH2A',
  ]

  const handleDropdownChange = (gene) => {
    setCurrentGene(gene)
  }

  console.log(currentGene)
  return (
    <div className={css.geneSettings}>
      {testGenes.map(gene => <a href="#" onClick={() =>
         handleDropdownChange(gene)}>{gene} </a>)}
    </div>
  )
}

GeneSettings.propTypes = {
  currentGene: PropTypes.string.isRequired,
  setCurrentGene: PropTypes.func.isRequired,
}

export default GeneSettings
