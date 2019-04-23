import browserConfig from '@browser/config'

export default browserConfig.variants.columns.filter(c => c.showOnDetails !== false)
