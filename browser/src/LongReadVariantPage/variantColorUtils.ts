/**
 * Shared color utilities for LR variant visualizations.
 * Single source of truth: both the SVG summary track (CSS strings)
 * and the DeckGL haplotype track (RGBA tuples) use these functions.
 */

import { scaleLinear, scaleLog } from 'd3-scale'
import { ALLELE_TYPE_COLORS } from './variantUtils'
import { SUPERPOPULATION_COLORS } from '../Haplotypes/colors'

// --- Color mode registry ---

export type ColorMode = 'sv_type' | 'allele' | 'position' | 'af' | 'haplotype_count' | 'population'

export const COLOR_MODES: { value: string; label: string }[] = [
  { value: 'sv_type', label: 'Variant Type' },
  { value: 'allele', label: 'Allele Fingerprint' },
  { value: 'position', label: 'Position' },
  { value: 'af', label: 'Allele Frequency' },
  { value: 'haplotype_count', label: 'Haplotype Count' },
]

// --- CSS ↔ RGBA conversion helpers ---

export function hslToRgba(hsl: string, alpha = 255): [number, number, number, number] {
  const match = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/)
  if (!match) return hexToRgba(hsl, alpha)
  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), alpha]
}

export function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b, alpha]
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
      alpha,
    ]
  }
  return [128, 128, 128, alpha]
}

export function cssColorToRgba(color: string, alpha = 255): [number, number, number, number] {
  if (!color) return [128, 128, 128, alpha]
  if (color.startsWith('hsl')) return hslToRgba(color, alpha)
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), alpha]
    }
  }
  if (color.startsWith('#')) return hexToRgba(color, alpha)
  return [128, 128, 128, alpha]
}

// --- Core color computations (return CSS strings) ---

const hashColorCache: Record<string, string> = {}

export function getColorByHashCSS(variantId: string): string {
  if (!hashColorCache[variantId]) {
    const variantHash = variantId
      .split('')
      .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    const randomFactor = Math.sin(variantHash - 3.14) * 10000
    const hash = (variantHash * 9301 + 49297 + randomFactor) % 233280
    const hue = Math.floor(Math.abs(hash)) % 360
    const saturation = 60 + (Math.floor(Math.abs(hash)) % 40)
    const lightness = 30 + (Math.floor(Math.abs(hash)) % 40)
    hashColorCache[variantId] = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }
  return hashColorCache[variantId]
}

export function getColorByPositionCSS(
  position: number,
  minPos: number,
  maxPos: number
): string {
  const fraction = (position - minPos) / (maxPos - minPos || 1)
  const hue = Math.round(240 * (1 - fraction))
  return `hsl(${hue}, 100%, 50%)`
}

export function getColorByAfCSS(af: number): string {
  const afScale = scaleLog<string>().domain([0.1, 1]).range(['#d3d3d3', '#424242']).clamp(true)
  return afScale(af)
}

export function getColorByHaplotypeCountCSS(
  locusCount: number,
  totalGroups: number
): string {
  const scale = scaleLinear<string>()
    .domain([0, totalGroups])
    .range(['#d3d3d3', '#ff0000'])
    .clamp(true)
  return scale(locusCount)
}

export function getColorBySvTypeCSS(alleleType: string): string {
  return ALLELE_TYPE_COLORS[(alleleType || '').toLowerCase()] || '#888888'
}

// --- RGBA variants (for DeckGL / WebGL) ---

const hashRgbaCache: Record<string, [number, number, number, number]> = {}

export function getColorByHashRGBA(variantId: string): [number, number, number, number] {
  if (!hashRgbaCache[variantId]) {
    hashRgbaCache[variantId] = hslToRgba(getColorByHashCSS(variantId))
  }
  return hashRgbaCache[variantId]
}

export function getColorByPositionRGBA(
  position: number,
  minPos: number,
  maxPos: number
): [number, number, number, number] {
  return hslToRgba(getColorByPositionCSS(position, minPos, maxPos))
}

