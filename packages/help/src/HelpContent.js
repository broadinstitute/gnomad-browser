import styled from 'styled-components'

export const HelpContent = styled.div`
  font-size: 14px;

  h1,
  h2,
  h3 {
    font-weight: bold;
  }

  h1 {
    font-size: 28px;
  }

  h2 {
    font-size: 20px;
  }

  p {
    margin-top: 15px;
    margin-bottom: 15px;
    line-height: 150%;
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
    line-height: 150%;
  }

  ul {
    padding-left: 20px;
    margin: 1em 0 0;
  }

  li {
    margin-bottom: 0.5em;
  }
`
