import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableBody,
  StatsTableFooter,
  StatsTableCaption,
} from './TableStyles'

const StudyDiseasesInGnomadTable = () => {
  const elementId = 'study-diseases-in-gnomad-table'

  return (
    <div>
      <StatsTable id={elementId}>
        <thead>
          <StatsTableHeaderRow>
            <th>Phenotypes</th>
            <th>Case</th>
            <th>Control</th>
            <th>Unknown</th>
            <th>Total</th>
            <th>% of cases out of all v4 exomes</th>
          </StatsTableHeaderRow>
        </thead>
        <StatsTableBody>
          <tr>
            <td>Alzheimer&apos;s disease</td>
            <td>2,594</td>
            <td>665</td>
            <td>1,632</td>
            <td>4,890</td>
            <td>0.35%</td>
          </tr>
          <tr>
            <td>Atrial Fibrillation</td>
            <td>4,398</td>
            <td>3,546</td>
            <td>38,289</td>
            <td>46,233</td>
            <td>0.60%</td>
          </tr>
          <tr>
            <td>Biobank or control dataset*</td>
            <td>-</td>
            <td>24,016</td>
            <td>447,750</td>
            <td>471,766</td>
            <td>N/A</td>
          </tr>
          <tr>
            <td>Bipolar disorder</td>
            <td>19,284</td>
            <td>16,383</td>
            <td>80</td>
            <td>35,747</td>
            <td>2.64%</td>
          </tr>
          <tr>
            <td>Cardiac arrhythmia</td>
            <td>458</td>
            <td>-</td>
            <td>-</td>
            <td>458</td>
            <td>0.06%</td>
          </tr>
          <tr>
            <td>Coronary heart disease</td>
            <td>1,557</td>
            <td>-</td>
            <td>-</td>
            <td>1,557</td>
            <td>0.21%</td>
          </tr>
          <tr>
            <td>Inflammatory bowel disease spectrum and related disorders^</td>
            <td>35,008</td>
            <td>11,928</td>
            <td>280</td>
            <td>47,217</td>
            <td>4.79%</td>
          </tr>
          <tr>
            <td>Myocardial infarction</td>
            <td>11,900</td>
            <td>369</td>
            <td>-</td>
            <td>12,269</td>
            <td>1.63%</td>
          </tr>
          <tr>
            <td>Neurodevelopmental**</td>
            <td>-</td>
            <td>132</td>
            <td>-</td>
            <td>143</td>
            <td>N/A</td>
          </tr>
          <tr>
            <td>Non-specific cardiovascular disease</td>
            <td>1,888</td>
            <td>11,376</td>
            <td>15,000</td>
            <td>28,264</td>
            <td>0.26%</td>
          </tr>
          <tr>
            <td>Schizophrenia spectrum and related disorders</td>
            <td>30,278</td>
            <td>17,689</td>
            <td>39</td>
            <td>47,994</td>
            <td>4.14%</td>
          </tr>
          <tr>
            <td>Type 2 Diabetes</td>
            <td>17,506</td>
            <td>13,096</td>
            <td>3,807</td>
            <td>34,409</td>
            <td>2.39%</td>
          </tr>
        </StatsTableBody>
        <StatsTableFooter>
          <tr>
            <td>Grand Total</td>
            <td>124,871</td>
            <td>99,200</td>
            <td>506,877</td>
            <td>730,947</td>
            <td>17.08%</td>
          </tr>
        </StatsTableFooter>

        <StatsTableCaption>
          <div>
            * This category includes: GTEx, 1KG, UKBB, and the Qatar Genome Project, as well as the
            FinnGen and MGB biobank samples when no phenotype was specified
          </div>
          <div>
            {' '}
            ^ includes diseases like Crohn&apos;s disease, irritable bowel syndrome, interstitial
            cystitis, ulcerative colitis{' '}
          </div>
          <div>
            ** Neurodevelopmental controls are unaffected parents of children with confirmed or
            suspected de novo cause of their neurodevelopmental disorder
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}

export default StudyDiseasesInGnomadTable
