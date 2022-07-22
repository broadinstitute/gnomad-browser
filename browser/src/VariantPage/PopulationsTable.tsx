import React, { Component } from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton, TooltipAnchor, TooltipHint } from '@gnomad/ui'

const Table = styled(BaseTable)`
  min-width: 100%;

  tr.border {
    td,
    th {
      border-top: 2px solid #aaa;
    }
  }

  th.right-align,
  td.right-align {
    padding-right: 25px;
    text-align: right;
  }
`

const TogglePopulationButton = styled(TextButton)`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  padding-left: ${(props: any) => (props.isExpanded ? '15px' : '10px')};
  background-image: ${(props: any) =>
    props.isExpanded
      ? 'url(data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7)'
      : 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAVCAYAAABhe09AAAAATElEQVQoU2NkQAOM9BFQ1jXYf/fyBUeYbYzKugb/GRgYDsAEYQIgBWBBZAGwIIoA438GhAoQ586VCxAVMA5ID6OKjoEDSAZuLV18CwAQVSMV/9L8fgAAAABJRU5ErkJggg==)'};
  background-position: center left ${(props: any) => (props.isExpanded ? '-5px' : '0')};
  background-repeat: no-repeat;
  color: inherit;
  text-align: left;
`

const SEX_IDENTIFIERS = ['XX', 'XY']

const isSexSpecificPopulation = (pop: any) =>
  SEX_IDENTIFIERS.includes(pop.id) || SEX_IDENTIFIERS.some((id) => pop.id.endsWith(`_${id}`))

type OwnPopulationsTableProps = {
  columnLabels?: {
    ac?: string
    an?: string
    af?: string
  }
  populations: {
    name: string
    ac: number
    an: number
    ac_hemi?: number
    ac_hom?: number
    subpopulations?: {
      name: string
      ac: number
      an: number
      ac_hemi?: number
      ac_hom?: number
    }[]
  }[]
  showHemizygotes?: boolean
  showHomozygotes?: boolean
  initiallyExpandRows?: boolean
}

type PopulationsTableState = any

type PopulationsTableProps = OwnPopulationsTableProps & typeof PopulationsTable.defaultProps

export class PopulationsTable extends Component<PopulationsTableProps, PopulationsTableState> {
  static defaultProps = {
    columnLabels: {},
    showHemizygotes: true,
    showHomozygotes: true,
    initiallyExpandRows: false,
  }

  constructor(props: PopulationsTableProps) {
    super(props)

    this.state = {
      sortBy: 'af',
      sortAscending: false,
      expandedPopulations: props.populations.reduce(
        (acc, pop) => ({ ...acc, [pop.name]: props.initiallyExpandRows }),
        {}
      ),
    }
  }

  setSortBy(sortBy: any) {
    this.setState((state: any) => ({
      sortBy,
      sortAscending: sortBy === state.sortBy ? !state.sortAscending : state.sortAscending,
    }))
  }

  togglePopulationExpanded(populationName: any) {
    this.setState((state: any) => ({
      ...state,

      expandedPopulations: {
        ...state.expandedPopulations,
        [populationName]: !state.expandedPopulations[populationName],
      },
    }))
  }

  renderColumnHeader({ key, label, tooltip = null, props = {} }: any) {
    const { sortAscending, sortBy } = this.state
    let ariaSortAttr = 'none'
    if (sortBy === key) {
      ariaSortAttr = sortAscending ? 'ascending' : 'descending'
    }

    return (
      <th {...props} aria-sort={ariaSortAttr} scope="col">
        <button type="button" onClick={() => this.setSortBy(key)}>
          {tooltip ? (
            // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message
            <TooltipAnchor tooltip={tooltip}>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <TooltipHint>{label}</TooltipHint>
            </TooltipAnchor>
          ) : (
            label
          )}
        </button>
      </th>
    )
  }

