# gnomadjs

JavaScript tools for exploring genomic data

## Requirements

* [Node.js](https://nodejs.org)
* [yarn](https://yarnpkg.com)

## Getting started

Clone repository and download dependencies:

```shell
git clone --recursive https://github.com/macarthur-lab/gnomadjs.git
cd gnomadjs
yarn
```

To start a local instance of the gnomAD browser UI which fetches data
from gnomad.broadinstitute.org:

```shell
cd gnomadjs/projects/gnomad
yarn start
```

Open http://localhost:8008 in a web browser.
