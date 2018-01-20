export default (onHeaderClick, width, currentChromosome) => {
  const mediumSize = (width < 900)

  const tableConfig = ({
    fields: [
      {
        dataKey: 'variant_id',
        title: 'Variant ID',
        dataType: 'variantId',
        width: mediumSize ? width * 0.3 : width * 0.15,
        onHeaderClick,
        // searchable: true,
      },
      // {
      //   dataKey: 'rsid',
      //   title: 'RSID',
      //   dataType: 'string',
      //   width: width * 0.07,
      //   onHeaderClick,
      //   searchable: true,
      //   disappear: mediumSize,
      // },
      // {
      //   dataKey: 'filters',
      //   title: 'Filters',
      //   dataType: 'filter',
      //   width: 70,
      //   onHeaderClick,
      // },
      {
        dataKey: 'datasets',
        title: 'Source',
        dataType: 'datasets',
        width: width * 0.06,
        disappear: mediumSize,
        onHeaderClick,
      },
      {
        dataKey: 'hgvsc',
        title: 'HGVSc',
        dataType: 'string',
        width: width * 0.08,
        onHeaderClick,
        searchable: true,
        disappear: mediumSize,
      },
      {
        dataKey: 'hgvsp',
        title: 'HGVSp',
        dataType: 'string',
        width: mediumSize ? width * 0.1 : width * 0.10,
        onHeaderClick,
        disappear: mediumSize,
        searchable: true,
      },
      {
        dataKey: 'consequence',
        title: 'Consequence',
        dataType: 'consequence',
        width: mediumSize ? width * 0.17 : width * 0.10,
        onHeaderClick,
        // searchable: true,
      },
      {
        dataKey: 'flags',
        title: 'Flags',
        dataType: 'flags',
        width: width * 0.07,
        disappear: mediumSize,
        onHeaderClick,
        // searchable: true,
      },
      {
        dataKey: 'allele_count',
        title: 'AC',
        dataType: 'integer',
        width: mediumSize ? width * 0.03 : width * 0.04,
        onHeaderClick,
      },
      {
        dataKey: 'allele_num',
        title: 'AN',
        dataType: 'integer',
        width: width * 0.05,
        onHeaderClick,
        disappear: mediumSize,
      },
      {
        dataKey: 'allele_freq',
        title: 'AF',
        dataType: 'alleleFrequency',
        width: mediumSize ? width * 0.06 : width * 0.06,
        onHeaderClick,
      }
    ],
  })
  if (currentChromosome !== 'Y') {
    tableConfig.fields.push(
      {
        dataKey: 'hom_count',
        title: 'Hom',
        dataType: 'integer',
        width: mediumSize ? width * 0.04 : width * 0.04,
        onHeaderClick,
      }
    )
  }
  if (currentChromosome === 'X' || currentChromosome === 'Y') {
    tableConfig.fields.push(
      {
        dataKey: currentChromosome === 'Y' ? 'allele_count' : 'hemi_count',
        title: 'Hemi',
        dataType: 'integer',
        width: mediumSize ? width * 0.04 : width * 0.04,
        onHeaderClick,
      }
    )
  }
  return tableConfig
}
