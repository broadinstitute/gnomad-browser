/* eslint-disable max-len */
/* eslint-disable indent */
export default (onHeaderClick, width) => {
  const mediumSize = (width < 900)
  return {
    fields: [{
        dataKey: 'variant_id',
        title: 'variant_id',
        dataType: 'variantId',
        onHeaderClick,
        width: 120
      }, {
        dataKey: 'ac_case',
        title: 'ac_case',
        dataType: 'integer',
        onHeaderClick,
        width: 60
      }, {
        dataKey: 'an_case',
        title: 'an_case',
        dataType: 'integer',
        onHeaderClick,
        width: 60
      }, {
        dataKey: 'ac_ctrl',
        title: 'ac_ctrl',
        dataType: 'integer',
        onHeaderClick,
        width: 60
      }, {
        dataKey: 'an_ctrl',
        title: 'an_ctrl',
        dataType: 'integer',
        onHeaderClick,
        width: 60
      },
      // { dataKey: 'ac_denovo', title: 'ac_denovo', dataType: 'integer', onHeaderClick, width: 60 },
      // { dataKey: 'ac_gnomad', title: 'ac_gnomad', dataType: 'integer', onHeaderClick, width: 60 },
      {
        dataKey: 'cadd',
        title: 'cadd',
        dataType: 'float',
        onHeaderClick,
        disappear: mediumSize,
        width: 60
      }, {
        dataKey: 'mpc',
        title: 'mpc',
        dataType: 'float',
        onHeaderClick,
        width: 60
      }, {
        dataKey: 'consequence',
        title: 'consequence',
        dataType: 'string',
        onHeaderClick,
        width: 60
      }, {
        dataKey: 'polyphen',
        title: 'polyphen',
        dataType: 'string',
        onHeaderClick,
        disappear: mediumSize,
        width: 60
      }, {
        dataKey: 'pval',
        title: 'pval',
        dataType: 'float',
        onHeaderClick,
        disappear: mediumSize,
        width: 60
      }, {
        dataKey: 'estimate',
        title: 'estimate',
        dataType: 'float',
        onHeaderClick,
        disappear: mediumSize,
        width: 60
      }, {
        dataKey: 'allele_freq',
        title: 'allele_freq',
        dataType: 'float',
        onHeaderClick,
        disappear: mediumSize,
        width: 80
      },
    ],
  }
}