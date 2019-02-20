import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { createGeneReducer } from '@broad/redux-genes'
import { GeneViewer } from '@broad/region-viewer'
import { TranscriptTrackConnected } from '@broad/track-transcript'

const Wrapper = styled.div`
  padding-top: 50px;
  padding-left: 50px;
`

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      startingGene: 'DMD',
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

class TranscriptViewer extends PureComponent {
  static propTypes = {
    width: PropTypes.number,
    trackHeight: PropTypes.number,
    showGtex: PropTypes.bool,
  }

  static defaultProps = {
    width: 700,
    trackHeight: 10,
    showGtex: false,
  }

  render() {
    const { width, trackHeight, showGtex } = this.props
    return (
      <Provider store={store}>
        <Wrapper>
          <GeneViewer width={width}>
            <TranscriptTrackConnected height={trackHeight} showRightPanel={showGtex} />
          </GeneViewer>
        </Wrapper>
      </Provider>
    )
  }
}

export default TranscriptViewer
