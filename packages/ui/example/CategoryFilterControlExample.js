import React, { useState } from 'react'

import { CategoryFilterControl } from '../src'

const CategoryFilterControlExample = () => {
  const [categorySelections, setCategorySelections] = useState({
    lof: true,
    missense: true,
    synonymous: true,
    other: true,
  })

  return (
    <CategoryFilterControl
      categories={[
        {
          id: 'lof',
          label: 'LoF',
          color: '#FF583F',
        },
        {
          id: 'missense',
          label: 'Missense',
          color: '#F0C94D',
        },
        {
          id: 'synonymous',
          label: 'Synonymous',
          color: 'green',
        },
        {
          id: 'other',
          label: 'Other',
          color: '#757575',
        },
      ]}
      id="category-filter-control-example"
      categorySelections={categorySelections}
      onChange={setCategorySelections}
    />
  )
}

export default CategoryFilterControlExample
