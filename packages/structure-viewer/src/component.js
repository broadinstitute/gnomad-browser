/* eslint-disable new-cap */
/* eslint-disable space-before-function-paren */
/* eslint-disable react/prop-types */

import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import pv from 'bio-pv'

const PdbWrapper = styled.div`
  height: 360px;
`

const NoPdpWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  width: 600px;
`

class VariantsStructure extends Component {
  componentDidMount() {
    this.props.searchPdb(this.props.currentGene)
  }
  componentWillReceiveProps(nextProps) {
    // debugger
    if (this.props.currentPdb !== nextProps.currentPdb) {
      // debugger
      const { currentGene } = this.props
      this.props.fetchPdbIfNeeded(currentGene, nextProps.currentPdb)
    }
  }
  componentWillUpdate () {
    // debugger
    if (!this.destroyed) {
      // debugger
      this.destroyed = true
      this.viewer.destroy()
    }
  }
  // componentShouldUpdate () {
  //   // debugger
  //   if (this.props.currentPdb === nextProps.currentPdb) {
  //     // debugger
  //     return false
  //   }
  //   return true
  // }
  getResidues = (variants) => {
    // const results = variants.toJS()
    //   .filter(v => v.consequence === 'frameshift_variant')
    //   .map(v => /\d+/.exec(v.hgvsp))
    // const numbers = results.map((n) => {
    //   if (n === null) {
    //     return 0
    //   }
    //   return Number(n[0])
    // })
    const numbers = [34]
    return numbers
  }
  attachViewer = (node) => {
    // debugger
    const options = {
      width: this.props.width,
      height: this.props.height,
      antialias: true,
      quality: 'high',
      background: this.props.backgroundColor,
    }


    return pv.Viewer(node, options)
  }
  renderMolecule = (self, res) => {
    // debugger
    const {
      pdbFiles,
      currentPdb,
    } = self.props

    const structure = pdbFiles[currentPdb]
    const { color } = pv
    self.viewer.cartoon(
      'protein',
      structure,
      { color: color.uniform('white') }
    )
    // const ligands = structure.select({ rnames: ['SAH', 'RVP'] })
    const residues = structure.select({ rnums: res })
    // viewer.ballsAndSticks('ligands', ligands)
    // viewer.ballsAndSticks('residues', residues, { color: color.byElement() })
    self.viewer.ballsAndSticks('residues', residues, { color: color.uniform('red') })
    // viewer.centerOn(residues)
    // viewer.setZoom(40)
    self.viewer.autoZoom()
    // viewer.spin(true)
    self.viewer.requestRedraw()
  }
  render() {
    const {
      variantsData,
      receivedPdb,
      retrieving,
      pdbSearchResultsList,
      currentPdb,
      setCurrentPdbOnClick,
    } = this.props
    console.log(this.props)
    let view
    if (retrieving) {
      // debugger
      view = <NoPdpWrapper><h1>Searching for pdb...</h1></NoPdpWrapper>
    }
    if (!retrieving && receivedPdb) {
      // debugger
      view = (
        <div>
          <div
            id="viewer"
            ref={(node) => {
              if (node !== null) {
                this.destroyed = false
                this.viewer = this.attachViewer(node)
                this.renderMolecule(
                  this,
                  this.getResidues(variantsData)
                )
              }
            }}
          />
        </div>
      )
    }
    if (!retrieving && !receivedPdb) {
      // debugger
      view = <NoPdpWrapper><h1>No PDB found</h1></NoPdpWrapper>
    }
    return (
      <PdbWrapper>
        {view}
        <select
          onChange={(e) => {
            setCurrentPdbOnClick(e.target.value)
          }}
        >
          {pdbSearchResultsList.map(option =>
            (<option
              value={option}
              key={option}
              selected={currentPdb === option}
            >
              {option}
            </option>)
          )}
        </select>
      </PdbWrapper>
    )
  }
}
VariantsStructure.propTypes = {
  variantsData: PropTypes.array.isRequired,
  pdbFiles: PropTypes.object.isRequired,  // eslint-disable-line
  pdbSearchResultsList: PropTypes.array.isRequired,
  receivedPdb: PropTypes.bool.isRequired,
  retrieving: PropTypes.bool.isRequired,
  currentPdb: PropTypes.string.isRequired,
  currentGene: PropTypes.string.isRequired,
  setCurrentPdbOnClick: PropTypes.func.isRequired,
  fetchPdbIfNeeded: PropTypes.func.isRequired,
}

export default VariantsStructure
