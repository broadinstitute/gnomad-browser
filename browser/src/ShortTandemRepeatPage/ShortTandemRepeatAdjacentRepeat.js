import { max } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Select } from '@gnomad/ui'

import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatRepeatCountsPlot from './ShortTandemRepeatRepeatCountsPlot'
import ShortTandemRepeatRepeatCooccurrencePlot from './ShortTandemRepeatRepeatCooccurrencePlot'
import ShortTandemRepeatAdjacentRepeatAttributes from './ShortTandemRepeatAdjacentRepeatAttributes'

const ShortTandemRepeatAdjacentRepeat = ({
  adjacentRepeat,
  populationIds,
  selectedPopulationId,
  onSelectPopulationId,
  selectedScaleType,
  onSelectScaleType,
}) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    adjacentRepeat.repeat_units.length === 1 ? adjacentRepeat.repeat_units[0] : ''
  )

  const [selectedCooccurrenceRepeatUnits, setSelectedCooccurrenceRepeatUnits] = useState(
    adjacentRepeat.repeat_cooccurrence.repeat_units.length === 1
      ? adjacentRepeat.repeat_cooccurrence.repeat_units[0].repeat_units.join(' / ')
      : ''
  )

  return (
    <section style={{ marginBottom: '2em' }}>
      <h3>{adjacentRepeat.id}</h3>
      <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />

      <h4>Repeat Counts</h4>
      <ShortTandemRepeatRepeatCountsPlot
        maxRepeats={
          adjacentRepeat.repeat_counts.total[adjacentRepeat.repeat_counts.total.length - 1][0]
        }
        repeats={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedRepeatUnit
              ? adjacentRepeat.repeat_counts.repeat_units.find(
                  repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                ).repeats
              : adjacentRepeat.repeat_counts.total
            : (selectedRepeatUnit
                ? adjacentRepeat.repeat_counts.repeat_units.find(
                    repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                  )
                : adjacentRepeat.repeat_counts
              ).populations.find(pop => pop.id === selectedPopulationId).repeats
        }
        repeatUnitLength={selectedRepeatUnit ? selectedRepeatUnit.length : null}
        scaleType={selectedScaleType}
      />
      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-repeat-counts`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={onSelectPopulationId}
        />

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}>
          Repeat unit:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}
            value={selectedRepeatUnit}
            onChange={e => {
              setSelectedRepeatUnit(e.target.value)
            }}
          >
            {adjacentRepeat.repeat_units.length > 1 && <option value="">All</option>}
            {adjacentRepeat.repeat_units.map(repeatUnit => (
              <option key={repeatUnit} value={repeatUnit}>
                {repeatUnit}
              </option>
            ))}
          </Select>
        </label>

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}>
          Scale:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={e => {
              onSelectScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
          </Select>
        </label>
      </ControlSection>

      <h4>Repeat Count Co-occurrence</h4>
      <ShortTandemRepeatRepeatCooccurrencePlot
        maxRepeats={[
          max(adjacentRepeat.repeat_cooccurrence.total, d => d[0]),
          max(adjacentRepeat.repeat_cooccurrence.total, d => d[1]),
        ]}
        repeatCooccurrence={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedCooccurrenceRepeatUnits
              ? adjacentRepeat.repeat_cooccurrence.repeat_units.find(
                  repeatUnit =>
                    repeatUnit.repeat_units.join(' / ') === selectedCooccurrenceRepeatUnits
                ).repeats
              : adjacentRepeat.repeat_cooccurrence.total
            : (selectedCooccurrenceRepeatUnits
                ? adjacentRepeat.repeat_cooccurrence.repeat_units.find(
                    repeatUnit =>
                      repeatUnit.repeat_units.join(' / ') === selectedCooccurrenceRepeatUnits
                  )
                : adjacentRepeat.repeat_cooccurrence
              ).populations.find(pop => pop.id === selectedPopulationId).repeats
        }
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-repeat-cooccurrence`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={onSelectPopulationId}
        />

        <label
          htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-cooccurrence-repeat-units`}
        >
          Repeat units:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-cooccurrence-repeat-units`}
            value={selectedCooccurrenceRepeatUnits}
            onChange={e => {
              setSelectedCooccurrenceRepeatUnits(e.target.value)
            }}
          >
            {adjacentRepeat.repeat_cooccurrence.repeat_units.length > 1 && (
              <option value="">All</option>
            )}
            {adjacentRepeat.repeat_cooccurrence.repeat_units.map(repeatUnit => {
              const value = repeatUnit.repeat_units.join(' / ')
              return (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            })}
          </Select>
        </label>
      </ControlSection>
    </section>
  )
}

ShortTandemRepeatAdjacentRepeat.propTypes = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType.isRequired,
  populationIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedPopulationId: PropTypes.string.isRequired,
  onSelectPopulationId: PropTypes.func.isRequired,
  selectedScaleType: PropTypes.string.isRequired,
  onSelectScaleType: PropTypes.func.isRequired,
}

export default ShortTandemRepeatAdjacentRepeat
