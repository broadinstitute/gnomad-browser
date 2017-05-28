import React, { PropTypes } from 'react'

import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
import Checkbox from 'material-ui/Checkbox'

import css from './styles.css'

const GeneSettings = ({
  currentGene,
  exonPadding,
  setCurrentGene,
  setExonPadding,
}) => {
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

  const setPadding = (event, newValue) => {
    const padding = Math.floor(1000 * newValue)
    setExonPadding(padding)
  }

  return (
    <div className={css.geneSettings}>
      {testGenes.map(gene =>
        <a href="#" key={`${gene}-link`} onClick={() =>
         handleDropdownChange(gene)}>{gene} </a>)
       }
      <div className={css.menus}>
      {/*
        <p>markerType</p>
        <DropDownMenu value={this.state.markerType} onChange={() => {}}>
          {['circle', 'tick', 'af'].map(markerType =>
            <MenuItem key={`${markerType}-menu`} value={markerType} primaryText={markerType} />,
         )}
        </DropDownMenu>
        <Checkbox
          label="Split consequences"
          onCheck={() => {}}
          style={{ display: 'flex', width: 200, height: 25 }}
        />
        <p>AF domain max</p>
        <DropDownMenu value={0} onChange={() => {}}>
          {[1, 0.1, 0.01, 0.001, 0.0001, 0.00005, 0.00001].map(afmax =>
            <MenuItem key={`${afmax}-menu`} value={afmax} primaryText={afmax} />,
         )}
        </DropDownMenu>
        <p>Track height</p>
        <Slider
          style={{
            width: 100,
          }}
          onChange={() => {}}
        />*/}
        <p>Exon padding {exonPadding}</p>
        <Slider
          style={{
            width: 100,
          }}
          onChange={setPadding}
        />
      </div>
    </div>
  )
}

GeneSettings.propTypes = {
  currentGene: PropTypes.string.isRequired,
  setCurrentGene: PropTypes.func.isRequired,
}

export default GeneSettings