  renderPopulationRowHeader(pop: any) {
    const { expandedPopulations } = this.state
    const isExpanded = expandedPopulations[pop.name]
    const colSpan = isExpanded ? 1 : 2
    const rowSpan = isExpanded ? pop.subpopulations.length + 1 : 1
    return (
      <th colSpan={colSpan} rowSpan={rowSpan} scope="row">
        {pop.subpopulations.length > 0 ? (
          <TogglePopulationButton
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
      .map((pop) => ({
        ...pop,
        // af: pop.an !== 0 ? pop.ac / pop.an : 0,
        af: pop.an !== 0 ? pop.ac / pop.an : 0,
        subpopulations: (pop.subpopulations || [])
          .map((subPop) => ({
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
              : // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                subPop1[sortBy] - subPop2[sortBy]
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

        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return sortBy === 'name' ? pop1.name.localeCompare(pop2.name) : pop1[sortBy] - pop2[sortBy]
      })

    // XX/XY numbers are included in the ancestry populations.
    const totalAlleleCount = renderedPopulations
      .filter((pop) => !isSexSpecificPopulation(pop))
      .map((pop) => pop.ac)
      .reduce((acc, n) => acc + n, 0)
    const totalAlleleNumber = renderedPopulations
      .filter((pop) => !isSexSpecificPopulation(pop))
      .map((pop) => pop.an)
      .reduce((acc, n) => acc + n, 0)
    const totalAlleleFrequency = totalAlleleNumber !== 0 ? totalAlleleCount / totalAlleleNumber : 0

    const totalHemizygotes = renderedPopulations
      .filter((pop) => !isSexSpecificPopulation(pop))
      .map((pop) => pop.ac_hemi)
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      .reduce((acc, n) => acc + n, 0)
    const totalHomozygotes = renderedPopulations
      .filter((pop) => !isSexSpecificPopulation(pop))
      .map((pop) => pop.ac_hom)
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      .reduce((acc, n) => acc + n, 0)

    const { showHemizygotes, showHomozygotes } = this.props

    return (
      <Table>
        <thead>
          <tr>
            {this.renderColumnHeader({ key: 'name', label: 'Population', props: { colSpan: 2 } })}
            {this.renderColumnHeader({
              key: 'ac',
              label: columnLabels.ac || 'Allele Count',
              tooltip: 'Alternate allele count in high quality genotypes',
              props: {
                className: 'right-align',
              },
            })}
            {this.renderColumnHeader({
              key: 'an',
              label: columnLabels.an || 'Allele Number',
              tooltip: 'Total number of called high quality genotypes',
              props: {
                className: 'right-align',
              },
            })}
            {showHomozygotes &&
              this.renderColumnHeader({
                key: 'ac_hom',
                label: 'Number of Homozygotes',
                tooltip: 'Number of individuals homozygous for alternate allele',
                props: {
                  className: 'right-align',
                },
              })}
            {showHemizygotes &&
              this.renderColumnHeader({
                key: 'ac_hemi',
                label: 'Number of Hemizygotes',
                tooltip: 'Number of individuals hemizygous for alternate allele',
                props: {
                  className: 'right-align',
                },
              })}
            {this.renderColumnHeader({
              key: 'af',
              label: columnLabels.af || 'Allele Frequency',
              tooltip: 'Alternate allele frequency in high quality genotypes',
              props: {
                style: { paddingLeft: '25px' },
              },
            })}
          </tr>
        </thead>
        {renderedPopulations.map((pop, i) => (
          <tbody key={(pop as any).id}>
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
              <td style={{ paddingLeft: '25px' }}>{pop.af.toPrecision(4)}</td>
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
                  <td style={{ paddingLeft: '25px' }}>{subPop.af.toPrecision(4)}</td>
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
            <td style={{ paddingLeft: '25px' }}>{totalAlleleFrequency.toPrecision(4)}</td>
          </tr>
        </tfoot>
      </Table>
    )
  }
}
