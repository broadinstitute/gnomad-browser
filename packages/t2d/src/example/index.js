/**
 * The development server will run whatever is default exported in this file
 * when you start `make prototype`
 */

import React, { PureComponent } from 'react'
import styled from 'styled-components'

import {
  MaterialButtonRaised,
  Search,
} from '@broad/ui'

import TranscriptViewerExample from './TranscriptViewerExample'
import StructureViewerExample from './StructureViewerExample'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const Title = styled.h1`
  font-size: 30px;
  margin-bottom: 10px;
`

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  margin-bottom: 20px;
`

const Button = MaterialButtonRaised.extend`
  margin-right: 20px;
`

const ControlPanel = styled.div`

`

class T2dComponentsShowcase extends PureComponent {
  static propTypes = {}

  state = {
    selectedComponent: 'transcriptViewer',
    currentGene: 'SLC30A8',
  }

  setComponent = component => () => this.setState({ selectedComponent: component })

  setCurrentGene = (geneName) => {
    if (geneName === '') { // HACK
      this.setState({ currentGene: 'p' })
    } else {
      this.setState({ currentGene: geneName })
    }
  }

  components = {
    transcriptViewer: TranscriptViewerExample,
    structureViewer: StructureViewerExample,
  }

  render() {
    const SelectedComponent = this.components[this.state.selectedComponent]
    return (
      <Wrapper>
        <Title>Components for T2D portal</Title>
        <ButtonGroup>
          <Button
            onClick={this.setComponent('transcriptViewer')}
          >
            Transcript viewer
          </Button>
          <Button
            onClick={this.setComponent('structureViewer')}
          >
            Structure viewer
          </Button>
        </ButtonGroup>
        <ControlPanel>
          <Search
            listName={'search table'}
            options={['Gene name']}
            placeholder={'Search gene'}
            onChange={this.setCurrentGene}
          />
        </ControlPanel>
        <SelectedComponent
          currentGene={this.state.currentGene}
        />
      </Wrapper>
    )
  }
}

export default T2dComponentsShowcase
