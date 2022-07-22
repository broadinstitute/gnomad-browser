import React, { useState } from 'react'
import styled from 'styled-components'

import { List, ListItem, Modal, TextButton } from '@gnomad/ui'

const InlineListWrapper = styled.ul`
  display: inline;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: inline;

    &::after {
      content: ', ';
    }

    &:last-child::after {
      content: none;
    }
  }
`

type OwnProps = {
  items: any[]
  label: string
  maxLength?: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof InlineList.defaultProps

// @ts-expect-error TS(7022) FIXME: 'InlineList' implicitly has type 'any' because it ... Remove this comment to see the full error message
const InlineList = ({ items, label, maxLength, ...otherProps }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMore = items.length > maxLength
  const displayedItems = hasMore ? items.slice(0, maxLength - 1) : items

  return (
    <>
      <InlineListWrapper {...otherProps}>
        {displayedItems.map((item: any, index: any) => (
          <li key={index}>{item}</li> // eslint-disable-line react/no-array-index-key
        ))}
        {hasMore && (
          <li>
            <TextButton
              onClick={() => {
                setIsExpanded(true)
              }}
            >
              and {items.length - displayedItems.length} more
            </TextButton>
          </li>
        )}
      </InlineListWrapper>

      {isExpanded && (
        <Modal
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; initialFocusOnButton: b... Remove this comment to see the full error message
          initialFocusOnButton={false}
          title={label}
          onRequestClose={() => setIsExpanded(false)}
        >
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <List>
            {items.map((item: any, index: any) => (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              // eslint-disable-next-line react/no-array-index-key
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Modal>
      )}
    </>
  )
}

InlineList.defaultProps = {
  maxLength: 3,
}

export default InlineList
