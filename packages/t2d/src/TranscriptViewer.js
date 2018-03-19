import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { createGeneReducer, actions } from '@broad/redux-genes'
import { GeneViewer } from '@broad/region'
import { TranscriptTrackConnected } from '@broad/track-transcript'

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
`

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer(
      {
        startingGene: 'DMD',
        variantDatasets: {},
      }
    )
  }),
  applyMiddleware(thunk, logger)
)

class TranscriptViewer extends PureComponent {
  static propTypes = {
    gene: PropTypes.string,
    exonPadding: PropTypes.number,
    width: PropTypes.number,
    trackHeight: PropTypes.number,
    showGtex: PropTypes.bool,
  }

  static defaultProps = {
    gene: 'DMD',
    exonPadding: 75,
    width: 700,
    trackHeight: 10,
    showGtex: false,
  }

  componentWillMount() {
    store.dispatch(actions.setCurrentGene(this.props.gene))
    store.dispatch(actions.setExonPadding(this.props.exonPadding))
  }

  render() {
    const { gene, exonPadding, width, trackHeight, showGtex } = this.props
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
