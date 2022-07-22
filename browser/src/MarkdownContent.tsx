import React from 'react'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'

const MarkdownContentWrapper = styled.div`
  font-size: 16px;

  h1,
  h2,
  h3 {
    font-weight: bold;
  }

  h1 {
    font-size: 2em;
  }

  h2 {
    font-size: 1.5em;
  }

  p {
    margin-top: 15px;
    margin-bottom: 15px;
    line-height: 1.4;
  }

  a {
    color: #428bca;
    text-decoration: none;
  }

  img {
    max-width: 100%;
  }

  blockquote {
    margin: 0 0 0 10px;
    font-size: 14px;
    font-style: italic;
    line-height: 1.4;
  }

  ol,
  ul {
    padding-left: 20px;
    margin: 1em 0;
  }

  li {
    margin-bottom: 0.5em;
  }

  table {
    border-collapse: collapse;
    border-spacing: 0;
  }

  td {
    padding: 0.5em 10px 0.5em 0;
    border-bottom: 1px solid #ccc;
    font-weight: normal;
    text-align: left;
  }

  th {
    padding: 0.5em 10px 0.5em 0;
    border-bottom: 1px solid #000;
    background-position: center right;
    background-repeat: no-repeat;
    font-weight: bold;
  }
`

// eslint-disable-next-line react/prop-types
export default (props: any) => {
  const history = useHistory()

  /* Hack to make regular anchor elements from Markdown content work with React Router */
  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */
    <MarkdownContentWrapper
      {...props}
      onClick={(e: any) => {
        if (e.target.tagName === 'A') {
          const isRelativeLink = e.target.getAttribute('href').startsWith('/')
          if (isRelativeLink) {
            e.preventDefault()
            history.push(e.target.getAttribute('href'))
          }
        }
      }}
    />
  )
}
