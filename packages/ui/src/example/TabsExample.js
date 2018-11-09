import React from 'react'

import { Tabs } from '..'

const TabsExample = () => (
  <Tabs
    tabs={[
      {
        id: 'foo',
        label: 'Tab #1',
        render: () => 'First tab',
      },
      {
        id: 'bar',
        label: 'Tab #2',
        render: () => 'Second tab',
      },
      {
        id: 'baz',
        label: 'Tab #3',
        render: () => 'Third tab',
      },
    ]}
  />
)

export default TabsExample
