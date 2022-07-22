const STRUCTURAL_VARIANT_ID_REGEX = /^(BND|CPX|CTX|DEL|DUP|INS|INV|MCNV|OTH)_(\d+|X|Y)_([1-9][0-9]*)$/i

export const isStructuralVariantId = (str: any) => {
  const match = STRUCTURAL_VARIANT_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[2]
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  const id = Number(match[3])
  if (id > 1e9) {
    return false
  }

  return true
}
