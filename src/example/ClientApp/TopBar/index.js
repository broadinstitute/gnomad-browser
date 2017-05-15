import React from 'react'
import css from './styles.css'

const TopBar = () => {
  return (
    <div className={css.topBar}>
      <div className={css.logo}>
        Variant browser
      </div>
    </div>
  )
}

export default TopBar
