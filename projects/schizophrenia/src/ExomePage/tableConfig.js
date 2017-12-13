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
    { dataKey: 'X', title: 'X', dataType: 'integer', onHeaderClick, width: 100 },
    { dataKey: 'affected', title: 'affected', dataType: 'integer', onHeaderClick, width: 100 },
    { dataKey: 'nonpsych_gnomad_AC', title: 'nonpsych_gnomad_AC', dataType: 'integer', onHeaderClick, width: 120 },
    // { dataKey: 'AF', title: 'AF total', dataType: 'float', onHeaderClick, width: 80 },
    { dataKey: 'basic_csq', title: 'basic_csq', dataType: 'string', onHeaderClick, width: 100, searchable: true },
    { dataKey: 'MPC', title: 'mpc', dataType: 'string', onHeaderClick, width: 100, searchable: true },
    { dataKey: 'basic_polyphen', title: 'basic_polyphen', dataType: 'string', onHeaderClick, width: 100, searchable: true },
  ],
})
