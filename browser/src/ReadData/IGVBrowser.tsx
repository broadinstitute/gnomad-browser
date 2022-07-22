// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module 'igv/... Remove this comment to see the full error message
import igv from 'igv/dist/igv'
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

  /* Lengthen track label to make space for variant ID on MNV page */
  .igv-track-label {
    max-width: 225px;
  }

  @media (max-width: 600px) {
    .igv-navbar {
      flex-flow: column;
      height: auto;
      padding-bottom: 5px;
    }

    .igv-nav-bar-left-container,
    .igv-nav-bar-right-container {
      flex-wrap: wrap;
      height: auto;
    }

    .igv-nav-bar-genomic-location {
      flex-flow: column;
      align-items: flex-start;
    }

    .igv-chromosome-select-widget-container {
      margin-left: 8px;
    }
  }
`

type OwnProps = {
  config: any
  onCreateBrowser?: (...args: any[]) => any
}

type Props = OwnProps & typeof IGVBrowser.defaultProps

/**
 * NOTE: This does not update the igv.js browser instance when the config prop changes.
 * If config may change, add a key to IGVBrowser to create a new component instance
 * with the updated config.
 * https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#recommendation-fully-uncontrolled-component-with-a-key
 */
class IGVBrowser extends Component<Props> {
  static defaultProps = {
    onCreateBrowser: () => {},
  }

  browser: any
  el: any
  mounted: any

  componentDidMount() {
    const { config, onCreateBrowser } = this.props

    const browserConfig = {
      ...config,
      promisified: true,
    }

    igv
      .createBrowser(this.el, browserConfig)
      .then((browser: any) => {
        if (this.mounted === false) {
          igv.removeBrowser(browser)
          return
        }

        this.browser = browser

        const resetButton = document.createElement('i')
        resetButton.className = 'igv-app-icon'
        resetButton.innerText = '⟲'
        resetButton.title = 'Reset'
        resetButton.style.cssText = `
        position: relative;
        top: -1px;
        font-style: normal;
        font-size: 14px;
        font-weight: bold;
        margin: 0 10px;
      `
        resetButton.addEventListener('click', () => {
          browser.search(config.locus)
        })

        this.el.querySelector('.igv-search-container').appendChild(resetButton)

        onCreateBrowser(browser)
      })
      .catch((reason: any) => console.error(`failed to create IGV browser: "${reason}"`)) // eslint-disable-line no-console
  }

  componentWillUnmount() {
    if (this.browser) {
      igv.removeBrowser(this.browser)
    }
    this.mounted = false
  }

  elementRef = (el: any) => {
    this.el = el
  }

  render() {
    return <IGVWrapper ref={this.elementRef} />
  }
}

export default IGVBrowser
