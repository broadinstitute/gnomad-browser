import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const Table = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  td,
  th {
    padding: 0.5em 20px 0.5em 0;
    text-align: left;
  }

  thead {
    th {
      border-bottom: 1px solid #000;
      background-position: center right;
      background-repeat: no-repeat;

      &[aria-sort='ascending'] {
        background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjI8Bya2wnINUMopZAQA7');
      }

      &[aria-sort='descending'] {
        background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
      }

      span[role='button'] {
        cursor: pointer;
        display: inline-block;
        user-select: none;
        width: 100%;
      }
    }
  }

  tbody {
    td,
    th {
      border-bottom: 1px solid #ccc;
      font-weight: normal;
    }
  }

  tfoot {
    td,
    th {
      border-top: 1px solid #ccc;
      font-weight: bold;
    }
  }
`

export class PopulationsTable extends Component {
  static propTypes = {
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number.isRequired,
        ac_hom: PropTypes.number.isRequired,
      })
    ).isRequired,
    showHemizygotes: PropTypes.bool,
    showHomozygotes: PropTypes.bool,
  }

  static defaultProps = {
    showHemizygotes: true,
    showHomozygotes: true,
  }

  state = {
    sortBy: 'name',
    sortAscending: true,
  }

  setSortBy(sortBy) {
    this.setState(state => ({
      sortBy,
      sortAscending: sortBy === state.sortBy ? !state.sortAscending : state.sortAscending,
    }))
  }

  renderColumnHeader(key, label) {
    let ariaSortAttr = 'none'
    if (this.state.sortBy === key) {
      ariaSortAttr = this.state.sortAscending ? 'ascending' : 'descending'
    }

    return (
      <th aria-sort={ariaSortAttr} role="columnheader">
        <span role="button" tabIndex="0" onClick={() => this.setSortBy(key)}>
          {label}
        </span>
      </th>
    )
  }

  render() {
    const populations = this.props.populations
      .map(pop => ({
        ...pop,
        af: pop.an !== 0 ? pop.ac / pop.an : 0,
      }))
      .sort((a, b) => {
        const [pop1, pop2] = this.state.sortAscending ? [a, b] : [b, a]

        return this.state.sortBy === 'name'
          ? pop1.name.localeCompare(pop2.name)
          : pop1[this.state.sortBy] - pop2[this.state.sortBy]
      })

    const totalAlleleCount = populations.map(pop => pop.ac).reduce((acc, n) => acc + n)
    const totalAlleleNumber = populations.map(pop => pop.an).reduce((acc, n) => acc + n)
    const totalAlleleFrequency = totalAlleleCount / totalAlleleNumber

    const totalHemizygotes = populations.map(pop => pop.ac_hemi).reduce((acc, n) => acc + n)
    const totalHomozygotes = populations.map(pop => pop.ac_hom).reduce((acc, n) => acc + n)

    const { showHemizygotes, showHomozygotes } = this.props

    return (
      <Table role="grid">
        <thead>
          <tr role="row">
            {this.renderColumnHeader('name', 'Population')}
            {this.renderColumnHeader('ac', 'Allele Count')}
            {this.renderColumnHeader('an', 'Allele Number')}
            {showHomozygotes && this.renderColumnHeader('ac_hom', 'Number of Homozygotes')}
            {showHemizygotes && this.renderColumnHeader('ac_hemi', 'Number of Hemigzygotes')}
            {this.renderColumnHeader('af', 'Allele Frequency')}
          </tr>
        </thead>
        <tbody>
          {populations.map(pop => (
            <tr key={pop.name} role="row">
              <th role="rowheader">{pop.name}</th>
              <td role="gridcell">{pop.ac}</td>
              <td role="gridcell">{pop.an}</td>
              {showHomozygotes && <td role="gridcell">{pop.ac_hom}</td>}
              {showHemizygotes && <td role="gridcell">{pop.ac_hemi}</td>}
              <td role="gridcell">{pop.af.toPrecision(4)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr role="row">
            <th role="rowheader">Total</th>
            <td role="gridcell">{totalAlleleCount}</td>
            <td role="gridcell">{totalAlleleNumber}</td>
            {showHomozygotes && <td role="gridcell">{totalHomozygotes}</td>}
            {showHemizygotes && <td role="gridcell">{totalHemizygotes}</td>}
            <td role="gridcell">{totalAlleleFrequency.toPrecision(4)}</td>
          </tr>
        </tfoot>
      </Table>
    )
  }
}
