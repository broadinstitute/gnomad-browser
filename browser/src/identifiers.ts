const V2_STRUCTURAL_VARIANT_ID_REGEX =
  /^(BND|CPX|CTX|DEL|DUP|INS|INV|MCNV|OTH)_(\d+|X|Y)_([1-9][0-9]*)$/i

const V3_STRUCTURAL_VARIANT_ID_REGEX =
  /^(BND|CNV|CPX|CTX|DEL|DUP|INS|INV)_CHR(\d+|X|Y)_([0-9]|[a-f])+$/i

export const isStructuralVariantId = (datasetId: string, str: any) => {
  const regex =
    datasetId === 'gnomad_sv_r3' ? V3_STRUCTURAL_VARIANT_ID_REGEX : V2_STRUCTURAL_VARIANT_ID_REGEX

  const match = regex.exec(str)
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
