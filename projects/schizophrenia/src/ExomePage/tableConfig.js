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
    { dataKey: 'X', title: 'X', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'affected', title: 'affected', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'nonpsych_gnomad_AC', title: 'gnomad', dataType: 'integer', onHeaderClick, width: 60 },
    // { dataKey: 'AF', title: 'AF total', dataType: 'float', onHeapderClick, width: 80 },
    { dataKey: 'consequence', title: 'csq', dataType: 'string', onHeaderClick, width: 80, searchable: true },
    { dataKey: 'MPC', title: 'mpc', dataType: 'string', onHeaderClick, width: 80, searchable: true },
    { dataKey: 'basic_polyphen', title: 'polyphen', dataType: 'string', onHeaderClick, width: 80, searchable: true },
  ],
})
