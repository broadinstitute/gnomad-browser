import { max } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Select } from '@gnomad/ui'

import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatAlleleSizeDistributionPlot from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
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

  const [
    selectedGenotypeDistributionRepeatUnits,
    setSelectedGenotypeDistributionRepeatUnits,
  ] = useState(
    adjacentRepeat.genotype_distribution.repeat_units.length === 1
      ? adjacentRepeat.genotype_distribution.repeat_units[0].repeat_units.join(' / ')
      : ''
  )

  return (
    <section style={{ marginBottom: '2em' }}>
      <h3>{adjacentRepeat.id}</h3>
      <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />

      <h4>Allele Size Distribution</h4>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={
          adjacentRepeat.allele_size_distribution.distribution[
            adjacentRepeat.allele_size_distribution.distribution.length - 1
          ][0]
        }
        alleleSizeDistribution={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedRepeatUnit
              ? adjacentRepeat.allele_size_distribution.repeat_units.find(
                  repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                ).distribution
              : adjacentRepeat.allele_size_distribution.distribution
            : (selectedRepeatUnit
                ? adjacentRepeat.allele_size_distribution.repeat_units.find(
                    repeatUnit => repeatUnit.repeat_unit === selectedRepeatUnit
                  )
                : adjacentRepeat.allele_size_distribution
              ).populations.find(pop => pop.id === selectedPopulationId).distribution
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

      <h4>Genotype Distribution</h4>
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={(() => {
          if (selectedGenotypeDistributionRepeatUnits) {
            const repeatUnits = selectedGenotypeDistributionRepeatUnits.split(' / ')
            if (repeatUnits[0] === repeatUnits[1]) {
              return adjacentRepeat.genotype_distribution.repeat_units.length === 1
                ? ['longer allele', 'shorter allele']
                : [`longer ${repeatUnits[0]} allele`, `shorter ${repeatUnits[1]} allele`]
            }
            return repeatUnits.map(repeatUnit => `${repeatUnit} allele`)
          }
          return ['longer allele', 'shorter allele']
        })()}
        maxRepeats={[
          max(adjacentRepeat.genotype_distribution.distribution, d => d[0]),
          max(adjacentRepeat.genotype_distribution.distribution, d => d[1]),
        ]}
        genotypeDistribution={
          // eslint-disable-next-line no-nested-ternary
          selectedPopulationId === ''
            ? selectedGenotypeDistributionRepeatUnits
              ? adjacentRepeat.genotype_distribution.repeat_units.find(
                  repeatUnit =>
                    repeatUnit.repeat_units.join(' / ') === selectedGenotypeDistributionRepeatUnits
                ).distribution
              : adjacentRepeat.genotype_distribution.distribution
            : (selectedGenotypeDistributionRepeatUnits
                ? adjacentRepeat.genotype_distribution.repeat_units.find(
                    repeatUnit =>
                      repeatUnit.repeat_units.join(' / ') ===
                      selectedGenotypeDistributionRepeatUnits
                  )
                : adjacentRepeat.genotype_distribution
              ).populations.find(pop => pop.id === selectedPopulationId).distribution
        }
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-genotype-distribution`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={onSelectPopulationId}
        />

        <label
          htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-genotype-distribution-repeat-units`}
        >
          Repeat units:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-genotype-distribution-repeat-units`}
            value={selectedGenotypeDistributionRepeatUnits}
            onChange={e => {
              setSelectedGenotypeDistributionRepeatUnits(e.target.value)
            }}
          >
            {adjacentRepeat.genotype_distribution.repeat_units.length > 1 && (
              <option value="">All</option>
            )}
            {adjacentRepeat.genotype_distribution.repeat_units.map(repeatUnit => {
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
