# Exome Results Browsers

Since the browsers for exome results studies share the same data format<sup>[1](#f1)</sup>,
they can also share most of their code. This project builds the base browser code
in `./src` with browser specific configuration and components in `./browsers/*`.

<a name="f1">1</a>: https://tarjindersingh.github.io/schema-content/schema.html

Building the project loads a configuration object from `./browsers/${BROWSER}/config.js`
and makes that object available to both client and server code as a global variable
`BROWSER_CONFIG`.

In `./src/client` code, components with browser specific implementations can be imported
using the `@browser-components` webpack alias.

## Getting started

For each of the scripts below, the `$BROWSER` argument must be the name of one of the
subdirectories of `./browsers`.

### Development
```
./start.sh $BROWSER
```

Runs the server with nodemon and client with webpack-dev-server, so that each is
rebuilt/reloaded on changes to source files.

### Deployment
```
./build.sh $BROWSER
```

Bundles the server and client into the `dist` folder. The resulting bundle can be
run with `node dist/server.js`.

```
./build-docker-image.sh $BROWSER
```

Bundles the server and client and builds a Docker image containing them. The image
is named `${BROWSER}-browser` tagged with the current git revision.


