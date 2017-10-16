export default (onHeaderClick, width) =>  {
  if (width < 800) {

  }
  return ({
    fields: [
      {
        dataKey: 'variant_id',
        title: 'Variant ID',
        dataType: 'variantId',
        width: width * 0.1,
        onHeaderClick,
        // searchable: true,
      },
      {
        dataKey: 'rsid',
        title: 'RSID',
        dataType: 'string',
        width: width * 0.05,
        onHeaderClick,
        searchable: true,
        disappear: width < 800,
      },
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
        width: width * 0.05,
        onHeaderClick,
        disappear: width < 800,
      },
      {
        dataKey: 'hgvsc',
        title: 'HGVSc',
        dataType: 'string',
        width: width * 0.07,
        onHeaderClick,
        searchable: true,

        disappear: width < 800,
      },
      {
        dataKey: 'hgvsp',
        title: 'HGVSp',
        dataType: 'string',
        width: width * 0.07,
        onHeaderClick,
        searchable: true,
      },
      {
        dataKey: 'consequence',
        title: 'Consequence',
        dataType: 'consequence',
        width: width * 0.1,
        onHeaderClick,
        // searchable: true,
      },
      {
        dataKey: 'allele_count',
        title: 'AC',
        dataType: 'integer',
        width: width * 0.05,
        onHeaderClick,
      },
      {
        dataKey: 'allele_num',
        title: 'AN',
        dataType: 'integer',
        width: width * 0.05,
        onHeaderClick,
        disappear: width < 800,
      },
      {
        dataKey: 'allele_freq',
        title: 'AF',
        dataType: 'alleleFrequency',
        width: width * 0.05,
        onHeaderClick,
      },
      {
        dataKey: 'hom_count',
        title: 'Hom',
        dataType: 'integer',
        width: width * 0.05,
        onHeaderClick,
      },
    ],
  })
}
