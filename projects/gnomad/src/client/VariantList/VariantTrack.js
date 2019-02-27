import React, { PureComponent } from 'react'

import { VariantAlleleFrequencyTrack } from '@broad/track-variant'

class VariantTrack extends PureComponent {
  render() {
    return <VariantAlleleFrequencyTrack {...this.props} />
  }
}

export default VariantTrack
