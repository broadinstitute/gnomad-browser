import React from 'react'
import styled from 'styled-components'

// TODO: images to be updated
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import cpgLogo from './CPG_logo-01.png'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  padding: 10px 30px;
  background-color: #428bca;
  color: white;

  a {
    color: white;
    text-decoration: none;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    padding: 10px;
  }
`

const ImageWrapper = styled.div`
  @media (max-width: 300px) {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 70%;
    margin-bottom: 5px;
  }
`

const AckWrapper = styled.div`
  width: 30%;

  p {
    font-size: 10px;
  }

  @media (max-width: 300px) {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 30%;
    margin-bottom: 5px;
  }
`

const Footer = () => {

  return (
    <Wrapper>
      <ImageWrapper>
        <svg width="200" viewBox="0 0 824 256">
          <image href={cpgLogo} />
        </svg>
      </ImageWrapper>
      <AckWrapper>
        <p>The Centre for Population Genomics values diversity in our team and our work. We believe that including all human diversity in genomic research will empower medical care that benefits everyone. We pay our respects to all Aboriginal and Torres Strait Islander cultures and to their Elders past and present. We gratefully accept the invitation in the Uluru Statement from the Heart &quot;to walk with us in a movement of the Australian people for a better future&quot;.</p>
      </AckWrapper>
    </Wrapper>
  )
}

export default Footer
