import { readFileSync } from 'node:fs'

type ProteinMitochondrialGeneConstraint = {
  exp_lof: number
  exp_mis: number
  exp_syn: number

  obs_lof: number
  obs_mis: number
  obs_syn: number

  oe_lof: number
  oe_lof_lower: number
  oe_lof_upper: number

  oe_mis: number
  oe_mis_lower: number
  oe_mis_upper: number

  oe_syn: number
  oe_syn_lower: number
  oe_syn_upper: number
}

type RNAMitochondrialGeneConstraint = {
  observed: number
  expected: number
  oe: number
  oe_upper: number
  oe_lower: number
}

type MitochondrialGeneConstraint =
  | ProteinMitochondrialGeneConstraint
  | RNAMitochondrialGeneConstraint

type MitochondrialRegionConstraint = {
  start: number
  stop: number
  oe: number
  oe_upper: number
  oe_lower: number
}

const emptyConstraint: MitochondrialGeneConstraint = {
  exp_lof: 0,
  exp_mis: 0,
  exp_syn: 0,

  obs_lof: 0,
  obs_mis: 0,
  obs_syn: 0,

  oe_lof: 0,
  oe_lof_lower: 0,
  oe_lof_upper: 0,

  oe_mis: 0,
  oe_mis_lower: 0,
  oe_mis_upper: 0,

  oe_syn: 0,
  oe_syn_lower: 0,
  oe_syn_upper: 0,
}

const updateProteinMitochondrialGeneConstraint = (
  previousConstraint: ProteinMitochondrialGeneConstraint,
  consequence: string,
  observed: string,
  expected: string,
  oe: string,
  lowerCI: string,
  upperCI: string
): ProteinMitochondrialGeneConstraint => {
  if (consequence === 'synonymous') {
    return {
      ...previousConstraint,
      exp_syn: Number(expected),
      obs_syn: Number(observed),
      oe_syn: Number(oe),
      oe_syn_lower: Number(lowerCI),
      oe_syn_upper: Number(upperCI),
    }
  }
  if (consequence === 'missense') {
    return {
      ...previousConstraint,
      exp_mis: Number(expected),
      obs_mis: Number(observed),
      oe_mis: Number(oe),
      oe_mis_lower: Number(lowerCI),
      oe_mis_upper: Number(upperCI),
    }
  }
  return {
    ...previousConstraint,
    exp_lof: Number(expected),
    obs_lof: Number(observed),
    oe_lof: Number(oe),
    oe_lof_lower: Number(lowerCI),
    oe_lof_upper: Number(upperCI),
  }
}

const parseMitochondrialGeneConstraintTSV = (
  rawTSV: string
): Record<string, MitochondrialGeneConstraint> =>
  rawTSV
    .split(/\n/)
    .slice(1, -1)
    .reduce((result, rowText) => {
      const [
        geneSymbol,
        _startPosition,
        _endPosition,
        consequence,
        observed,
        expected,
        oe,
        lowerCI,
        upperCI,
      ] = rowText.split('\t')
      if (consequence === 'RNA_variant') {
        const rnaConstraint: RNAMitochondrialGeneConstraint = {
          observed: Number(observed),
          expected: Number(expected),
          oe: Number(oe),
          oe_upper: Number(upperCI),
          oe_lower: Number(lowerCI),
        }
        return { ...result, [geneSymbol]: rnaConstraint }
      }

      const previousConstraint: ProteinMitochondrialGeneConstraint = result[geneSymbol]
        ? (result[geneSymbol] as ProteinMitochondrialGeneConstraint)
        : emptyConstraint

      const newConstraint = updateProteinMitochondrialGeneConstraint(
        previousConstraint,
        consequence,
        observed,
        expected,
        oe,
        lowerCI,
        upperCI
      )

      return { ...result, [geneSymbol]: newConstraint }
    }, {} as Record<string, MitochondrialGeneConstraint>)

const parseMitochondrialRegionConstraintTSV = (
  rawTSV: string,
  geneSymbols: string[]
): Record<string, MitochondrialRegionConstraint[]> => {
  const nonTRNASymbols = geneSymbols.filter((geneSymbol) => !geneSymbol.startsWith('MT-T'))
  const seed: Record<string, MitochondrialRegionConstraint[]> = nonTRNASymbols.reduce(
    (result, geneSymbol) => ({ ...result, [geneSymbol]: [] }),
    {} as Record<string, MitochondrialRegionConstraint[]>
  )

  return rawTSV
    .split(/\n/)
    .slice(1, -1)
    .reduce((result, rowText) => {
      const [
        geneSymbol,
        startPosition,
        endPosition,
        _proteinResidueStart,
        _proteinResidueEnd,
        _observed,
        _expected,
        oe,
        lowerCI,
        upperCI,
      ] = rowText.split('\t')

      const previousConstraints = result[geneSymbol] || []

      const newConstraint: MitochondrialRegionConstraint = {
        start: Number(startPosition),
        stop: Number(endPosition),
        oe: Number(oe),
        oe_upper: Number(upperCI),
        oe_lower: Number(lowerCI),
      }
      return { ...result, [geneSymbol]: [...previousConstraints, newConstraint] }
    }, seed)
}

const GENE_CONSTRAINT_FILENAME = `${process.env.PWD}/static_data/mito_gene_constraint_metrics.tsv`
const geneConstraint = parseMitochondrialGeneConstraintTSV(
  readFileSync(GENE_CONSTRAINT_FILENAME, { encoding: 'utf8' })
)

const allGeneSymbols = Object.keys(geneConstraint)

const REGION_CONSTRAINT_FILENAME = `${process.env.PWD}/static_data/mito_region_constraint_metrics.tsv`
const regionConstraint = parseMitochondrialRegionConstraintTSV(
  readFileSync(REGION_CONSTRAINT_FILENAME, { encoding: 'utf8' }),
  allGeneSymbols
)
export const resolveMitochondialGeneConstraintType = (constraint: any): string =>
  Object.prototype.hasOwnProperty.call(constraint, 'exp_lof')
    ? 'ProteinMitochondrialGeneConstraint'
    : 'RNAMitochondrialGeneConstraint'

export const resolveMitochondrialGeneConstraint = (gene: any) => {
  return geneConstraint[gene.symbol]
}

export const resolveMitochondrialRegionConstraint = (gene: any): MitochondrialRegionConstraint[] =>
  regionConstraint[gene.symbol]
