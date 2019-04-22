import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton } from '@broad/ui'

const Table = styled(BaseTable)`
  tr.border td {
    border-bottom: 2px solid #aaa;
  }
`

const TogglePopulationButton = styled(TextButton)`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  padding-left: ${props => (props.isExpanded ? '15px' : '10px')};
  background-image: ${props =>
    props.isExpanded
      ? 'url(data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7)'
      : 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAVCAYAAABhe09AAAAATElEQVQoU2NkQAOM9BFQ1jXYf/fyBUeYbYzKugb/GRgYDsAEYQIgBWBBZAGwIIoA438GhAoQ586VCxAVMA5ID6OKjoEDSAZuLV18CwAQVSMV/9L8fgAAAABJRU5ErkJggg==)'};
  background-position: center left ${props => (props.isExpanded ? '-5px' : '0')};
  background-repeat: no-repeat;
  color: inherit;
  text-align: left;
`

export class PopulationsTable extends Component {
  static propTypes = {
    columnLabels: PropTypes.shape({
      ac: PropTypes.string,
      an: PropTypes.string,
      af: PropTypes.string,
    }),
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number,
        ac_hom: PropTypes.number,
        subpopulations: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            ac: PropTypes.number.isRequired,
            an: PropTypes.number.isRequired,
            ac_hom: PropTypes.number,
          })
        ),
      })
    ).isRequired,
    showHemizygotes: PropTypes.bool,
    showHomozygotes: PropTypes.bool,
  }

  static defaultProps = {
    columnLabels: {},
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
      <th colSpan={colSpan} aria-sort={ariaSortAttr} scope="col">
        <button type="button" onClick={() => this.setSortBy(key)}>
          {label}
        </button>
      </th>
    )
  }

  renderPopulationRowHeader(pop) {
    const isExpanded = this.state.expandedPopulations[pop.name]
    const colSpan = isExpanded ? 1 : 2
    const rowSpan = isExpanded ? pop.subpopulations.length + 1 : 1
    return (
      <th colSpan={colSpan} rowSpan={rowSpan} scope="row">
        {pop.subpopulations.length > 0 ? (
          <TogglePopulationButton
            isExpanded={isExpanded}
            onClick={() => this.togglePopulationExpanded(pop.name)}
          >
            {pop.name}
          </TogglePopulationButton>
        ) : (
          pop.name
        )}
      </th>
    )
  }

  render() {
    // Hack to support alternate column labels for MCNV structural variants
    const { columnLabels } = this.props

    const populations = this.props.populations
      .map(pop => ({
        ...pop,
        af: pop.an !== 0 ? pop.ac / pop.an : 0,
        subpopulations: (pop.subpopulations || [])
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
      <Table>
        <thead>
          <tr>
            {this.renderColumnHeader('name', 'Population', 2)}
            {this.renderColumnHeader('ac', columnLabels.ac || 'Allele Count')}
            {this.renderColumnHeader('an', columnLabels.an || 'Allele Number')}
            {showHomozygotes && this.renderColumnHeader('ac_hom', 'Number of Homozygotes')}
            {showHemizygotes && this.renderColumnHeader('ac_hemi', 'Number of Hemizygotes')}
            {this.renderColumnHeader('af', columnLabels.af || 'Allele Frequency')}
          </tr>
        </thead>
        {populations.map(pop => (
          <tbody key={pop.name}>
            <tr
              key={pop.name}
              className={this.state.expandedPopulations[pop.name] ? 'border' : undefined}
            >
              {this.renderPopulationRowHeader(pop)}
              {this.state.expandedPopulations[pop.name] && <td>Overall</td>}
              <td>{pop.ac}</td>
              <td>{pop.an}</td>
              {showHomozygotes && <td>{pop.ac_hom}</td>}
              {showHemizygotes && <td>{pop.ac_hemi}</td>}
              <td>{pop.af.toPrecision(4)}</td>
            </tr>
            {pop.subpopulations &&
              this.state.expandedPopulations[pop.name] &&
              pop.subpopulations.map((subPop, i) => (
                <tr
                  key={`${pop.name}-${subPop.name}`}
                  className={i === pop.subpopulations.length - 3 ? 'border' : undefined}
                >
                  <td>{subPop.name}</td>
                  <td>{subPop.ac}</td>
                  <td>{subPop.an}</td>
                  {showHomozygotes && <td>{subPop.ac_hom}</td>}
                  {showHemizygotes && <td>&mdash;</td>}
                  <td>{subPop.af.toPrecision(4)}</td>
                </tr>
              ))}
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th colSpan={2} scope="row">
              Total
            </th>
            <td>{totalAlleleCount}</td>
            <td>{totalAlleleNumber}</td>
            {showHomozygotes && <td>{totalHomozygotes}</td>}
            {showHemizygotes && <td>{totalHemizygotes}</td>}
            <td>{totalAlleleFrequency.toPrecision(4)}</td>
          </tr>
        </tfoot>
      </Table>
    )
  }
}
