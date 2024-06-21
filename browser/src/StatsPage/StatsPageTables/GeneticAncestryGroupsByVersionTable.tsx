import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import versionData from './GeneticAncestryGroupsByVersionData.json'

import {
  renderNumberOrDash,
  StatsTable,
  StatsTableHeaderRow,
  StatsTableSubHeaderRow,
  StatsTableBody,
  StatsTableCaption,
  StatsTableFooter,
} from './TableStyles'
import { populationName } from '@gnomad/dataset-metadata/gnomadPopulations'

const GeneticAncestryGroupsByVersionTable = () => {
  const elementId = 'genetic-ancestry-group-size-by-version-table'

  return (
    <div>
      <StatsTable id={elementId}>
        <thead>
          <StatsTableHeaderRow>
            <th>&nbsp;</th>
            <th>ExAC</th>
            <th>gnomAD v2</th>
            <th>gnomAD v3</th>
            <th colSpan={5}>gnomAD v4*</th>
          </StatsTableHeaderRow>
          <StatsTableSubHeaderRow>
            <th className="rb">&nbsp;</th>
            <th className="rb">Sample count</th>
            <th className="rb">Sample count</th>
            <th className="rb">Sample count</th>
            <th>Sample count</th>
            <th>%</th>
            <th>Increase from v2</th>
          </StatsTableSubHeaderRow>
        </thead>
        <StatsTableBody>
          {versionData.data
            .filter((tableRow) => tableRow.geneticAncestryGroup !== 'total')
            .map((tableRow) => {
              return (
                <tr>
                  <td className="rb">{`${populationName(tableRow.geneticAncestryGroup)}${
                    tableRow.optionalSymbol
                  }`}</td>
                  <td className="rb">{renderNumberOrDash(tableRow.EXaC.sampleCount)}</td>
                  <td className="rb">{renderNumberOrDash(tableRow.gnomADV2.sampleCount)}</td>
                  <td className="rb">{renderNumberOrDash(tableRow.gnomADV3.sampleCount)}</td>
                  <td>{renderNumberOrDash(tableRow.gnomADV4.sampleCount)}</td>
                  <td>{`${tableRow.gnomADV4.percentOfSamples}%`}</td>
                  <td>{`${tableRow.gnomADV4.foldIncreaseFromV2}x`}</td>
                </tr>
              )
            })}
        </StatsTableBody>
        <StatsTableFooter>
          {versionData.data
            .filter((tableRow) => tableRow.geneticAncestryGroup === 'total')
            .map((tableRow) => {
              return (
                <tr>
                  <td>Total</td>
                  <td>{renderNumberOrDash(tableRow.EXaC.sampleCount)}</td>
                  <td>{renderNumberOrDash(tableRow.gnomADV2.sampleCount)}</td>
                  <td>{renderNumberOrDash(tableRow.gnomADV3.sampleCount)}</td>
                  <td>{renderNumberOrDash(tableRow.gnomADV4.sampleCount)}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              )
            })}
        </StatsTableFooter>
        <StatsTableCaption>
          <div>*v4 includes all v3 samples.</div>
          <div>
            ^ Due to small sample size, Amish are included in remaining individuals, and based on
            population proximity Finns are included in European totals. Both are presented
            separately in the v4 browser as before.
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}

export default GeneticAncestryGroupsByVersionTable
