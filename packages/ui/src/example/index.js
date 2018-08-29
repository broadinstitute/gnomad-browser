import React from 'react'
import styled from 'styled-components'

import {
  Badge,
  Button,
  Link,
  List,
  ListItem,
  Page,
  PageHeading,
  PrimaryButton,
  SectionHeading,
  TextButton,
} from '..'
import CheckboxExample from './CheckboxExample'
import InfoModalExample from './InfoModalExample'
import SegmentedControlExample from './SegmentedControlExample'
import TooltipExample from './TooltipExample'

const Section = styled.section`
  margin-bottom: 2em;
`

const UiExample = () => (
  <Page>
    <PageHeading>UI Components</PageHeading>

    <Section>
      <SectionHeading>Badges</SectionHeading>
      {['error', 'info', 'success', 'warning'].map(level => (
        <Badge
          key={level}
          level={level}
          tooltip={`${level === 'error' || level === 'info' ? 'An' : 'A'} ${level} badge`}
        >
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </Badge>
      ))}
    </Section>

    <Section>
      <SectionHeading>Buttons</SectionHeading>
      <Button>Button</Button>
      <PrimaryButton>Primary Button</PrimaryButton>
      <TextButton>Text Button</TextButton>
    </Section>

    <Section>
      <SectionHeading>Checkbox</SectionHeading>
      <CheckboxExample />
    </Section>

    <Section>
      <SectionHeading>Link</SectionHeading>
      <Link href={location.href}>UI Examples</Link>
    </Section>

    <Section>
      <SectionHeading>List</SectionHeading>
      <List>
        <ListItem>Foo</ListItem>
        <ListItem>Bar</ListItem>
        <ListItem>Baz</ListItem>
      </List>
    </Section>

    <Section>
      <SectionHeading>Modal</SectionHeading>
      <InfoModalExample />
    </Section>

    <Section>
      <SectionHeading>Segmented Control</SectionHeading>
      <SegmentedControlExample />
    </Section>

    <Section>
      <SectionHeading>Tooltip</SectionHeading>
      <TooltipExample />
    </Section>
  </Page>
)

export default UiExample
