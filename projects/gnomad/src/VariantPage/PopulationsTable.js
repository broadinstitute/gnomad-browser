import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { TextButton } from '@broad/ui'

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

const TogglePopulationButton = TextButton.extend`
  text-align: left;
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
        subpopulations: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            ac: PropTypes.number.isRequired,
            an: PropTypes.number.isRequired,
            ac_hom: PropTypes.number.isRequired,
          })
        ),
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
    sortBy: 'af',
    sortAscending: false,
    expandedPopulations: {},
  }

  setSortBy(sortBy) {
    this.setState(state => ({
      sortBy,
      sortAscending: sortBy === state.sortBy ? !state.sortAscending : state.sortAscending,
    }))
  }

  togglePopulationExpanded(populationName) {
    this.setState(state => ({
      ...state,
      expandedPopulations: {
        ...state.expandedPopulations,
        [populationName]: !state.expandedPopulations[populationName],
      },
    }))
  }

  renderColumnHeader(key, label, colSpan = undefined) {
    let ariaSortAttr = 'none'
    if (this.state.sortBy === key) {
      ariaSortAttr = this.state.sortAscending ? 'ascending' : 'descending'
    }

    return (
      <th colSpan={colSpan} aria-sort={ariaSortAttr} role="columnheader">
        <span role="button" tabIndex="0" onClick={() => this.setSortBy(key)}>
          {label}
        </span>
      </th>
    )
  }

  renderPopulationRowHeader(pop) {
    const colSpan = this.state.expandedPopulations[pop.name] ? 1 : 2
    const rowSpan = this.state.expandedPopulations[pop.name] ? pop.subpopulations.length + 1 : 1
    return (
      <th colSpan={colSpan} rowSpan={rowSpan} role="rowheader">
        <TogglePopulationButton onClick={() => this.togglePopulationExpanded(pop.name)}>
          {pop.name}
        </TogglePopulationButton>
      </th>
    )
  }

  render() {
    const populations = this.props.populations
      .map(pop => ({
        ...pop,
        af: pop.an !== 0 ? pop.ac / pop.an : 0,
        subpopulations: pop.subpopulations
          .map(subPop => ({
            ...subPop,
            af: subPop.an !== 0 ? subPop.ac / subPop.an : 0,
          }))
          .sort((a, b) => {
            // Sort male/female subpopulations to bottom of list
            if ((a.id === 'MALE' || a.id === 'FEMALE') && (b.id !== 'MALE' && b.id !== 'FEMALE')) {
              return 1
            }
            if ((b.id === 'MALE' || b.id === 'FEMALE') && (a.id !== 'MALE' && a.id !== 'FEMALE')) {
              return -1
            }

            const [subPop1, subPop2] = this.state.sortAscending ? [a, b] : [b, a]

            return this.state.sortBy === 'name'
              ? subPop1.name.localeCompare(subPop2.name)
              : subPop1[this.state.sortBy] - subPop2[this.state.sortBy]
          }),
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
            {this.renderColumnHeader('name', 'Population', 2)}
            {this.renderColumnHeader('ac', 'Allele Count')}
            {this.renderColumnHeader('an', 'Allele Number')}
            {showHomozygotes && this.renderColumnHeader('ac_hom', 'Number of Homozygotes')}
            {showHemizygotes && this.renderColumnHeader('ac_hemi', 'Number of Hemizygotes')}
            {this.renderColumnHeader('af', 'Allele Frequency')}
          </tr>
        </thead>
        {populations.map(pop => (
          <tbody key={pop.name}>
            <tr key={pop.name} role="row">
              {this.renderPopulationRowHeader(pop)}
              {this.state.expandedPopulations[pop.name] && <td role="gridcell">Overall</td>}
              <td role="gridcell">{pop.ac}</td>
              <td role="gridcell">{pop.an}</td>
              {showHomozygotes && <td role="gridcell">{pop.ac_hom}</td>}
              {showHemizygotes && <td role="gridcell">{pop.ac_hemi}</td>}
              <td role="gridcell">{pop.af.toPrecision(4)}</td>
            </tr>
            {pop.subpopulations &&
              this.state.expandedPopulations[pop.name] &&
              pop.subpopulations.map(subPop => (
                <tr key={`${pop.name}-${subPop.name}`} role="row">
                  <td role="gridcell">{subPop.name}</td>
                  <td role="gridcell">{subPop.ac}</td>
                  <td role="gridcell">{subPop.an}</td>
                  {showHomozygotes && <td role="gridcell">{subPop.ac_hom}</td>}
                  {showHemizygotes && <td role="gridcell">&mdash;</td>}
                  <td role="gridcell">{subPop.af.toPrecision(4)}</td>
                </tr>
              ))}
          </tbody>
        ))}
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
