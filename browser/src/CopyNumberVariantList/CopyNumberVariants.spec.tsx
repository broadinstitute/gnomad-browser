import React from 'react'
import { describe, test, expect } from '@jest/globals'
import CopyNumberVariants, { Context } from './CopyNumberVariants'
import cnvFactory from '../__factories__/CopyNumberVariant'
import { createRenderer } from 'react-test-renderer/shallow'

describe('CopyNumberVariants', () => {
  const context: Context = { chrom: '12' }

  const variants = cnvFactory.buildList(3).map((v) => ({
    ...v,
  }))

  test('has no unexpected changes', () => {
    // We can't do a full render because the Grid component invoked a couple of
    // layers down uses react-sizeme. Since Grid is defined in GBTK, not this
    // project, the sizeme mock in this project isn't applied.
    const tree = createRenderer().render(
      <CopyNumberVariants context={context} exportFileName="somefile.tar.gz" variants={variants} />
    )
    expect(tree).toMatchSnapshot()
  })
})