export function getColorByAfRGBA(af: number): [number, number, number, number] {
  return cssColorToRgba(getColorByAfCSS(af))
}

export function getColorByHaplotypeCountRGBA(
  locusCount: number,
  totalGroups: number
): [number, number, number, number] {
  return cssColorToRgba(getColorByHaplotypeCountCSS(locusCount, totalGroups))
}

export function getColorBySvTypeRGBA(alleleType: string): [number, number, number, number] {
  return cssColorToRgba(getColorBySvTypeCSS(alleleType))
}

// --- Variant-level color options (for use in both tracks) ---

type SampleMeta = { subpopulation: string; superpopulation: string }

type VariantColorOptions = {
  start: number
  stop: number
  sampleMetadata?: Map<string, SampleMeta>
  group?: { samples: { sample_id: string }[] }
  locusCount?: number
  totalGroups?: number
}

/**
 * Master CSS color function for a variant given a color mode.
 * Used by summary track SVG bands.
 */
export function getVariantCssColor(
  variant: { variant_id: string; pos: number; allele_type: string; freq?: any },
  colorMode: string,
  options: VariantColorOptions
): string {
  switch (colorMode) {
    case 'allele':
      return getColorByHashCSS(variant.variant_id)
    case 'position':
      return getColorByPositionCSS(variant.pos, options.start, options.stop)
    case 'af': {
      const af = variant.freq?.all?.af ?? variant.freq?.af ?? 0
      return getColorByAfCSS(af)
    }
    case 'haplotype_count':
      return getColorByHaplotypeCountCSS(options.locusCount ?? 0, options.totalGroups ?? 1)
    case 'population': {
      if (!options.sampleMetadata || !options.group) return '#333333'
      let maxPop = 'N/A'
      let maxCount = 0
      const counts: Record<string, number> = {}
      for (const s of options.group.samples) {
        const meta: SampleMeta | undefined = options.sampleMetadata.get(s.sample_id)
        const pop = meta?.superpopulation || 'N/A'
        counts[pop] = (counts[pop] || 0) + 1
        if (counts[pop] > maxCount) {
          maxCount = counts[pop]
          maxPop = pop
        }
      }
      return SUPERPOPULATION_COLORS[maxPop] || SUPERPOPULATION_COLORS['N/A']
    }
    case 'sv_type':
    default:
      return getColorBySvTypeCSS(variant.allele_type)
  }
}

/**
 * Master RGBA color function for a variant given a color mode.
 * Used by DeckGL haplotype track.
 */
export function getVariantRgbaColor(
  variant: { variant_id: string; pos: number; allele_type: string; freq?: any },
  colorMode: string,
  options: VariantColorOptions
): [number, number, number, number] {
  switch (colorMode) {
    case 'allele':
      return getColorByHashRGBA(variant.variant_id)
    case 'position':
      return getColorByPositionRGBA(variant.pos, options.start, options.stop)
    case 'af': {
      const af = variant.freq?.all?.af ?? variant.freq?.af ?? 0
      return getColorByAfRGBA(af)
    }
    case 'haplotype_count':
      return getColorByHaplotypeCountRGBA(options.locusCount ?? 0, options.totalGroups ?? 1)
    case 'population': {
      if (!options.sampleMetadata || !options.group) return [51, 51, 51, 255]
      let maxPop = 'N/A'
      let maxCount = 0
      const counts: Record<string, number> = {}
      for (const s of options.group.samples) {
        const meta: SampleMeta | undefined = options.sampleMetadata.get(s.sample_id)
        const pop = meta?.superpopulation || 'N/A'
        counts[pop] = (counts[pop] || 0) + 1
        if (counts[pop] > maxCount) {
          maxCount = counts[pop]
          maxPop = pop
        }
      }
      return cssColorToRgba(SUPERPOPULATION_COLORS[maxPop] || SUPERPOPULATION_COLORS['N/A'])
    }
    case 'sv_type':
    default:
      return cssColorToRgba(getColorBySvTypeCSS(variant.allele_type))
  }
}
