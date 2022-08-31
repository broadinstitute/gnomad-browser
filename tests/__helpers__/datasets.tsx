import { describe } from '@jest/globals'
import { allDatasetIds } from '../../dataset-metadata/metadata'

export const forAllDatasets = (contextDescription: string, tests: (datasetId: string) => void) => {
  describe.each(allDatasetIds)(contextDescription, tests)
}
/*
(datasetId: any) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <Router history={createBrowserHistory()}>
        <ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />
      </Router>
    )
    expect(tree).toMatchSnapshot()
  })
})
*/
