const REGION_ID_REGEX = /^(chr)?(\d+|x|y|m|mt)[-:]([0-9,]+)([-:]([0-9,]+)?)?$/i

export const isRegionId = str => {
  const match = REGION_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[2].toLowerCase()
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  const start = Number(match[3])
  const end = Number(match[5])

  if (end && end < start) {
    return false
  }

  return true
}

export const normalizeRegionId = regionId => {
  const parts = regionId.split(/[-:]/)
  const chrom = parts[0].toUpperCase().replace(/^CHR/, '')
  let start = Number(parts[1].replace(/,/g, ''))
  let end

  if (parts[2]) {
    end = Number(parts[2].replace(/,/g, ''))
  } else {
    end = start + 20
    start = Math.max(start - 20, 0)
  }

  return `${chrom}-${start}-${end}`
}

const VARIANT_ID_REGEX = /^(chr)?(\d+|x|y|m|mt)[-:]([0-9,]+)[-:]([acgt]+)[-:]([acgt]+)$/i

export const isVariantId = str => {
  const match = VARIANT_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[2].toLowerCase()
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  return true
}

export const normalizeVariantId = variantId =>
  variantId
    .toUpperCase()
    .replace(/,/g, '')
    .replace(/:/g, '-')
    .replace(/^CHR/, '')
    .replace(/-0+([1-9][0-9]*)/, '-$1')

const RSID_REGEX = /^rs\d+$/

export const isRsId = rsid => Boolean(rsid.match(RSID_REGEX))
