import igv from 'igv'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const IGVWrapper = styled.div`
  /* Coverage axes in left gutter are hardcoded to a white background.
     Set the background of the entire IGV container so that they're not out of place. */
  .igv-root-div {
    padding-top: 0;
    background: #fff;
  }

  /* Hide ideogram */
  #igv-content-header {
    display: none;
  }

  .igv-viewport-div {
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #ccc;
  }
`

/**
 * NOTE: This does not update the igv.js browser instance when the config prop changes.
 * If config may change, add a key to IGVBrowser to create a new component instance
 * with the updated config.
 * https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#recommendation-fully-uncontrolled-component-with-a-key
 */
export class IGVBrowser extends Component {
  componentDidMount() {
    const browserConfig = {
      ...this.props.config,
      promisified: true,
    }

    igv.createBrowser(this.el, browserConfig).then(browser => {
      if (this.mounted === false) {
        igv.removeBrowser(browser)
        return
      }

      this.browser = browser

      const resetButton = document.createElement('i')
      resetButton.className = 'igv-app-icon fa fa-mail-reply'
      resetButton.style.margin = '0 10px'
      resetButton.addEventListener('click', () => {
        browser.search(this.props.config.locus)
      })

      this.el.querySelector('#igv-search-container').appendChild(resetButton)

      this.props.onCreateBrowser(browser)
    })
  }

  componentWillUnmount() {
    if (this.browser) {
      igv.removeBrowser(this.browser)
    }
    this.mounted = false
  }

  elementRef = el => {
    this.el = el
  }

  render() {
    return <IGVWrapper innerRef={this.elementRef} />
  }
}

IGVBrowser.propTypes = {
  config: PropTypes.object.isRequired,
  onCreateBrowser: PropTypes.func,
}

IGVBrowser.defaultProps = {
  onCreateBrowser: () => {},
}
