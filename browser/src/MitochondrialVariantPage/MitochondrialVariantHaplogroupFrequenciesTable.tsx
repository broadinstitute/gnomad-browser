import React, { Component } from 'react'
import styled from 'styled-components'

import { BaseTable, Checkbox, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const CountCell = styled.span`
  display: inline-block;
  width: 7ch;
  margin: auto;
  text-align: right;
`

const Table = styled(BaseTable)`
  width: 100%;
  margin-bottom: 1em;

  tr.border {
    td,
    th {
      border-top: 2px solid #aaa;
    }
  }

  tfoot ${CountCell} {
    /* Adjust alignment to make up for bold text in footer */
    padding-right: 0.5ch;
  }
`

type Props = {
  variant: MitochondrialVariantDetailPropType
}

type State = any

class MitochondrialVariantHaplogroupFrequenciesTable extends Component<Props, State> {
  state = {
    showAC0Haplogroups: false,
    sortBy: 'af_hom',
    sortAscending: false,
  }

  setSortBy(sortBy: any) {
    this.setState((state: any) => ({
      sortBy,
      sortAscending: sortBy === state.sortBy ? !state.sortAscending : false,
    }))
  }

  renderColumnHeader(key: any, label: any, tooltip: any) {
    const { sortAscending, sortBy } = this.state
    let ariaSortAttr = 'none'
    if (sortBy === key) {
      ariaSortAttr = sortAscending ? 'ascending' : 'descending'
    }

    return tooltip ? (
      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; "aria-sort": string; sc... Remove this comment to see the full error message
      <th aria-sort={ariaSortAttr} scope="col">
        {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
        <TooltipAnchor tooltip={tooltip}>
          <button type="button" onClick={() => this.setSortBy(key)}>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <TooltipHint>{label}</TooltipHint>
          </button>
        </TooltipAnchor>
      </th>
    ) : (
      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; "aria-sort": string; sc... Remove this comment to see the full error message
      <th aria-sort={ariaSortAttr} scope="col">
        <button type="button" onClick={() => this.setSortBy(key)}>
          {label}
        </button>
      </th>
    )
  }

  render() {
    const { variant } = this.props
    const { showAC0Haplogroups, sortAscending, sortBy } = this.state

    const renderedHaplogroups = (showAC0Haplogroups
      ? variant.haplogroups
      : variant.haplogroups.filter((haplogroup) => haplogroup.ac_hom + haplogroup.ac_het > 0)
    )
      .map((haplogroup) => ({
        ...haplogroup,
        af_hom: haplogroup.an !== 0 ? haplogroup.ac_hom / haplogroup.an : 0,
        af_het: haplogroup.an !== 0 ? haplogroup.ac_het / haplogroup.an : 0,
      }))
      .sort((a, b) => {
        const [haplogroup1, haplogroup2] = sortAscending ? [a, b] : [b, a]

        return sortBy === 'id'
          ? haplogroup1.id.localeCompare(haplogroup2.id)
          : // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            haplogroup1[sortBy] - haplogroup2[sortBy]
      })

    const totalAlleleNumber = renderedHaplogroups
      .map((haplogroup) => haplogroup.an)
      .reduce((acc, n) => acc + n, 0)

    const totalHomoplasmicAlleleCount = renderedHaplogroups
      .map((haplogroup) => haplogroup.ac_hom)
      .reduce((acc, n) => acc + n, 0)
    const totalHomoplasmicAlleleFrequency =
      totalAlleleNumber !== 0 ? totalHomoplasmicAlleleCount / totalAlleleNumber : 0

    const totalHeteroplasmicAlleleCount = renderedHaplogroups
      .map((haplogroup) => haplogroup.ac_het)
      .reduce((acc, n) => acc + n, 0)
    const totalHeteroplasmicAlleleFrequency =
      totalAlleleNumber !== 0 ? totalHeteroplasmicAlleleCount / totalAlleleNumber : 0

    return (
      <div>
        <Table>
          <thead>
            <tr>
              {this.renderColumnHeader('id', 'Haplogroup', null)}
              {this.renderColumnHeader(
                'an',
                'Allele Number',
                'Total number of individuals in this haplogroup with high quality sequence at this position.'
              )}
              {this.renderColumnHeader(
                'ac_hom',
                'Homoplasmic AC',
                'Number of individuals in this haplogroup with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).'
              )}
              {this.renderColumnHeader(
                'af_hom',
                'Homoplasmic AF',
                'Proportion of individuals in this haplogroup with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).'
              )}
              {this.renderColumnHeader(
                'ac_het',
                'Heteroplasmic AC',
                'Number of individuals in this haplogroup with a variant at heteroplasmy level 0.10 - 0.95.'
              )}
              {this.renderColumnHeader(
                'af_het',
                'Heteroplasmic AF',
                'Proportion of individuals in this haplogroup with a variant at heteroplasmy level 0.10 - 0.95.'
              )}
            </tr>
          </thead>
          <tbody>
            {renderedHaplogroups.map((haplogroup) => (
              <tr key={haplogroup.id}>
                <th scope="row">{haplogroup.id}</th>
                <td>
                  <CountCell>{haplogroup.an}</CountCell>
                </td>
                <td>
                  <CountCell>{haplogroup.ac_hom}</CountCell>
                </td>
                <td>{haplogroup.af_hom.toPrecision(4)}</td>
                <td>
                  <CountCell>{haplogroup.ac_het}</CountCell>
                </td>
                <td>{haplogroup.af_het.toPrecision(4)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border">
              <th scope="row">Total</th>
              <td>
                <CountCell>{totalAlleleNumber}</CountCell>
              </td>
              <td>
                <CountCell>{totalHomoplasmicAlleleCount}</CountCell>
              </td>
              <td>{totalHomoplasmicAlleleFrequency.toPrecision(4)}</td>
              <td>
                <CountCell>{totalHeteroplasmicAlleleCount}</CountCell>
              </td>
              <td>{totalHeteroplasmicAlleleFrequency.toPrecision(4)}</td>
            </tr>
          </tfoot>
        </Table>
        <Checkbox
          id="haplogroups-toggle-ac0"
          label="Include haplogroups with allele count of 0"
          checked={showAC0Haplogroups}
          onChange={(isChecked) => {
            this.setState({ showAC0Haplogroups: isChecked })
          }}
        />
      </div>
    )
  }
}

export default MitochondrialVariantHaplogroupFrequenciesTable
