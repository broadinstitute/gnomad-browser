import styled from 'styled-components'

export const Loading = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  margin-top: 20px;
  width: 100%;
  height: 50%;

  h1 {
    font-weight: bold;
  }
`

export const GeneInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 97%;
  flex-shrink: 0;
  min-height: 100%;
  @media (max-width: 900px) {
    flex-direction: column;
    justify-content: center;
  }
`

export const GeneNameWrapper = styled.div`
  ${'' /* font-family: Roboto-; */}
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
  @media (max-width: 900px) {
    align-items: center;
    flex-direction: column;
  }
`

export const GeneSymbol = styled.h1`
  font-weight: bold;
  margin-left: 10px;
  font-size: 35px;
`

export const GeneLongName = styled.h2`
  font-size: 22px;
  margin-left: 20px;
  margin-bottom: 0;
  margin-top: 0;
  @media (max-width: 900px) {
    text-align: center;
    margin-bottom: 10px;
    margin-left: 0;
  }
`

export const GeneDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  @media (max-width: 900px) {
    flex-direction: column;
    justify-content: center;
  }
`

export const GeneAttributes = styled.div`
  display: flex;
  font-size: 14px;
  flex-direction: row;
  ${'' /* align-items: space-between; */}
  ${'' /* justify-content: center; */}
  min-width: 300px;
  width: 400px;
  min-height: 100%;
  ${'' /* border: 1px solid purple; */}
`

export const GeneAttributeKeys = styled.strong`
  display: flex;
  flex-direction: column;
  ${'' /* border: 2px solid red; */}
  width: 170px;
  ${'' /* width: 50%; */}
  ${'' /* justify-content: flex-end; */}
  ${'' /* align-items: flex-end; */}
  ${'' /* text-align: left */}
`

export const GeneAttributeValues = styled.div`
  display: flex;
  flex-direction: column;
  ${'' /* border: 2px solid orange; */}
  width: 230px;
  ${'' /* justify-content: flex-end; */}
`

export const GeneAttributeKey = styled.strong`
  ${'' /* border: 2px solid green; */}
  ${'' /* width: 50%; */}
  ${'' /* justify-content: flex-end; */}
  ${'' /* align-items: flex-end; */}
  text-align: right;
  padding-right: 15px;
  margin-bottom: 3px;
`

export const GeneAttributeValue = styled.div`
  ${'' /* border: 2px solid blue; */}
  ${'' /* width: 50%; */}
  ${'' /* justify-content: flex-start; */}
  margin-bottom: 3px;
  & > a {
    text-decoration: none;
    color: #428bca;
    ${'' /* font-weight: bold; */}
    &:hover  {
      color: #BE4248;
    }
  }
`

export const ItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  @media (max-width: 900px) {
    align-items: center;
  }
`
