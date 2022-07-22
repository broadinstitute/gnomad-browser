import React from 'react'

import { BaseTable, ExternalLink } from '@gnomad/ui'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

type Props = {
  shortTandemRepeat: ShortTandemRepeatPropType
}

const ShortTandemRepeatAssociatedDiseasesTable = ({ shortTandemRepeat }: Props) => {
  const hasNotes = shortTandemRepeat.associated_diseases.some((disease) => disease.notes)
  return (
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
        {shortTandemRepeat.associated_diseases.map((disease) => {
          return (
            <tr key={disease.name}>
              <th scope="row">{disease.name}</th>
              <td>
                {disease.omim_id && (
                  // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
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
