import React, { Component } from 'react'
import { fetchGene, test } from 'utilities'  // eslint-disable-line

import Track from '../Tracks'

import RegionViewer from './RegionViewer'
import css from './styles.css'

class TestComponentDemo extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchGene('PCSK9').then((data) => {
      this.setState({ data })
      this.setState({ hasData: true })
      this.forceUpdate()
    })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    const { start, stop } = this.state.data
    return (
      <div>
        <RegionViewer
          width={800}
          css={css}
          start={start}
          stop={Number(stop)}
        >
          <Track />
        </RegionViewer>
      </div>
    )
  }
}

export default TestComponentDemo
