/* eslint-disable max-len */

export default onHeaderClick => ({
  fields: [
    {
      dataKey: 'variant_id',
      title: 'Variant Id ',
      dataType: 'variantId',
      width: 150,
      onHeaderClick,
    },
    // {
    //   dataKey: 'filter',
    //   title: 'Filter',
    //   dataType: 'string',
    //   onHeaderClick,
    //   width: 60
    // },
    // {
    //   dataKey: 'rsid',
    //   title: 'RSID',
    //   dataType: 'string',
    //   onHeaderClick,
    //   width: 60
    // },
    // {
    //   dataKey: 'AC',
    //   title: 'AC total',
    //   dataType: 'integer',
    //   width: 60,
    //   onHeaderClick,
    // },
    {
      dataKey: 'HGVSc',
      title: 'HGVSc',
      dataType: 'string',
      onHeaderClick,
      searchable: true,
      width: 200
    },

    {
      dataKey: 'Consequence',
      title: 'Consequence',
      dataType: 'string',
      searchable: true,
      onHeaderClick,
      width: 250
    },
    {
      dataKey: 'GNO_HVO_UNK_AC',
      title: 'gnomAD AC',
      dataType: 'integer',
      onHeaderClick,
      width: 100
    },
    {
      dataKey: 'GNO_HVO_UNK_AF',
      title: 'gnomAD AF',
      dataType: 'float',
      onHeaderClick,
      width: 100
    },
  ],
})
