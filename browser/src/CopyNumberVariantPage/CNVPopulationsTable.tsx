import React, { Component } from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton, TooltipAnchor, TooltipHint } from '@gnomad/ui'
import { CopyNumberVariant } from './CopyNumberVariantPage'

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

type Subpopulation = {
  id: string
  name: string
  sc: number
  sn: number
}

const isSexSpecificPopulation = (pop: Subpopulation) =>
  SEX_IDENTIFIERS.includes(pop.id) || SEX_IDENTIFIERS.some((id) => pop.id.endsWith(`_${id}`))

const calculatePopSF = (sc: number, sn: number) => {
  if (sn === 0) {
    return '-'
  }
  return sc / sn
}

const renderPopSF = (sf: number | string) => {
  if (typeof sf === 'number') {
    return sf.toPrecision(4)
  }
  return sf
}

type OwnPopulationsTableProps = {
  columnLabels?: {
    sc?: string
    sn?: string
    sf?: string
  }
  populations: {
    id: string
    name: string
    sc: number
    sn: number
    subpopulations?: {
      id: string
      name: string
      sc: number
      sn: number
    }[]
  }[]
  initiallyExpandRows?: boolean
  variant: CopyNumberVariant
}

type CNVPopulationsTableState = any

type CNVPopulationsTableProps = OwnPopulationsTableProps & typeof CNVPopulationsTable.defaultProps

export class CNVPopulationsTable extends Component<
  CNVPopulationsTableProps & { variant: CopyNumberVariant},
  CNVPopulationsTableState
> {
  static defaultProps = {
    columnLabels: {},
    initiallyExpandRows: false,
    variant: {}
  }

  constructor(props: CNVPopulationsTableProps ) {
    super(props)

    this.state = {
      sortBy: 'sf',
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

  togglePopulationExpanded(populationName: string) {
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
    const { columnLabels, populations, variant } = this.props
    const { expandedPopulations, sortAscending, sortBy } = this.state

    const renderedPopulations = populations
      .map((pop) => {
        const transformedSubpopulations = (pop.subpopulations || [])
          .map((subPop) => ({
            id: subPop.id,
            name: subPop.name,
            sc: subPop.sc,
            sn: subPop.sn,
            sf: calculatePopSF(subPop.sc, subPop.sn),
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
              : // @ts-expect-error TS(7053) FIXME: Element implicitly has sn 'any' type because expre... Remove this comment to see the full error message
                subPop1[sortBy] - subPop2[sortBy]
          })
        return {
          id: pop.id,
          name: pop.name,
          sc: pop.sc,
          sn: pop.sn,
          sf: calculatePopSF(pop.sc, pop.sn),
          subpopulations: transformedSubpopulations,
        }
      })
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

        // @ts-expect-error TS(7053) FIXME: Element implicitly has sn 'any' type because expre... Remove this comment to see the full error message
        return sortBy === 'name' ? pop1.name.localeCompare(pop2.name) : pop1[sortBy] - pop2[sortBy]
      })

    // XX/XY numbers are included in the ancestry populations.
    const totalSC = variant.sc
    const totalSN = variant.sn
    const totalSF = totalSN !== 0 ? totalSC / totalSN : 0

    return (
      <Table>
        <thead>
          <tr>
            {this.renderColumnHeader({
              key: 'name',
              label: 'Genetic ancestry group',
              props: { colSpan: 2 },
            })}
            {this.renderColumnHeader({
              key: 'sc',
              label: columnLabels.sc || 'SC',
              tooltip: 'Number of individuals that carry this variant',
              props: {
                className: 'right-align',
              },
            })}
            {this.renderColumnHeader({
              key: 'sn',
              label: columnLabels.sn || 'SN',
              tooltip: 'Number of individuals that have a non-null genotype',
              props: {
                className: 'right-align',
              },
            })}
            {this.renderColumnHeader({
              key: 'sf',
              label: columnLabels.sf || 'SF',
              tooltip: 'Proportion of individuals carrying this variant',
              props: {
                className: 'right-align',
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
              <td className="right-align">{pop.sc}</td>
              <td className="right-align">{pop.sn}</td>
              <td className="right-align">{renderPopSF(pop.sf)}</td>
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
                  <td className="right-align">{subPop.sc}</td>
                  <td className="right-align">{subPop.sn}</td>
                  <td className="right-align">{renderPopSF(subPop.sf)}</td>
                </tr>
              ))}
          </tbody>
        ))}
        <tfoot>
          <tr className="border">
            <th colSpan={2} scope="row">
              Total
            </th>
            <td className="right-align">{totalSC}</td>
            <td className="right-align">{totalSN}</td>
            <td className="right-align">{totalSF.toPrecision(4)}</td>
          </tr>
        </tfoot>
      </Table>
    )
  }
}
