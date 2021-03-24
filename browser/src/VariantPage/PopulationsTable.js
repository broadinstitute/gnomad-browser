import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton } from '@gnomad/ui'

const Table = styled(BaseTable)`
  tr.border {
    td,
    th {
      border-top: 2px solid #aaa;
    }
  }

  td.right-align {
    padding-right: 25px;
    text-align: right;
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

const SEX_IDENTIFIERS = ['XX', 'XY']

const isSexSpecificPopulation = pop =>
  SEX_IDENTIFIERS.includes(pop.id) || SEX_IDENTIFIERS.some(id => pop.id.endsWith(`_${id}`))

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
            ac_hemi: PropTypes.number,
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
    const { sortAscending, sortBy } = this.state
    let ariaSortAttr = 'none'
    if (sortBy === key) {
      ariaSortAttr = sortAscending ? 'ascending' : 'descending'
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
    const { expandedPopulations } = this.state
    const isExpanded = expandedPopulations[pop.name]
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
    const { columnLabels, populations } = this.props
    const { expandedPopulations, sortAscending, sortBy } = this.state

    const renderedPopulations = populations
      .map(pop => ({
        ...pop,
        // af: pop.an !== 0 ? pop.ac / pop.an : 0,
        af: pop.an !== 0 ? pop.ac / pop.an : 0,
        subpopulations: (pop.subpopulations || [])
          .map(subPop => ({
            ...subPop,
            af: subPop.an !== 0 ? subPop.ac / subPop.an : 0,
            // af: subPop.an !== 0 ? subPop.ac / subPop.an : 0,
          }))
          .sort((a, b) => {
            // Sort XX/XY subpopulations to bottom of list
            if (isSexSpecificPopulation(a) && !isSexSpecificPopulation(b)) {
              return 1
            }
            if (isSexSpecificPopulation(b) && !isSexSpecificPopulation(a)) {
              return -1
            }

            const [subPop1, subPop2] = sortAscending ? [a, b] : [b, a]

            return sortBy === 'name'
              ? subPop1.name.localeCompare(subPop2.name)
              : subPop1[sortBy] - subPop2[sortBy]
          }),
      }))
      .sort((a, b) => {
        // Sort XX/XY populations to bottom of list
        if (isSexSpecificPopulation(a) && !isSexSpecificPopulation(b)) {
          return 1
        }
        if (isSexSpecificPopulation(b) && !isSexSpecificPopulation(a)) {
          return -1
        }

        // Always sort xx/xy populations by name
        if (isSexSpecificPopulation(b) && isSexSpecificPopulation(a)) {
          return a.name.localeCompare(b.name)
        }

        const [pop1, pop2] = sortAscending ? [a, b] : [b, a]

        return sortBy === 'name' ? pop1.name.localeCompare(pop2.name) : pop1[sortBy] - pop2[sortBy]
      })

    // XX/XY numbers are included in the ancestry populations.
    const totalAlleleCount = renderedPopulations
      .filter(pop => !isSexSpecificPopulation(pop))
      .map(pop => pop.ac)
      .reduce((acc, n) => acc + n, 0)
    const totalAlleleNumber = renderedPopulations
      .filter(pop => !isSexSpecificPopulation(pop))
      .map(pop => pop.an)
      .reduce((acc, n) => acc + n, 0)
    const totalAlleleFrequency = totalAlleleNumber !== 0 ? totalAlleleCount / totalAlleleNumber : 0

    const totalHemizygotes = renderedPopulations
      .filter(pop => !isSexSpecificPopulation(pop))
      .map(pop => pop.ac_hemi)
      .reduce((acc, n) => acc + n, 0)
    const totalHomozygotes = renderedPopulations
      .filter(pop => !isSexSpecificPopulation(pop))
      .map(pop => pop.ac_hom)
      .reduce((acc, n) => acc + n, 0)

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
        {renderedPopulations.map((pop, i) => (
          <tbody key={pop.id}>
            <tr
              className={
                i > 0 &&
                isSexSpecificPopulation(pop) &&
                !isSexSpecificPopulation(renderedPopulations[i - 1])
                  ? 'border'
                  : undefined
              }
            >
              {this.renderPopulationRowHeader(pop)}
              {expandedPopulations[pop.name] && <td>Overall</td>}
              <td className="right-align">{pop.ac}</td>
              <td className="right-align">{pop.an}</td>
              {showHomozygotes && <td className="right-align">{pop.ac_hom}</td>}
              {showHemizygotes && <td className="right-align">{pop.ac_hemi}</td>}
              <td>{pop.af.toPrecision(4)}</td>
            </tr>
            {pop.subpopulations &&
              expandedPopulations[pop.name] &&
              pop.subpopulations.map((subPop, j) => (
                <tr
                  key={`${pop.name}-${subPop.name}`}
                  className={
                    j === 0 ||
                    (isSexSpecificPopulation(subPop) &&
                      !isSexSpecificPopulation(pop.subpopulations[j - 1]))
                      ? 'border'
                      : undefined
                  }
                >
                  <td>{subPop.name}</td>
                  <td className="right-align">{subPop.ac}</td>
                  <td className="right-align">{subPop.an}</td>
                  {showHomozygotes && <td className="right-align">{subPop.ac_hom}</td>}
                  {showHemizygotes && (
                    <td className="right-align">
                      {subPop.ac_hemi !== null ? subPop.ac_hemi : '—'}
                    </td>
                  )}
                  <td>{subPop.af.toPrecision(4)}</td>
                </tr>
              ))}
          </tbody>
        ))}
        <tfoot>
          <tr className="border">
            <th colSpan={2} scope="row">
              Total
            </th>
            <td className="right-align">{totalAlleleCount}</td>
            <td className="right-align">{totalAlleleNumber}</td>
            {showHomozygotes && <td className="right-align">{totalHomozygotes}</td>}
            {showHemizygotes && <td className="right-align">{totalHemizygotes}</td>}
            <td>{totalAlleleFrequency.toPrecision(4)}</td>
          </tr>
        </tfoot>
      </Table>
    )
  }
}
