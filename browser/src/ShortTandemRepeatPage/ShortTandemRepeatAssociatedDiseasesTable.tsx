import React from 'react'

import { BaseTable, ExternalLink } from '@gnomad/ui'

import { ShortTandemRepeat } from './ShortTandemRepeatPage'

export type ShortTandemRepeatAssociatedDisease = ShortTandemRepeat['associated_diseases'][number]

type Props =
  | {
      shortTandemRepeat: Pick<ShortTandemRepeat, 'associated_diseases'>
      associatedDiseases?: never
      showSymbols?: boolean
    }
  | {
      shortTandemRepeat?: never
      associatedDiseases: ShortTandemRepeatAssociatedDisease[]
      showSymbols?: boolean
    }

const ShortTandemRepeatAssociatedDiseasesTable = (props: Props) => {
  const associatedDiseases = props.associatedDiseases || props.shortTandemRepeat.associated_diseases
  const hasNotes = associatedDiseases.some((disease) => disease.notes)
  return (
    <BaseTable style={{ minWidth: '100%' }}>
      <thead>
        <tr>
          <th scope="col">Disease</th>
          <th scope="col">OMIM</th>
          <th scope="col">Inheritance</th>
          <th scope="col">Ranges of repeats</th>
          {hasNotes && <th scope="col">Notes</th>}
        </tr>
      </thead>
      <tbody>
        {associatedDiseases.map((disease) => {
          return (
            <tr key={`${disease.name}-${disease.symbol}`}>
              <th scope="row">
                {disease.name}
                {props.showSymbols && disease.symbol && disease.symbol !== disease.name
                  ? ` (${disease.symbol})`
                  : ''}
              </th>
              <td>
                {disease.omim_id && (
                  <ExternalLink href={`https://omim.org/entry/${disease.omim_id}`}>
                    {disease.omim_id}
                  </ExternalLink>
                )}
              </td>
              <td>{disease.inheritance_mode}</td>
              <td>
                {disease.repeat_size_classifications
                  .map((classification) => {
                    if (classification.min === null) {
                      return `${classification.classification} ≤ ${classification.max}`
                    }
                    if (classification.max === null) {
                      return `${classification.classification} ≥ ${classification.min}`
                    }
                    return `${classification.classification} ${classification.min} - ${classification.max}`
                  })
                  .join(', ')}
              </td>
              {hasNotes && <td>{disease.notes}</td>}
            </tr>
          )
        })}
      </tbody>
    </BaseTable>
  )
}

export default ShortTandemRepeatAssociatedDiseasesTable
