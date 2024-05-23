import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import inferredSexAllV4Data from './InferredSexPerGeneticAncestryData.json'

import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableSubHeaderRow,
  StatsTableBody,
  StatsTableCaption,
  StatsTableFooter,
} from './TableStyles'
import { populationName } from '@gnomad/dataset-metadata/gnomadPopulations'

export const InferredSexAllV4Table = () => {
  const elementId = 'inferred-sex-by-genetic-ancestry-group-table'

  return (
    <div>
      <StatsTable id={elementId}>
        <thead>
          <StatsTableHeaderRow>
            <th colSpan={2}>Genetic Ancestry</th>
            <th colSpan={3}>v4 Exomes</th>
            <th colSpan={3}>v4 Genomes</th>
            <th colSpan={3}>Combined</th>
          </StatsTableHeaderRow>
          <StatsTableSubHeaderRow>
            <th>Genetic Ancestry</th>
            <th>Genetic Ancestry </th>
            <th>Sample Count</th>
            <th>XX</th>
            <th>XY</th>
            <th>Sample Count</th>
            <th>XX</th>
            <th>XY</th>
            <th>Sample Count</th>
            <th>XX</th>
            <th>XY</th>
          </StatsTableSubHeaderRow>
        </thead>
        <StatsTableBody>
          {inferredSexAllV4Data.gnomADV4
            .filter((tableRowData) => tableRowData.geneticAncestryGroup !== 'total')
            .map((tableRowData) => {
              const exomesCombined = tableRowData.exomes.XX + tableRowData.exomes.XY
              const genomesCombined = tableRowData.genomes.XX + tableRowData.genomes.XY
              return (
                <tr>
                  <td>{populationName(tableRowData.geneticAncestryGroup)}</td>
                  <td>{tableRowData.geneticAncestryGroup}</td>
                  <td>{exomesCombined.toLocaleString()}</td>
                  <td>{tableRowData.exomes.XX.toLocaleString()}</td>
                  <td>{tableRowData.exomes.XY.toLocaleString()}</td>
                  <td>{genomesCombined.toLocaleString()}</td>
                  <td>{tableRowData.genomes.XX.toLocaleString()}</td>
                  <td>{tableRowData.genomes.XY.toLocaleString()}</td>
                  <td>{(exomesCombined + genomesCombined).toLocaleString()}</td>
                  <td>{(tableRowData.exomes.XX + tableRowData.genomes.XX).toLocaleString()}</td>
                  <td>{(tableRowData.exomes.XY + tableRowData.genomes.XY).toLocaleString()}</td>
                </tr>
              )
            })}
        </StatsTableBody>
        <StatsTableFooter>
          {inferredSexAllV4Data.gnomADV4
            .filter((tableRowData) => tableRowData.geneticAncestryGroup === 'total')
            .map((tableRowData) => {
              const exomesCombined = tableRowData.exomes.XX + tableRowData.exomes.XY
              const genomesCombined = tableRowData.genomes.XX + tableRowData.genomes.XY
              return (
                <tr>
                  <td>Total</td>
                  <td />
                  <td>{exomesCombined.toLocaleString()}</td>
                  <td>{tableRowData.exomes.XX.toLocaleString()}</td>
                  <td>{tableRowData.exomes.XY.toLocaleString()}</td>
                  <td>{genomesCombined.toLocaleString()}</td>
                  <td>{tableRowData.genomes.XX.toLocaleString()}</td>
                  <td>{tableRowData.genomes.XY.toLocaleString()}</td>
                  <td>{(exomesCombined + genomesCombined).toLocaleString()}</td>
                  <td>{(tableRowData.exomes.XX + tableRowData.genomes.XX).toLocaleString()}</td>
                  <td>{(tableRowData.exomes.XY + tableRowData.genomes.XY).toLocaleString()}</td>
                </tr>
              )
            })}
        </StatsTableFooter>
        <StatsTableCaption>
          <div>Inferred sex counts of gnomAD v4 samples per Genetic Ancestry Group</div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}

export const InferredSexNonUKBV4Table = () => {
  const elementId = 'non-ukb-inferred-sex-by-genetic-ancestry-group-table'

  return (
    <div>
      <StatsTable id={elementId}>
        <thead>
          <StatsTableHeaderRow>
            <th colSpan={2}>Genetic Ancestry</th>
            <th colSpan={3}>v4 Exomes</th>
          </StatsTableHeaderRow>
          <StatsTableSubHeaderRow>
            <th>Genetic Ancestry</th>
            <th>Genetic Ancestry </th>
            <th>Sample Count</th>
            <th>XX</th>
            <th>XY</th>
          </StatsTableSubHeaderRow>
        </thead>
        <StatsTableBody>
          {inferredSexAllV4Data.gnomADV4NonUkb
            .filter((tableRowData) => tableRowData.geneticAncestryGroup !== 'total')
            .map((tableRowData) => (
              <tr>
                <td>{populationName(tableRowData.geneticAncestryGroup)}</td>
                <td>{tableRowData.geneticAncestryGroup}</td>
                <td>{(tableRowData.exomes.XX + tableRowData.exomes.XY).toLocaleString()}</td>
                <td>{tableRowData.exomes.XX.toLocaleString()}</td>
                <td>{tableRowData.exomes.XY.toLocaleString()}</td>
              </tr>
            ))}
        </StatsTableBody>
        <StatsTableFooter>
          {inferredSexAllV4Data.gnomADV4NonUkb
            .filter((tableRowData) => tableRowData.geneticAncestryGroup === 'total')
            .map((tableRowData) => (
              <tr>
                <td>Total</td>
                <td />
                <td>{(tableRowData.exomes.XX + tableRowData.exomes.XY).toLocaleString()}</td>
                <td>{tableRowData.exomes.XX.toLocaleString()}</td>
                <td>{tableRowData.exomes.XY.toLocaleString()}</td>
              </tr>
            ))}
        </StatsTableFooter>
        <StatsTableCaption>
          <div>
            Inferred sex counts of the gnomAD v4 samples per Genetic Ancestry Group not including UK
            Bio Bank samples
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}
