import React from 'react'
import SearchIcon from 'material-ui/svg-icons/action/search'
import css from './styles.css'

const TopBar = () => {
  return (
    <div className={css.topBar}>
      <div className={css.logo}>
        gnomAD browser
      </div>
      <div className={css.search}>
        <span className={css.searchIcon}>
          <SearchIcon />
        </span>
        <input
          className={css.searchInput}
          type="text"
          name="search"
          placeholder="Search by gene, transcript, region, or variant"
        />
      </div>
      <div className={css.menu}>
        <div className={css.menuItem}>
          About
        </div>
        <div className={css.menuItem}>
          Downloads
        </div>
        <div className={css.menuItem}>
          Terms
        </div>
        <div className={css.menuItem}>
          Contact
        </div>
        <div className={css.menuItem}>
          Jobs
        </div>
        <div className={css.menuItem}>
          FAQ
        </div>
      </div>
    </div>
  )
}

export default TopBar
