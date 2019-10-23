# gnomadjs

JavaScript tools for exploring genomic data

## gnomAD browser

To view the gnomAD browser, go to https://gnomad.broadinstitute.org.

## License

Licensed under the MIT license. See the [LICENSE](https://github.com/macarthur-lab/gnomadjs/blob/master/LICENSE) file.

## Citation

For publications on software projects using code from gnomadjs, we request citing the following two papers:

- [Variation across 141,456 human exomes and genomes reveals the spectrum of loss-of-function intolerance across human protein-coding genes](https://www.biorxiv.org/content/10.1101/531210v3)
- [The ExAC browser: displaying reference data information from over 60 000 exomes](https://academic.oup.com/nar/article/45/D1/D840/2572071)

For information on citing the gnomAD dataset, see the [gnomAD Terms and Data Information](https://gnomad.broadinstitute.org/terms).

## Development

### Requirements

- [Node.js](https://nodejs.org)
- [yarn](https://yarnpkg.com)

### Getting started

- Clone repository and download dependencies:

  ```shell
  git clone --recursive https://github.com/macarthur-lab/gnomadjs.git
  cd gnomadjs
  yarn
  ```

- Start a local instance of the gnomAD browser which fetches data from https://gnomad.broadinstitute.org:

  ```shell
  cd projects/gnomad
  yarn start
  ```

- Open http://localhost:8008 in a web browser.
