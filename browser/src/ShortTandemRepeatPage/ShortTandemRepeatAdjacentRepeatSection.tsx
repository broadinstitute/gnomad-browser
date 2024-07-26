import React, { SetStateAction, useState, Dispatch } from 'react'

import { Modal, Select } from '@gnomad/ui'

import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatAdjacentRepeat, ScaleType, Sex } from './ShortTandemRepeatPage'
import ShortTandemRepeatAlleleSizeDistributionPlot from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
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
import { AncestryGroupId } from '@gnomad/dataset-metadata/gnomadPopulations'
import { Bin as GenotypeBin } from './ShortTandemRepeatGenotypeDistributionPlot'

type Props = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeat
  selectedScaleType: ScaleType
  selectedAncestryGroup: AncestryGroupId | ''
  selectedSex: Sex | ''
  ancestryGroups: AncestryGroupId[]
  selectedGenotypeDistributionBin: GenotypeBin | null
  setSelectedGenotypeDistributionBin: Dispatch<SetStateAction<GenotypeBin | null>>
  setSelectedScaleType: Dispatch<SetStateAction<ScaleType>>
  setSelectedAncestryGroup: Dispatch<SetStateAction<AncestryGroupId | ''>>
  setSelectedSex: Dispatch<SetStateAction<Sex | ''>>
}

const ShortTandemRepeatAdjacentRepeatSection = ({
  adjacentRepeat,
  ancestryGroups,
  selectedScaleType,
  selectedAncestryGroup,
  selectedSex,
  setSelectedScaleType,
  setSelectedAncestryGroup,
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
          selectedAncestryGroup,
          selectedSex,
          selectedRepeatUnit,
        })}
        repeatUnitLength={selectedRepeatUnit ? selectedRepeatUnit.length : null}
        scaleType={selectedScaleType}
      />
      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-repeat-counts`}
          ancestryGroups={ancestryGroups}
          selectedAncestryGroup={selectedAncestryGroup}
          selectedSex={selectedSex}
          setSelectedAncestryGroup={setSelectedAncestryGroup}
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
          Scale: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={(e: { target: { value: ScaleType } }) => {
              setSelectedScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
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
          selectedAncestryGroup: selectedAncestryGroup,
          selectedSex: selectedSex,
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
          ancestryGroups={ancestryGroups}
          selectedAncestryGroup={selectedAncestryGroup}
          selectedSex={selectedSex}
          setSelectedAncestryGroup={setSelectedAncestryGroup}
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
            selectedAncestryGroup={selectedAncestryGroup}
            selectedSex={selectedSex}
            repeatUnitPairs={genotypeDistributionPairs}
          />
        </Modal>
      )}
    </section>
  )
}

export default ShortTandemRepeatAdjacentRepeatSection
