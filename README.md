# gnomAD browser

JavaScript tools for exploring genomic data.

To view the gnomAD browser, go to https://gnomad.broadinstitute.org.

## License

Licensed under the MIT license. See the [LICENSE](https://github.com/broadinstitute/gnomad-browser/blob/master/LICENSE) file.

## Citation

For publications on software projects using code from the gnomAD browser, we request citing the following two papers:

- [The mutational constraint spectrum quantified from variation in 141,456 humans](https://broad.io/gnomad_lof)
- [The ExAC browser: displaying reference data information from over 60 000 exomes](https://academic.oup.com/nar/article/45/D1/D840/2572071)

For information on citing the gnomAD dataset, see the [gnomAD Terms and Data Information](https://gnomad.broadinstitute.org/terms).

## Development

### Requirements

- [Node.js](https://nodejs.org)
- [yarn](https://yarnpkg.com)

### Getting started

- Clone repository and download dependencies:

  ```shell
  git clone https://github.com/broadinstitute/gnomad-browser.git
  cd gnomad-browser
  yarn
  ```

- Start a local instance of the gnomAD browser which fetches data from https://gnomad.broadinstitute.org:

  ```shell
  cd browser
  yarn start
  ```

- Open http://localhost:8008 in a web browser.
