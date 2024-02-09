import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableSubHeaderRow,
  StatsTableBody,
  StatsTableCaption,
  StatsTableFooter,
} from './TableStyles'

export const InferredSexAllV4Table = () => {
  const elementId = 'inferred-sex-by-genetic-ancestry-group-table'

  return (
    <div>
      <StatsTable>
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
          <tr>
            {/* <td rowSpan={11}>All</td> */}
            <td>African/African American</td>
            <td>AFR</td>
            <td>16740</td>
            <td>9663</td>
            <td>7077</td>
            <td>20805</td>
            <td>11094</td>
            <td>9711</td>
            <td>37545</td>
            <td>20757</td>
            <td>16788</td>
          </tr>
          <tr>
            <td>Amish</td>
            <td>AMI</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>456</td>
            <td>235</td>
            <td>221</td>
            <td>456</td>
            <td>235</td>
            <td>221</td>
          </tr>
          <tr>
            <td>Admixed American</td>
            <td>AMR</td>
            <td>22362</td>
            <td>12845</td>
            <td>9517</td>
            <td>7657</td>
            <td>3399</td>
            <td>4258</td>
            <td>30019</td>
            <td>16244</td>
            <td>13775</td>
          </tr>
          <tr>
            <td>Ashkenazi Jewish</td>
            <td>ASJ</td>
            <td>13068</td>
            <td>6318</td>
            <td>6750</td>
            <td>1736</td>
            <td>934</td>
            <td>802</td>
            <td>14804</td>
            <td>7252</td>
            <td>7552</td>
          </tr>
          <tr>
            <td>East Asian</td>
            <td>EAS</td>
            <td>19850</td>
            <td>10356</td>
            <td>9494</td>
            <td>2598</td>
            <td>1136</td>
            <td>1462</td>
            <td>22448</td>
            <td>11492</td>
            <td>10956</td>
          </tr>
          <tr>
            <td>European (Finnish)</td>
            <td>FIN</td>
            <td>26710</td>
            <td>13824</td>
            <td>12886</td>
            <td>5316</td>
            <td>1287</td>
            <td>4029</td>
            <td>32026</td>
            <td>15111</td>
            <td>16915</td>
          </tr>
          <tr>
            <td>Middle Eastern</td>
            <td>MID</td>
            <td>2884</td>
            <td>1253</td>
            <td>1631</td>
            <td>147</td>
            <td>72</td>
            <td>75</td>
            <td>3031</td>
            <td>1325</td>
            <td>1706</td>
          </tr>
          <tr>
            <td>European (non-Finnish)</td>
            <td>NFE</td>
            <td>556006</td>
            <td>286144</td>
            <td>269862</td>
            <td>34025</td>
            <td>19683</td>
            <td>14342</td>
            <td>590031</td>
            <td>305827</td>
            <td>284204</td>
          </tr>
          <tr>
            <td>Remaining</td>
            <td>Remaining</td>
            <td>30198</td>
            <td>15900</td>
            <td>14298</td>
            <td>1058</td>
            <td>525</td>
            <td>533</td>
            <td>31256</td>
            <td>16425</td>
            <td>14831</td>
          </tr>
          <tr>
            <td>South Asian</td>
            <td>SAS</td>
            <td>43129</td>
            <td>11020</td>
            <td>32109</td>
            <td>2417</td>
            <td>577</td>
            <td>1840</td>
            <td>45546</td>
            <td>11597</td>
            <td>33949</td>
          </tr>
        </StatsTableBody>
        <StatsTableFooter>
          <tr>
            <td>Total</td>
            <td />
            <td>730947</td>
            <td>367323</td>
            <td>363624</td>
            <td>76215</td>
            <td>38942</td>
            <td>37273</td>
            <td>807162</td>
            <td>406265</td>
            <td>400897</td>
          </tr>
        </StatsTableFooter>
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
      <StatsTable>
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
          <tr>
            <td>African/African American</td>
            <td>AFR</td>
            <td>8847</td>
            <td>5143</td>
            <td>3704</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Admixed American</td>
            <td>AMR</td>
            <td>21870</td>
            <td>12520</td>
            <td>9350</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Ashkenazi Jewish</td>
            <td>ASJ</td>
            <td>10492</td>
            <td>4919</td>
            <td>5573</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>East Asian</td>
            <td>EAS</td>
            <td>18035</td>
            <td>9149</td>
            <td>8886</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>European (Finnish)</td>
            <td>FIN</td>
            <td>26572</td>
            <td>13699</td>
            <td>12873</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Middle Eastern</td>
            <td>MID</td>
            <td>2074</td>
            <td>958</td>
            <td>1116</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>European (non-Finnish)</td>
            <td>NFE</td>
            <td>175054</td>
            <td>81110</td>
            <td>93944</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Remaining</td>
            <td>Remaining</td>
            <td>16549</td>
            <td>8376</td>
            <td>8173</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>South Asian</td>
            <td>SAS</td>
            <td>34899</td>
            <td>7251</td>
            <td>27648</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </StatsTableBody>
        <StatsTableFooter>
          <tr>
            <td>Total</td>
            <td />
            <td>314392</td>
            <td>143125</td>
            <td>171267</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </StatsTableFooter>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}
