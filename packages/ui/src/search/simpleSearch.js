import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const SearchWrapper = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 14px;
  align-items: center;
`


const SearchInput = styled.input`
  height: 25px;
  width: 210px;
  border: 0;
  border-bottom: 1px solid #000;
  background-color: transparent;
  /*margin-top: 2px;*/
  /*margin-right: 100px;*/
  text-indent: 5px;
  -webkit-transition: width 0.4s ease-in-out;
  transition: width 0.4s ease-in-out;
`

const ClearSearch = styled.button`
  margin-left: 5px;
  height: 20px;

`

export const Search = ({
  listName,
  options,
  placeholder,
  onChange,
  reference,
}) => {
  let elem
  return (
    <SearchWrapper>
        <SearchInput
          type="text"
          name="search"
          autoComplete="off"
          placeholder={placeholder}
          ref={e1 => {
            elem = e1
          }}
          list={listName}
          onChange={(event) => {
            event.preventDefault()
            onChange(event.target.value)
          }}
        />
        {/* <datalist id={listName}>
          {options.map(item => <option value={item} />)}
        </datalist> */}
      <ClearSearch onClick={() => {
        onChange('')
        elem.inputText = ''
      }}>Clear</ClearSearch>
    </SearchWrapper>
  )
}
Search.propTypes = {
  listName: PropTypes.string,
  // options: PropTypes.string,
  placeholder: PropTypes.string,
  // onSubmit: PropTypes.string,
}
Search.defaultProps = {
  listName: 'myList',
  options: ['first', 'second', 'third'],
  placeholder: 'placeholder',
  onSubmit: console.log,
}
