export default (onHeaderClick, width, currentChromosome) => {
  const mediumSize = width < 900

  const tableConfig = {
    fields: [
      {
        dataKey: 'variant_id',
        title: 'Variant ID',
        dataType: 'variantId',
        grow: 1,
        minWidth: 130,
        onHeaderClick,
      },
      {
        dataKey: 'datasets',
        title: 'Source',
        dataType: 'datasets',
        minWidth: 80,
        onHeaderClick,
      },
      {
        dataKey: 'hgvs',
        title: 'Consequence',
        dataType: 'string',
        grow: 1,
        minWidth: 140,
        onHeaderClick,
        searchable: true,
      },
      {
        dataKey: 'consequence',
        title: 'Annotation',
        dataType: 'consequence',
        minWidth: 110,
        onHeaderClick,
      },
      {
        dataKey: 'flags',
        title: 'Flags',
        dataType: 'flags',
        minWidth: 100,
        onHeaderClick,
      },
      {
        dataKey: 'allele_count',
        title: width < 600 ? 'AC' : 'Allele Count',
        dataType: 'integer',
        minWidth: width < 600 ? 55 : 90,
        onHeaderClick,
      },
      {
        dataKey: 'allele_num',
        title: width < 600 ? 'AN' : 'Allele Number',
        dataType: 'integer',
        minWidth: width < 600 ? 55 : 90,
        onHeaderClick,
      },
      {
        dataKey: 'allele_freq',
        title: width < 600 ? 'AF' : 'Allele Frequency',
        dataType: 'alleleFrequency',
        minWidth: width < 600 ? 55 : 90,
        onHeaderClick,
      },
    ],
  }

  if (currentChromosome !== 'Y') {
    tableConfig.fields.push({
      dataKey: 'hom_count',
      title: width < 600 ? 'No. Hom' : 'Number of Homozygotes',
      dataType: 'integer',
      minWidth: width < 600 ? 55 : 90,
      onHeaderClick,
    })
  }

  if (currentChromosome === 'X' || currentChromosome === 'Y') {
    tableConfig.fields.push({
      dataKey: currentChromosome === 'Y' ? 'allele_count' : 'hemi_count',
      title: width < 600 ? 'No. Hem' : 'Number of Hemizygotes',
      dataType: 'integer',
      minWidth: 55,
      onHeaderClick,
    })
  }

  const minTableWidth = tableConfig.fields.reduce((sum, f) => sum + f.minWidth + 20, 0)

  const totalGrowthFactors = tableConfig.fields.reduce((sum, f) => sum + (f.grow || 0), 0) || 1

  const remainingWidth = Math.max(width - minTableWidth, 0)

  tableConfig.width = Math.max(minTableWidth, width)

  tableConfig.fields = tableConfig.fields.map(f => ({
    ...f,
    width: f.minWidth + (remainingWidth * (f.grow || 0)) / totalGrowthFactors,
  }))

  return tableConfig
}
