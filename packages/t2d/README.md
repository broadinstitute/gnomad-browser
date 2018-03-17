# Type II Diabetes Portal Components

## Introduction

This folder contains components from the `gnomadjs` project designed for use in the Type II Diabetes (T2D) portal. Here we describe an example component, the development environment, a JavaScript bundling workflow for packaging code, and an example of how to embed the component into another page.

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

As a first step, we'll work with a TranscriptViewer component which is similar to the one seen on the gnomAD beta website (http://gnomad-beta.broadinstitute.org). This process can be generalized for sharing any number of components such as the structure viewer (in development).

See the file `src/TranscriptViewer.js`. This contains a transcript viewer that wraps `@broad/redux-genes`, `@broad/region`, and `@broad/track-transcript` libraries. You can edit those components in the packages folder if you wish, however data fetching and most default settings are handled by the components themselves. The wrapper component exported from this file looks like:

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

To run this component in a development server, type `make prototype` in the t2d root directory and navigate to `localhost:8000`.

You should see this:

![image](https://storage.googleapis.com/gnomad-browser/jars/transcripts.png)

Check out `src/example/TranscriptViewerExample.js` to try changing which props (such as the gene name) are passed to the component, or try creating some kind of external control mechanism to feed data to the component. You have to know a little bit of React to do that. Watch how updates to any of the component src files will trigger hot reloading in the browser.

## Outputting a bundle

To export `TranscriptViewer` in a javascript bundle, we will use the config file `webpack.config.umd.js`. You may want to read into webpack to see how this works.

You can compile the bundle by running `yarn build:umd` in the t2d directory.

```javascript
const path = require('path')
const webpack = require('webpack')

const config = require('../../webpack.config')

const umdConfig = {
  // devtool: 'source-map',

  /**
   * This will output a javascript bundle gnomadt2d.js in ./public/static/js
   */

  entry: {
    gnomadt2d: './src/index.umd.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/static/js'),
    filename: '[name].js',
    libraryTarget: 'umd',

  /**
   * When the bundle is included in another project through a script tag,
   * the components will be available in the GnomadT2d namespace
   */

    library: 'GnomadT2d',
  },

  /**
   * You'll also need to include react and react-dom along with gnomadt2d.js
   */

  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  plugins: config.plugins,
}

umdConfig.plugins.concat([
  new webpack.optimize.UglifyJsPlugin({
    beautify: false,
    comments: false,
    mangle: false,
  }),
])

umdConfig.module = config.module

module.exports = umdConfig
```

## Embedding the component in another page

Now that we have the bundle, we can embed the react component in any other webpage, such as the T2D portal. See the example in `public/index`. Test by typing `yarn start` in the root t2d directory, navigate to `localhost:8080`.

```html
<!doctype html>
<html>
  <head>
    <title>dev server</title>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" name="viewport" />
    <link type="image/x-icon" rel="shortcut icon" />

      <link href="https://fonts.googleapis.com/css?family=Roboto:400,700" rel="stylesheet">
    <style>
      body {
        font-family: 'Roboto', sans-serif;
      }
    </style>

    <!-- Load external react libraries from a CDN -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/react/15.5.4/react.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/react/15.5.4/react-dom.js"></script>

    <!-- Load our JS bundle, which becomes available under GnomadT2d namespace -->
    <script type="text/javascript" src="/static/js/gnomadt2d.js"></script>
  </head>
  <body>

    <!-- The rest of the portal would be here -->

    <!-- This is the DOM element we'll attach our TranscriptViewer to -->
    <div id="root"></div>

    <script type="text/javascript">

    /**
     * Pass the TranscriptViewer component as the first arg
     * Pass the props as the second arg, this could be data from
     * other parts of your app, such as the current gene user is viewing
     * or settings for the component, like whether or not to show gtex values,
     * which could be hooked up to an external button of some kind
     * the width prop could be set by the parent component width, or page width, e.g.
     */

    var props = {
      gene: "TTN",
      exonPadding: 100,
      width: 1000,
      trackHeight: 10,
      showGtex: false,
    }

    var transcriptViewer = React.createElement(GnomadT2d.TranscriptViewer, props)

    /**
     * Render the component
     */
    var root = document.getElementById('root')
    ReactDOM.render(transcriptViewer, root)
  </script>
  </body>
</html>

```

## Next steps

Using this build process, any number of components developed using the new gnomAD browser framework can be exported and shared with the T2D portal.
