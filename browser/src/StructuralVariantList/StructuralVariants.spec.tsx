import React from 'react'
import { describe, test, expect } from '@jest/globals'
import StructuralVariants, { Context } from './StructuralVariants'
import structuralVariantFactory from '../__factories__/StructuralVariant'
import { createRenderer } from 'react-test-renderer/shallow'

describe('StructuralVariants', () => {
  const context: Context = { chrom: '12' }

  const variants = structuralVariantFactory.buildList(3)

  test('has no unexpected changes', () => {
    // We can't do a full render because the Grid component invoked a couple of
    // layers down uses react-sizeme. Since Grid is defined in GBTK, not this
    // project, the sizeme mock in this project isn't applied.
    const tree = createRenderer().render(
      <StructuralVariants context={context} exportFileName="somefile.tar.gz" variants={variants} />
    )
    expect(tree).toMatchSnapshot()
  })
})
