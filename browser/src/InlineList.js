import PropTypes from 'prop-types'
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

const InlineList = ({ items, label, maxLength, ...otherProps }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMore = items.length > maxLength
  const displayedItems = hasMore ? items.slice(0, maxLength - 1) : items

  return (
    <>
      <InlineListWrapper {...otherProps}>
        {displayedItems.map((item, index) => (
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
          initialFocusOnButton={false}
          title={label}
          onRequestClose={() => setIsExpanded(false)}
        >
          <List>
            {items.map((item, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Modal>
      )}
    </>
  )
}

InlineList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
  label: PropTypes.string.isRequired,
  maxLength: PropTypes.number,
}

InlineList.defaultProps = {
  maxLength: 3,
}

export default InlineList
