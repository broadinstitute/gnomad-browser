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
    { dataKey: 'AC_cases', title: 'AC cases', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'AC_ctrls', title: 'AC ctrls', dataType: 'integer', onHeaderClick, width: 60 },
    {
      dataKey: 'AC',
      title: 'AC total',
      dataType: 'integer',
      width: 60,
      onHeaderClick,
    },
    { dataKey: 'AF', title: 'AF total', dataType: 'float', onHeaderClick, width: 80 },
    // { dataKey: 'AC_UK_cases', title: 'UK cases', dataType: 'integer', onHeaderClick, width: 13 },
    // { dataKey: 'AC_UK_ctrls', title: 'UK ctrls', dataType: 'integer', onHeaderClick, width: 13 },
    // { dataKey: 'AC_FIN_cases', title: 'FIN cases', dataType: 'integer', onHeaderClick, width: 13 },
    // { dataKey: 'AC_FIN_ctrls', title: 'FIN ctrls', dataType: 'integer', onHeaderClick, width: 13 },
    // { dataKey: 'AC_SWE_cases', title: 'SWE cases', dataType: 'integer', onHeaderClick, width: 13 },
    // { dataKey: 'AC_SWE_ctrls', title: 'SWE ctrls', dataType: 'integer', onHeaderClick, width: 13 },
    { dataKey: 'consequence', title: 'major transcript consequence', dataType: 'string', onHeaderClick, width: 250, searchable: true },
  ],
})
