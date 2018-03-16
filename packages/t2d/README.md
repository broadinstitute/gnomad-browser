# Type II Diabetes Portal Components

## Introduction

This folder contains components from the `gnomadjs` project designed for use in the Type II Diabetes (T2D) portal. There is a JavaScript bundling process for packaging code, and examples of how to embed components into another page.

## Requirements

Only tested on OSX.

node https://nodejs.org/en/download/

yarn https://yarnpkg.com/en/

## Getting started

`git clone https://github.com/macarthur-lab/gnomadjs.git`

`cd gnomadjs`

`yarn`

`cd packages/t2d`

## Developing a component

As a first step, we'll show how to export a TranscriptViewer component which is similar to the one seen on the gnomAD beta website (http://gnomad-beta.broadinstitute.org). This process can be generalized for sharing the structure viewer (in development).

See the file `src/TranscriptViewer.js`. This contains a transcript viewer that wraps `@broad/redux-genes`, `@broad/region`, and `@broad/track-transcript` libraries. You can edit those components in the packages folder. Data fetching and most default settings are handled by the components themselves. The component exported from this file looks like:

```javascript
...

const TranscriptViewer = ({ gene, exonPadding, width, trackHeight, showGtex }) => {
  store.dispatch(actions.setCurrentGene(gene))
  store.dispatch(actions.setExonPadding(exonPadding))
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
TranscriptViewer.propTypes = {
  gene: PropTypes.string,
  exonPadding: PropTypes.number,
  width: PropTypes.number,
  trackHeight: PropTypes.number,
  showGtex: PropTypes.bool,
}
TranscriptViewer.defaultProps = {
  gene: 'DMD',
  exonPadding: 75,
  width: 700,
  trackHeight: 10,
  showGtex: false,
}

export default TranscriptViewer

```

The wrapped component takes a few props to set the gene, exonPadding, and component width, etc..  There are many more things you could set, but keeping it simple for now.

To run this component in a development server, type `make prototype` in the t2d root directory and navigate to `localhost:8000`. Check out `src/example/TranscriptViewerExample.js` to try passing the component props, or try creating some kind of external control mechanism to feed data to the component. You have to know a little bit of React to do that. Watch how updates to any of the component src files will trigger hot reloading in the browser.

## Outputting a bundle

To export `TranscriptViewer` in a javascript bundle, we will use the config file `webpack.config.umd.js`. You may want to read into webpack to see how this works.

You can compile the bundle by running `yarn build:umd` in the t2d directory.

## Embedding the component in another page

Now that we have the bundle, we can embed the react component in any other webpage. See the example in `public/index`. Test by typing `yarn start` in the root t2d directory, navigate to `localhost:8080`.

## Next steps

Using this build process, any number of components developed using the new gnomAD browser framework can be exported.
