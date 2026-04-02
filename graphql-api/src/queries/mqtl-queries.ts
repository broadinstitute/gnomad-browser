import { fetchHaplotypeVariantsForRegion, fetchMethylationForRegion } from './haplotype-queries'
import logger from '../logger'

// --- Minimal statistics functions (no external dependency) ---

// Regularized incomplete beta function via continued fraction (Lentz's method)
function betacf(a: number, b: number, x: number): number {
  const maxIter = 200
  const eps = 3e-7
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m
    // even step
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c
    // odd step
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < eps) break
  }
  return h
}

function lnGamma(z: number): number {
  const g = 7
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  }
  z -= 1
  let x = coef[0]
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i)
  }
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function ibeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

// Student's t CDF
function studentTCdf(t: number, df: number): number {
  const x = df / (df + t * t)
  const p = 0.5 * ibeta(df / 2, 0.5, x)
  return t >= 0 ? 1 - p : p
}

// Two-tailed p-value from t-statistic
function tTestPValue(t: number, df: number): number {
  return 2 * studentTCdf(-Math.abs(t), df)
}

// --- mQTL computation ---

type MQTLResult = {
  variant_id: string
  variant_pos: number
  cpg_pos: number
  p_value: number
  effect_size: number
  carrier_count: number
  non_carrier_count: number
}

export const fetchMQTLAssociations = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number,
  minAf: number,
  maxDistance: number,
  minCarriers: number
): Promise<MQTLResult[]> => {
  logger.info(`mQTL: fetching variants and methylation for ${chrom}:${start}-${stop}`)

  // Fetch variants and all-sample methylation in parallel
  const [variants, methylationRaw] = await Promise.all([
    fetchHaplotypeVariantsForRegion(esClient, chrom, start, stop),
    fetchMethylationForRegion(esClient, chrom, start, stop, undefined),
  ])

  logger.info(`mQTL: ${variants.length} variants, ${methylationRaw.length} methylation records`)

  if (variants.length === 0 || methylationRaw.length === 0) return []

  // Group methylation by CpG position -> sample -> methylation value
  const methByCpg = new Map<number, Map<string, number[]>>()
  for (const rec of methylationRaw as any[]) {
    const pos = Number(rec.pos1)
    if (!methByCpg.has(pos)) methByCpg.set(pos, new Map())
    const sampleMap = methByCpg.get(pos)!
    if (!sampleMap.has(rec.sample)) sampleMap.set(rec.sample, [])
    sampleMap.get(rec.sample)!.push(Number(rec.methylation))
  }

  // Average methylation per sample per CpG
  const methAvgByCpg = new Map<number, Map<string, number>>()
  for (const [pos, sampleMap] of methByCpg) {
    const avgMap = new Map<string, number>()
    for (const [sample, vals] of sampleMap) {
      avgMap.set(sample, vals.reduce((a, b) => a + b, 0) / vals.length)
    }
    methAvgByCpg.set(pos, avgMap)
  }

  // Build carrier sets per variant
  // Group variants by position to get per-variant carrier info
  const variantCarriers = new Map<string, { pos: number; carriers: Set<string>; nonCarriers: Set<string> }>()
  const allSamples = new Set<string>()

  for (const v of variants as any[]) {
    const sampleId = v.sample_id
    allSamples.add(sampleId)
    const varId = `${v.chrom}-${v.position}-${v.ref}-${v.alt}`
    if (!variantCarriers.has(varId)) {
      variantCarriers.set(varId, { pos: Number(v.position), carriers: new Set(), nonCarriers: new Set() })
    }
    const gtAlleles = v.gt_alleles
    if (Array.isArray(gtAlleles) && gtAlleles.includes(1)) {
      variantCarriers.get(varId)!.carriers.add(sampleId)
    }
  }

  // Fill non-carriers
  for (const [, info] of variantCarriers) {
    for (const s of allSamples) {
      if (!info.carriers.has(s)) {
        info.nonCarriers.add(s)
      }
    }
  }

  // Filter by min AF and min carriers
  const totalSamples = allSamples.size
  const filteredVariants: [string, { pos: number; carriers: Set<string>; nonCarriers: Set<string> }][] = []
  for (const [varId, info] of variantCarriers) {
    const af = info.carriers.size / totalSamples
    if (af >= minAf && info.carriers.size >= minCarriers) {
      filteredVariants.push([varId, info])
    }
  }

  logger.info(`mQTL: ${filteredVariants.length} variants pass AF/carrier filters`)

  const cpgPositions = Array.from(methAvgByCpg.keys()).sort((a, b) => a - b)
  const results: MQTLResult[] = []

  // For each variant, test against nearby CpGs
  for (const [varId, varInfo] of filteredVariants) {
    for (const cpgPos of cpgPositions) {
      if (Math.abs(cpgPos - varInfo.pos) > maxDistance) continue

      const cpgSamples = methAvgByCpg.get(cpgPos)!
      const carrierVals: number[] = []
      const nonCarrierVals: number[] = []

      for (const [sample, methVal] of cpgSamples) {
        if (varInfo.carriers.has(sample)) {
          carrierVals.push(methVal)
        } else {
          nonCarrierVals.push(methVal)
        }
      }

      if (carrierVals.length < 2 || nonCarrierVals.length < 2) continue

      // Welch's t-test
      const n1 = carrierVals.length
      const n2 = nonCarrierVals.length
      const mean1 = carrierVals.reduce((a, b) => a + b, 0) / n1
      const mean2 = nonCarrierVals.reduce((a, b) => a + b, 0) / n2
      const var1 = carrierVals.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1)
      const var2 = nonCarrierVals.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1)

      if (var1 === 0 && var2 === 0) continue

      const se = Math.sqrt(var1 / n1 + var2 / n2)
      if (se === 0) continue

      const t = (mean1 - mean2) / se
      const dfNum = (var1 / n1 + var2 / n2) ** 2
      const dfDen = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)
      if (dfDen === 0) continue
      const df = dfNum / dfDen

      const pValue = tTestPValue(t, df)
      const effectSize = (mean1 - mean2) * 100 // percentage difference

      results.push({
        variant_id: varId,
        variant_pos: varInfo.pos,
        cpg_pos: cpgPos,
        p_value: pValue,
        effect_size: effectSize,
        carrier_count: n1,
        non_carrier_count: n2,
      })
    }
  }

  // Sort by p-value and return top 500
  results.sort((a, b) => a.p_value - b.p_value)
  const topResults = results.slice(0, 500)

  logger.info(`mQTL: ${results.length} total associations, returning top ${topResults.length}`)
  return topResults
}
