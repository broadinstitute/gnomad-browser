import React from 'react'
import LensTest from '../index'

import css from './styles.css'

const LensTestExample = () => {
  return (
    <div className={css.demo}>
      {'June 12, 2017 10:39 AM!!!'}
      <LensTest message={'Hello there'} />
    </div>
  )
}

export default LensTestExample
