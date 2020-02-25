import React, { PureComponent } from 'react'

import BaseVariantTrack from '@gnomad/track-variant'

class VariantTrack extends PureComponent {
  render() {
    return <BaseVariantTrack {...this.props} />
  }
}

export default VariantTrack
