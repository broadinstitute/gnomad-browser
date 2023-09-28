import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import useHeadsObserver from './downloadsHooks'

const TableOfContents = styled.div`
  margin-left: 1rem;
`

const TableOfContentsStyledItem = styled.div<{
  active?: boolean
  padding: string
  header?: boolean
}>`
  padding-left: ${(props) => props.padding};
  margin-top: ${(props) => (props.header ? '1rem' : '0.5rem')};
  background-color: ${(props) => (props.active ? '#e9e9e9' : 'transparent')};
  font-weight: ${(props) => (props.active ? 700 : 400)};
  border-radius: 0.25rem;

  a {
    color: #1173bb;
    text-decoration: none;
  }
`

const DownloadsPageTableOfContents = () => {
  const [headings, setHeadings] = useState([])
  const { activeId } = useHeadsObserver()
  const [activeSection, setActiveSection] = useState('')

  const checkIndent = (idString: string) => {
    if (idString.indexOf('core-dataset') > -1 || idString.indexOf('secondary-analyses') > -1) {
      return '2rem'
    }
    if (idString.indexOf('-') === -1 || idString === 'v2-liftover') {
      return '0.5rem'
    }
    return '3.5rem'
  }

  // useEffect to dynamically grab all the section titles on first page load
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('a[id]')).map((el) => ({
      // @ts-expect-error
      text: el.nextSibling.data,
      link: el.id,
      indent: checkIndent(el.id),
    }))
    // @ts-expect-error
    setHeadings(elements)
  }, [])

  // Determine which top-level dataset should be shown accordion style in the ToC
  useEffect(() => {
    if (activeId.indexOf('v2-liftover') > -1) {
      setActiveSection('v2-liftover')
    } else if (activeId.indexOf('v2') > -1) {
      setActiveSection('v2')
    } else if (activeId.indexOf('v4') > -1) {
      setActiveSection('v4')
    } else if (activeId.indexOf('v3') > -1) {
      setActiveSection('v3')
    } else if (activeId.indexOf('exac') > -1) {
      setActiveSection('exac')
    } else {
      setActiveSection('summary')
    }
  }, [activeId])

  // Messy logic, the end result is to always output the 4 categories [v2, v2-liftover, v3, exac]
  //   and if you are in a given section, also output all of their download links
  //   which are additionally nested under 'core-dataset' and 'secondary-analyses'
  // This would be a lot cleaner if v2-liftover wasn't the only top level dataset that
  //   also includes a "-".
  const filterSection = (idString: string) => {
    if (activeSection === 'v2') {
      return (
        (idString.indexOf('-') === -1 ||
          idString === 'v2-liftover' ||
          idString.indexOf(activeSection) > -1) &&
        idString.indexOf('v2-liftover-') === -1
      )
    }
    return (
      idString.indexOf('-') === -1 ||
      idString === 'v2-liftover' ||
      idString.indexOf(activeSection) > -1
    )
  }

  type ContentItem = {
    link: string
    indent: string
    text: string
  }

  return (
    <>
      <TableOfContents>
        {/* Filter to only the sections that should show, then render the ToC */}
        {headings
          .filter((item: ContentItem) => filterSection(item.link))
          .map((item: ContentItem) => {
            return (
              <TableOfContentsStyledItem
                active={activeId === item.link}
                padding={item.indent}
                header={item.indent === '0.5rem'}
                key={item.link}
              >
                <a href={`#${item.link}`}>{item.text}</a>
              </TableOfContentsStyledItem>
            )
          })}
      </TableOfContents>
    </>
  )
}

export default DownloadsPageTableOfContents
