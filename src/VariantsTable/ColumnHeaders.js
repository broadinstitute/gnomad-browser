import React, { PropTypes } from 'react'
import css from './styles.css'

const ColumnHeaders = ({ setSort }) => {
  return (
    <table className={css.tableHeader}>
      <thead >
        <tr>
          <th className={css.positionColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('variant_id')}
              style={{
                width: 105,
              }}
            >
              Variant
            </button>
          </th>
          {/*<th className={css.consequenceColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('consequence')}
              style={{
                width: 67,
              }}
            >Conseq</button>
          </th>
          <th className={css.changeColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('')}
              style={{
                width: 80,
              }}
            >Change</button>
          </th>*/}
          <th className={css.carrierColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('allele_count')}
            >Allele Count</button>
          </th>
          <th className={css.totalColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('allele_num')}
            >Allele Number</button>
          </th>
          <th className={css.frequencyColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('allele_freq')}
            >Frequency</button>
          </th>
          <th className={css.homozygotesColumnName}>
            <button
              className={css.button}
              onClick={() => setSort('hom_count')}
            >Homozygotes</button>
          </th>
        </tr>
      </thead>
    </table>
  )
}
ColumnHeaders.propTypes = {
  setSort: PropTypes.func.isRequired,
}
export default ColumnHeaders
