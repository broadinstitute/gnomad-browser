/* eslint-disable max-len */

export const tableConfig = onHeaderClick => ({
  fields: [
    {
      dataKey: 'variant_id',
      title: 'Variant Id ',
      dataType: 'variantId',
      width: 150,
      onHeaderClick,
    },
    {
      dataKey: 'filter',
      title: 'Filter',
      dataType: 'string',
      onHeaderClick,
      width: 60
    },
    {
      dataKey: 'rsid',
      title: 'RSID',
      dataType: 'string',
      onHeaderClick,
      width: 60
    },
    // {
    //   dataKey: 'AC',
    //   title: 'AC total',
    //   dataType: 'integer',
    //   width: 60,
    //   onHeaderClick,
    // },
    // {
    //   dataKey: 'HGVSc',
    //   title: 'HGVSc',
    //   dataType: 'string',
    //   onHeaderClick,
    //   width: 130
    // },

    {
      dataKey: 'Consequence',
      title: 'Consequence',
      dataType: 'string',
      onHeaderClick,
      width: 250
    },
  ],
})
