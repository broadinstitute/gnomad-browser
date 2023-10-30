import React from 'react'

import { Button } from '@gnomad/ui'

import {
  downloadTableAsPNG,
  StatsTable,
  StatsTableHeaderRow,
  StatsTableSubHeaderRow,
  StatsTableBody,
  StatsTableCaption,
  StatsTableFooter,
} from './TableStyles'

const GeneticAncestryGroupsByVersionTable = () => {
  const elementID = 'gnomad-genetic-ancestry-group-size-by-version-table'

  return (
    <div>
      <StatsTable id={elementID} style={{ marginBottom: '3em' }}>
        <thead>
          <StatsTableHeaderRow>
            <th>&nbsp;</th>
            <th>ExAC</th>
            <th>gnomAD v2</th>
            <th>gnomAD v3</th>
            <th colSpan={3}>gnomAD v4*</th>
          </StatsTableHeaderRow>
          <StatsTableSubHeaderRow>
            <th>&nbsp;</th>
            <th>#</th>
            <th>#</th>
            <th>#</th>
            <th>#</th>
            <th>%</th>
            <th>Fold increase from v2</th>
          </StatsTableSubHeaderRow>
        </thead>
        <StatsTableBody>
          <tr>
            <td>Admixed American</td>
            <td>5,789</td>
            <td>17,720</td>
            <td>7,647</td>
            <td>30,019</td>
            <td>3.72%</td>
            <td>1.7x</td>
          </tr>
          <tr>
            <td>African</td>
            <td>5,203</td>
            <td>12,487</td>
            <td>20,744</td>
            <td>37,545</td>
            <td>4.65%</td>
            <td>3x</td>
          </tr>
          <tr>
            <td>Ashkenazi Jewish</td>
            <td>-</td>
            <td>5,185</td>
            <td>1,736</td>
            <td>14,804</td>
            <td>1.83%</td>
            <td>2.9x</td>
          </tr>
          <tr>
            <td>East Asian</td>
            <td>4,327</td>
            <td>9,977</td>
            <td>2,604</td>
            <td>22,448</td>
            <td>2.78%</td>
            <td>2.3x</td>
          </tr>
          <tr>
            <td>European^</td>
            <td>36,667</td>
            <td>77,165</td>
            <td>39,345</td>
            <td>622,057</td>
            <td>77.07%</td>
            <td>8.1x</td>
          </tr>

          <tr>
            <td>Middle Eastern</td>
            <td>-</td>
            <td>-</td>
            <td>158</td>
            <td>3,031</td>
            <td>0.38%</td>
            <td>New</td>
          </tr>
          <tr>
            <td>Remaining Individuals^</td>
            <td>454</td>
            <td>3,614</td>
            <td>1,503</td>
            <td>31,172</td>
            <td>3.93%</td>
            <td>8.8x</td>
          </tr>
          <tr>
            <td>South Asian</td>
            <td>8,256</td>
            <td>15,308</td>
            <td>2,419</td>
            <td>45,546</td>
            <td>5.64%</td>
            <td>3x</td>
          </tr>
        </StatsTableBody>
        <StatsTableFooter>
          <tr>
            <td>Total</td>
            <td>60,706</td>
            <td>141,456</td>
            <td>76,156</td>
            <td>-</td>
            <td>807,162</td>
            <td>-</td>
          </tr>
        </StatsTableFooter>

        <StatsTableCaption>
          <div>*v4 includes all v3 samples</div>
          <div>
            ^ Due to small sample sizes Finnish was included in European and Amish was included in
            Remaining Individuals
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <Button onClick={() => downloadTableAsPNG(elementID)}>Download Table</Button>
      </div>
    </div>
  )
}

export default GeneticAncestryGroupsByVersionTable
