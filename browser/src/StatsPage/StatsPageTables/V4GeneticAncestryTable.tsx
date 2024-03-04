import React from 'react'

import { DownloadElementAsPNGButton } from '../DownloadFigure'

import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableSubHeaderRow,
  StatsTableBody,
  StatsTableCaption,
} from './TableStyles'

const V4GeneticAncestryTable = () => {
  const elementId = 'v4-genetic-ancestry-group-size-table'

  return (
    <div>
      <StatsTable id={elementId}>
        <thead>
          <StatsTableHeaderRow>
            <th style={{ width: '15%' }}>Imputed Genetic Ancestry Group for v4</th>
            <th style={{ width: '15%' }}># of individuals</th>
            <th style={{ width: '20%' }}>
              <span>Study-provided* labels</span>
              <div style={{ fontSize: '0.65em' }}>
                {' '}
                (% of imputed genetic ancestry group with self-reported or research assigned label)
              </div>
            </th>
            <th style={{ width: '50%' }}>{`Study-provided* labels that make up <1%`}</th>
          </StatsTableHeaderRow>
          <StatsTableSubHeaderRow>
            <th>
              <i>Genetically Derived</i>
            </th>
            <th>
              <i>#</i>
            </th>
            <th>
              <i>Self-reported or researcher assigned</i>
            </th>
            <th>
              <i>Self-reported or researcher assigned</i>
            </th>
          </StatsTableSubHeaderRow>
        </thead>
        <StatsTableBody>
          <tr>
            <td>Admixed American (AMR)</td>
            <td>30,019</td>
            <td>
              <div>Mexican (24.70%)</div>
              <div>Costa Rican (8.54%)</div>
              <div>Latino (8.52%)</div>
              <br />
              <div>No label provided (53.86%)</div>
            </td>
            <td>
              Black, British, Colombian, Do not Know, Dutch, Finnish, French Canadian, Hawaiian,
              Indigenous American, Karitiana, Maya, Mexican-American, Mixed, Other, Other Mixed,
              Other white, Peruvian, Pima, Prefer not to answer, Puerto Rican, Rapa Nui from Easter
              Island, Surui, White, White and Asian, White and Black Caribbean
            </td>
          </tr>
          <tr>
            <td>African/African American (AFR)</td>
            <td>37,545</td>
            <td>
              <div>Caribbean (9.49%)</div>
              <div>African (7.36%)</div>
              <div>Other (1.97%)</div>
              <div>Black (1.66%)</div>
              <br />
              <div>No label provided (75.06%)</div>
            </td>
            <td>
              African / Pygmy, African American, African Caribbean, African-American, Asian, Bantu
              Kenya, Bantu S Africa, Biaka Pygmy, Black or Black British, British, Costa Rican, Do
              not Know, Esan, Finnish, French Canadian, Gambian, Indigenous American, Latino, Luhya,
              Mandenka, Mbuti Pygmy, Mende, Mexican, Mixed, Mozabite, Other Asian, Other Black,
              Other Mixed, Prefer not to answer, Puerto Rican, Qatari, San, South Asian, Sub-Saharan
              African, White, White and Asian, White and Black African, White and Black Caribbean,
              Yoruba
            </td>
          </tr>
          <tr>
            <td>Amish (AMI)</td>
            <td>456</td>
            <td>
              <p>No label provided (100.00%)</p>
            </td>
            <td>-</td>
          </tr>
          <tr>
            <td>Ashkenazi Jewish (ASJ)</td>
            <td>14,804</td>
            <td>
              <div>British (10.23%)</div>
              <div>Other white (5.57%)</div>
              <div>White (4.67%)</div>
              <div>Other (1.28%)</div>
              <br />
              <div>No label provided (77.63%)</div>
            </td>
            <td>
              Asian, Costa Rican, Do not Know, Dutch, Finnish, French Canadian, Irish, Not Hispanic
              or Latino, Other Mixed, Prefer not to answer
            </td>
          </tr>
          <tr>
            <td>East Asian (EAS)</td>
            <td>22,448</td>
            <td>
              <div>Japanese (19.99%)</div>
              <div>Chinese (5.90%)</div>
              <div>Other (1.43%)</div>
              <div>Asian (1.35%)</div>
              <br />
              <div>No label provided (67.94%)</div>
            </td>
            <td>
              Asian or Asian British, British, Cambodian, Chinese Dai, Costa Rican, Dai, Daur, Do
              not Know, Finnish, French Canadian, Han, Han Chinese, Hezhen, Indigenous American,
              Kinh, Lahu, Miaozu, Mixed, Mongola, Naxi, Oroqen, Other Asian, Other Mixed, Prefer not
              to answer, She, Southern Han Chinese, Tu, Tujia, Uygur, White, White and Asian, Xibo,
              Yakut, Yizu
            </td>
          </tr>
          <tr>
            <td>Finnish (FIN)</td>
            <td>32,026</td>
            <td>
              <div>Finnish (81.20%)</div>
              <br />
              <div>No label provided (18.31%)</div>
            </td>
            <td>British, Estonian, Other, Other white, Swedish, White</td>
          </tr>
          <tr>
            <td>Middle Eastern (MID)</td>
            <td>3,031</td>
            <td>
              <div>Other (16.07%)</div>
              <div>Bedouin (13.89%)</div>
              <div>Arab (5.386%)</div>
              <div>Persian (4.55%)</div>
              <div>Other white (4.06%)</div>
              <div>Other Asian (3.73%)</div>
              <div>Qatari (2.94%)</div>
              <div>White (2.73%)</div>
              <div>Palestinian (1.09%)</div>
              <div>French Canadian (1.06%)</div>
              <br />
              <div>No label provided (38.677%)</div>
            </td>
            <td>
              Asian, Asian or Asian British, British, Do not Know, Druze, Dutch, European, Finnish,
              German, Indian, Mixed, Mozabite, Other Mixed, Pakistani, Prefer not to answer, South
              Asian, Sub-Saharan African, White and Asian, White and Black African
            </td>
          </tr>
          <tr>
            <td>Non-Finnish European (NFE)</td>
            <td>590,031</td>
            <td>
              <div>British (60.63%)</div>
              <div>Other white (2.02%)</div>
              <div>White (1.871%)</div>
              <div>Irish (1.50%)</div>
              <br />
              <div>No label provided (32.40%)</div>
            </td>
            <td>
              Adygei, American Indian, Asian or Asian British, Basque, Black, Black or Black
              British, Chinese, Costa Rican, Do not Know, Dutch, English, English_Scottish,
              Estonian, European, Finnish, French, French Acadian, French Acadian_French Quebecois,
              French Acadian_Scottish, French Canadian, German, German_Irish,
              German/English_Scottish, Iberian, Indian, Indigenous American, Irish_French Acadian,
              Irish_French Quebecois, Irish_Scottish, Italian, Latino, Mexican, Mixed, Native
              Hawaiian, Not Hispanic or Latino, Orcadian, Other, Other Asian, Other Mixed, Persian,
              Prefer not to answer, Qatari, Russian, Sardinian, Scottish, Scottish_English,
              Scottish_European French, Scottish_German, Scottish_Irish, Swedish, Toscani, Utah
              Residents (European Ancestry), White and Asian, White and Black African, White and
              Black Caribbean
            </td>
          </tr>
          <tr>
            <td>Remaining Individuals (RMI)</td>
            <td>31,256</td>
            <td>
              <div>British (21.79%)</div>
              <div>Irish (6.45%)</div>
              <div>Other (3.33%)</div>
              <div>Other white (3.23%)</div>
              <div>White (3.13%)</div>
              <div>Finnish (2.61%)</div>
              <div>White and Asian (1.91%)</div>
              <div>Other Mixed (1.61%)</div>
              <div>Other Asian (1.38%)</div>
              <br />
              <div>No label provided (48.26%)</div>
            </td>
            <td>
              African, African American, African-American, Asian, Asian or Asian British,
              Bangladeshi, Bedouin, Black, Black or Black British, Cambodian, Caribbean, Chinese,
              Colombian, Costa Rican, Do not Know, Druze, Dutch, Estonian, French Canadian, Hazara,
              Hispanic, Indian, Indigenous American, Japanese, Latino, Melanesian, Mexican, Mixed,
              Mozabite, Native Hawaiian, Not Hispanic or Latino, Other Black, Pakistani,
              Palestinian, Papuan, Persian, Prefer not to answer, Puerto Rican, Qatari, South Asian,
              Sub-Saharan African, Uygur, White and Black African, White and Black Caribbean, Yakut
            </td>
          </tr>
          <tr>
            <td>South Asian (SAS)</td>
            <td>45,546</td>
            <td>
              <div>South Asian (61.38%)</div>
              <div>Indian (10.63%)</div>
              <div>Pakistani (5.79%)</div>
              <div>Other Asian (1.97%)</div>
              <br />
              <div>No label provided (16.47%)</div>
            </td>
            <td>
              African, Asian, Asian or Asian British, Balochi, Bangladeshi, Bengali, Black, Brahui,
              British, Burusho, Caribbean, Chinese, Do not Know, Dutch, Finnish, French Canadian,
              Gujarati, Hazara, Indian Telugu, Kalash, Makrani, Mixed, Other, Other Black, Other
              Mixed, Other white, Pathan, Prefer not to answer, Punjabi, Qatari, Sindhi, Sri Lankan
              Tamil, Uygur, White, White and Asian, White and Black Caribbean
            </td>
          </tr>
        </StatsTableBody>
        <StatsTableCaption>
          <div>
            *Study-provided labels are the descriptions given to the gnomAD team in the accompanying
            metadata. These labels can sometime be assigned at the study-level, others are provided
            at the individual level.
          </div>
          <br />
          <div>
            These labels are also a mix of researcher assigned, sometimes participant self reported.
            None of these labels are used for training our imputed ancestry data.
          </div>
        </StatsTableCaption>
      </StatsTable>
      <div>
        <DownloadElementAsPNGButton elementId={elementId} />
      </div>
    </div>
  )
}

export default V4GeneticAncestryTable
