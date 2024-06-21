import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import inferredSexAllV4Data from './InferredSexPerGeneticAncestryData.json'

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
            <th className="rb">Genetic Ancestry </th>
            <th>Sample Count</th>
            <th>XX</th>
            <th className="rb">XY</th>
            <th>Sample Count</th>
            <th>XX</th>
            <th className="rb">XY</th>
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
                  <td className="rb">{tableRowData.geneticAncestryGroup}</td>
                  <td>{renderNumberOrDash(exomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XX)}</td>
                  <td className="rb">{renderNumberOrDash(tableRowData.exomes.XY)}</td>
                  <td>{renderNumberOrDash(genomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.genomes.XX)}</td>
                  <td className="rb">{renderNumberOrDash(tableRowData.genomes.XY)}</td>
                  <td>{renderNumberOrDash(exomesCombined + genomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XX + tableRowData.genomes.XX)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XY + tableRowData.genomes.XY)}</td>
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
                  <td>{renderNumberOrDash(exomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XX)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XY)}</td>
                  <td>{renderNumberOrDash(genomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.genomes.XX)}</td>
                  <td>{renderNumberOrDash(tableRowData.genomes.XY)}</td>
                  <td>{renderNumberOrDash(exomesCombined + genomesCombined)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XX + tableRowData.genomes.XX)}</td>
                  <td>{renderNumberOrDash(tableRowData.exomes.XY + tableRowData.genomes.XY)}</td>
                </tr>
              )
            })}
        </StatsTableFooter>
        <StatsTableCaption>
          <div>Inferred sex counts of gnomAD v4 samples per genetic ancestry group</div>
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
            <th className="rb">Genetic Ancestry </th>
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
                <td className="rb">{tableRowData.geneticAncestryGroup}</td>
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
            Inferred sex counts of the gnomAD v4 samples per genetic ancestry group not including UK
            Biobank samples
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}
