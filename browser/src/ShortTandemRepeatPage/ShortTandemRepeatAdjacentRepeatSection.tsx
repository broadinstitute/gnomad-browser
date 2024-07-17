import React, { SetStateAction, useState, Dispatch } from 'react'

import { Modal, Select } from '@gnomad/ui'

import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatAdjacentRepeat } from './ShortTandemRepeatPage'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  ScaleType,
  Sex,
  ColorBy,
} from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot, {
  Bin as GenotypeBin,
} from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionBinDetails from './ShortTandemRepeatGenotypeDistributionBinDetails'
import ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect from './ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect'
import ShortTandemRepeatAdjacentRepeatAttributes from './ShortTandemRepeatAdjacentRepeatAttributes'
import {
  getSelectedAlleleSizeDistribution,
  getSelectedGenotypeDistribution,
  getGenotypeDistributionPlotAxisLabels,
  genotypeRepunitPairs,
  maxAlleleSizeDistributionRepeats,
  maxGenotypeDistributionRepeats,
} from './shortTandemRepeatHelpers'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

type Props = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeat
  selectedScaleType: ScaleType
  selectedPopulation: PopulationId | ''
  selectedSex: Sex | ''
  selectedColorBy: ColorBy | ''
  populations: PopulationId[]
  selectedGenotypeDistributionBin: GenotypeBin | null
  setSelectedGenotypeDistributionBin: Dispatch<SetStateAction<GenotypeBin | null>>
  setSelectedScaleType: Dispatch<SetStateAction<ScaleType>>
  setSelectedPopulation: Dispatch<SetStateAction<PopulationId | ''>>
  setSelectedSex: Dispatch<SetStateAction<Sex | ''>>
}

const ShortTandemRepeatAdjacentRepeatSection = ({
  adjacentRepeat,
  populations,
  selectedScaleType,
  selectedPopulation,
  selectedSex,
  selectedColorBy,
  setSelectedScaleType,
  setSelectedPopulation,
  setSelectedSex,
}: Props) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    adjacentRepeat.repeat_units.length === 1 ? adjacentRepeat.repeat_units[0] : ''
  )

  const genotypeDistributionPairs = genotypeRepunitPairs(adjacentRepeat)
  const defaultGenotypeDistributionRepeatUnits =
    genotypeDistributionPairs.length === 1 ? genotypeDistributionPairs[0] : ''
  const [selectedGenotypeDistributionRepeatUnits, setSelectedGenotypeDistributionRepeatUnits] =
    useState<string[] | ''>(defaultGenotypeDistributionRepeatUnits)

  const [selectedGenotypeDistributionBin, setSelectedGenotypeDistributionBin] =
    useState<GenotypeBin | null>(null)

  return (
    <section style={{ marginBottom: '3em' }}>
      <h3>{adjacentRepeat.id}</h3>
      <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />

      <h4 style={{ marginBottom: '0.66em' }}>Allele Size Distribution</h4>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={maxAlleleSizeDistributionRepeats(adjacentRepeat)}
        alleleSizeDistribution={getSelectedAlleleSizeDistribution(adjacentRepeat, {
          selectedPopulation,
          selectedSex,
          selectedColorBy,
          selectedRepeatUnit,
        })}
        colorBy={selectedColorBy}
        repeatUnitLength={selectedRepeatUnit ? selectedRepeatUnit.length : null}
        scaleType={selectedScaleType}
      />
      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-repeat-counts`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}>
          Repeat unit: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}
            value={selectedRepeatUnit}
            onChange={(e: { target: { value: string } }) => {
              setSelectedRepeatUnit(e.target.value)
            }}
          >
            {adjacentRepeat.repeat_units.length > 1 && <option value="">All</option>}
            {adjacentRepeat.repeat_units.map((repeatUnit) => (
              <option key={repeatUnit} value={repeatUnit}>
                {repeatUnit === adjacentRepeat.reference_repeat_unit &&
                adjacentRepeat.repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </option>
            ))}
          </Select>
        </label>

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}>
          y-scale: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={(e: { target: { value: ScaleType } }) => {
              setSelectedScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
            <option value="linear-truncated-50">Linear: Truncated at 50</option>
            <option value="linear-truncated-200">Linear: Truncated at 200</option>
            <option value="linear-truncated-1000">Linear: Truncated at 1000</option>
          </Select>
        </label>
      </ControlSection>

      <h4 style={{ marginBottom: '0.66em' }}>Genotype Distribution</h4>
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={getGenotypeDistributionPlotAxisLabels(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
        })}
        maxRepeats={maxGenotypeDistributionRepeats(adjacentRepeat)}
        genotypeDistribution={getSelectedGenotypeDistribution(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
          selectedPopulation,
          selectedSex,
        })}
        onSelectBin={(bin: GenotypeBin) => {
          if (bin.xRange[0] !== bin.xRange[1] || bin.yRange[0] !== bin.yRange[1]) {
            setSelectedGenotypeDistributionBin(bin)
          }
        }}
        xRanges={[]}
        yRanges={[]}
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-genotype-distribution`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />

        <ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
          shortTandemRepeatOrAdjacentRepeat={adjacentRepeat}
          selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
          setSelectedRepeatUnits={setSelectedGenotypeDistributionRepeatUnits}
        />
      </ControlSection>

      {selectedGenotypeDistributionBin && (
        <Modal
          title={selectedGenotypeDistributionBin.label}
          size="large"
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; title: any; size: "larg... Remove this comment to see the full error message
          initialFocusOnButton={false}
          onRequestClose={() => {
            setSelectedGenotypeDistributionBin(null)
          }}
        >
          <ShortTandemRepeatGenotypeDistributionBinDetails
            shortTandemRepeatOrAdjacentRepeat={adjacentRepeat}
            selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
            bin={selectedGenotypeDistributionBin}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            repeatUnitPairs={genotypeDistributionPairs}
          />
        </Modal>
      )}
    </section>
  )
}

export default ShortTandemRepeatAdjacentRepeatSection
