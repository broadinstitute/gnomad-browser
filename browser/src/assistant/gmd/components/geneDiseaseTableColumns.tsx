import React from 'react'
import { Cell } from '../../../tableCells'
import { makeStringCompareFunction } from '../../../VariantList/sortUtilities'
import { ExternalLink } from '@gnomad/ui'

const getMondoId = (curie: string) => curie.replace('MONDO:', '')

const geneDiseaseTableColumns = [
  {
    key: 'disease_title',
    heading: 'Disease',
    minWidth: 250,
    compareFunction: makeStringCompareFunction('disease_title'),
    render: (row: any) => (
      <Cell>
        <ExternalLink href={`http://monarchinitiative.org/disease/${getMondoId(row.disease_curie)}`}>
          {row.disease_title}
        </ExternalLink>
      </Cell>
    ),
  },
  {
    key: 'classification',
    heading: 'Classification',
    minWidth: 120,
    compareFunction: makeStringCompareFunction('classification'),
    render: (row: any) => <Cell>{row.classification}</Cell>,
  },
  {
    key: 'mode_of_inheritance',
    heading: 'Inheritance',
    minWidth: 120,
    compareFunction: makeStringCompareFunction('mode_of_inheritance'),
    render: (row: any) => <Cell>{row.mode_of_inheritance || 'N/A'}</Cell>,
  },
  {
    key: 'submitter',
    heading: 'Source',
    minWidth: 100,
    compareFunction: makeStringCompareFunction('submitter'),
    render: (row: any) => <Cell>{row.submitter}</Cell>,
  },
]

export default geneDiseaseTableColumns
