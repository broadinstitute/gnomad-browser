import PropTypes from 'prop-types'
import queryString from 'query-string'
import React, { Component, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Button, Input, Modal, PrimaryButton } from '@broad/ui'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin-bottom: 1em;

  input {
    margin-top: 0.25em;
  }
`

const RegionControlsWrapper = styled(Wrapper)`
  justify-content: space-around;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }

  label,
  input {
    max-width: 130px;
  }
`

const HUMAN_CHROMOSOMES = [...Array.from(new Array(22), (x, i) => `${i + 1}`), 'X', 'Y']

class EditRegionModal extends Component {
  static propTypes = {
    initialRegion: PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    }).isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)

    const { initialRegion } = props
    this.state = {
      chrom: initialRegion.chrom,
      start: initialRegion.start,
      stop: initialRegion.stop,
    }
  }

  render() {
    const { initialRegion, onRequestClose, onSubmit } = this.props
    const { chrom: initialChrom, start: initialStart, stop: initialStop } = initialRegion

    const { chrom, start, stop } = this.state

    const size = stop - start + 1

    const isChromosomeValid = HUMAN_CHROMOSOMES.includes(chrom)
    const isPositionValid = stop >= start && start > 0
    const isValid = isPositionValid

    return (
      <Modal
        id="edit-region"
        title="Edit Region"
        footer={
          <React.Fragment>
            <Button onClick={onRequestClose}>Cancel</Button>
            <PrimaryButton
              disabled={!isValid}
              onClick={() => {
                onSubmit({ chrom, start, stop })
              }}
              style={{ marginLeft: '1em' }}
            >
              Ok
            </PrimaryButton>
          </React.Fragment>
        }
        onRequestClose={onRequestClose}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            onSubmit({ chrom, start, stop })
          }}
        >
          <RegionControlsWrapper>
            {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
            <label htmlFor="edit-region-chrom">
              Chromosome
              <Input
                id="edit-region-chrom"
                type="text"
                aria-invalid={!isChromosomeValid}
                aria-describedby={
                  isChromosomeValid ? undefined : '#edit-region-chrom-validation-error'
                }
                required
                value={chrom}
                onChange={e => {
                  this.setState({ chrom: e.target.value.toUpperCase() })
                }}
              />
            </label>
            {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
            <label htmlFor="edit-region-start">
              Start
              <Input
                id="edit-region-start"
                type="number"
                aria-invalid={!isPositionValid}
                aria-describedby={
                  isPositionValid ? undefined : '#edit-region-position-validation-error'
                }
                pattern="[0-9]*"
                required
                value={start}
                onChange={e => {
                  this.setState({ start: Number(e.target.value) })
                }}
              />
            </label>
            {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
            <label htmlFor="edit-region-stop">
              Stop
              <Input
                id="edit-region-stop"
                type="number"
                aria-invalid={!isPositionValid}
                aria-describedby={
                  isPositionValid ? undefined : '#edit-region-position-validation-error'
                }
                pattern="[0-9]*"
                required
                value={stop}
                onChange={e => {
                  this.setState({ stop: Number(e.target.value) })
                }}
              />
            </label>
          </RegionControlsWrapper>
          <p style={{ textAlign: 'center' }}>Region size: {size.toLocaleString()} bp</p>

          {!isChromosomeValid && (
            <p id="edit-region-chrom-validation-error" style={{ textAlign: 'center' }}>
              Chromosome must be one of 1-22, X, or Y.
            </p>
          )}

          {!isPositionValid && (
            <p id="edit-region-position-validation-error" style={{ textAlign: 'center' }}>
              Start position must be less than or equal to stop position.
            </p>
          )}

          <div style={{ textAlign: 'center' }}>
            <Button
              onClick={() => {
                this.setState({
                  chrom: initialChrom,
                  start: initialStart,
                  stop: initialStop,
                })
              }}
            >
              Reset to original region
            </Button>
          </div>

          {/* Having a submit input enables pressing enter to submit the form */}
          <input type="submit" disabled={!isValid} style={{ display: 'none' }} value="Submit" />
        </form>
      </Modal>
    )
  }
}

const EditRegion = ({ initialRegion, onSubmit, ...otherProps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <React.Fragment>
      {isModalOpen && (
        <EditRegionModal
          initialRegion={initialRegion}
          onRequestClose={() => {
            setIsModalOpen(false)
          }}
          onSubmit={region => {
            setIsModalOpen(false)
            onSubmit(region)
          }}
        />
      )}
      <Button
        {...otherProps}
        disabled={isModalOpen}
        onClick={() => {
          setIsModalOpen(true)
        }}
      >
        Change
      </Button>
    </React.Fragment>
  )
}

EditRegion.propTypes = {
  initialRegion: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
}

const GnomadEditRegion = withRouter(({ history, location, match, ...otherProps }) => (
  <EditRegion
    {...otherProps}
    onSubmit={region => {
      const regionId = `${region.chrom}-${region.start}-${region.stop}`
      const currentParams = queryString.parse(location.search)
      const next = {
        pathname: `/region/${regionId}`,
        search: queryString.stringify({ dataset: currentParams.dataset }),
      }
      history.push(next)
    }}
  />
))

export default GnomadEditRegion
