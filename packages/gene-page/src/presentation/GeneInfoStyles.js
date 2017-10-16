import styled from 'styled-components'

export const GeneInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 200px;
`

export const GeneNameWrapper = styled.div`
  font-family: Roboto;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`

export const GeneSymbol = styled.h1`
  font-weight: bold;
  margin-right: 10px;
`

export const GeneLongName = styled.h2`
  font-size: 18px;
  margin-bottom: 0;
  margin-top: 0;
`

export const GeneDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items:  center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  ${'' /* border: 1px solid red; */}
`

export const GeneAttributes = styled.div`
  display: flex;
  font-size: 14px;
  flex-direction: row;
  ${'' /* align-items: space-between; */}
  ${'' /* justify-content: center; */}
  min-width: 300px;
  width: 300px;
  ${'' /* border: 1px solid purple; */}
`

export const GeneAttributeKeys = styled.strong`
  display: flex;
  flex-direction: column;
  ${'' /* border: 2px solid red; */}
  width: 50%;
  ${'' /* width: 50%; */}
  ${'' /* justify-content: flex-end; */}
  ${'' /* align-items: flex-end; */}
  ${'' /* text-align: left */}
`

export const GeneAttributeValues = styled.div`
  display: flex;
  flex-direction: column;
  ${'' /* border: 2px solid orange; */}
  width: 50%;
  justify-content: flex-end;
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

