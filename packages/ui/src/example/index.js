import React from 'react'

import {
  Badge,
  Button,
  Link,
  List,
  ListItem,
  Page,
  PageHeading,
  PrimaryButton,
  TextButton,
} from '..'
import CheckboxExample from './CheckboxExample'
import ComboboxExample from './ComboboxExample'
import ConsequenceCategoriesControlExample from './ConsequenceCategoriesControlExample'
import GridExample from './GridExample'
import ModalExample from './ModalExample'
import SegmentedControlExample from './SegmentedControlExample'
import TabsExample from './TabsExample'
import TooltipExample from './TooltipExample'

const UiExample = () => (
  <Page>
    <PageHeading>UI Components</PageHeading>

    <section>
      <h2>Badges</h2>
      {['error', 'info', 'success', 'warning'].map(level => (
        <Badge
          key={level}
          level={level}
          tooltip={`${level === 'error' || level === 'info' ? 'An' : 'A'} ${level} badge`}
        >
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </Badge>
      ))}
    </section>

    <section>
      <h2>Buttons</h2>
      <Button>Button</Button>
      <PrimaryButton>Primary Button</PrimaryButton>
      <TextButton>Text Button</TextButton>
    </section>

    <section>
      <h2>Checkbox</h2>
      <CheckboxExample />
    </section>

    <section>
      <h2>Combobox</h2>
      <ComboboxExample />
    </section>

    <section>
      <h2>Consequence Category Filter</h2>
      <ConsequenceCategoriesControlExample />
    </section>

    <section>
      <h2>Grid</h2>
      <GridExample />
    </section>

    <section>
      <h2>Link</h2>
      <Link href={window.location.href}>UI Examples</Link>
    </section>

    <section>
      <h2>List</h2>
      <List>
        <ListItem>Foo</ListItem>
        <ListItem>Bar</ListItem>
        <ListItem>Baz</ListItem>
      </List>
    </section>

    <section>
      <h2>Modal</h2>
      <ModalExample />
    </section>

    <section>
      <h2>Segmented Control</h2>
      <SegmentedControlExample />
    </section>

    <section>
      <h2>Tabs</h2>
      <TabsExample />
    </section>

    <section>
      <h2>Tooltip</h2>
      <TooltipExample />
    </section>
  </Page>
)

export default UiExample
