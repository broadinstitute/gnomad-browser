import React, { PropTypes } from 'react'
import LensTestExample from 'lens-test/lib/example'

import css from './styles.css'

const Demo = () => {
  return (
    <div className={css.demo}>
      {'hardcoded!!!!!!'}
      <LensTestExample />
    </div>
  )
}

export default Demo
