import PropTypes from 'prop-types'
import React, { useRef } from 'react'
import styled from 'styled-components'

import {
  Checkbox,
  Combobox,
  ConsequenceCategoriesControl,
  KeyboardShortcut,
  SearchInput,
} from '@broad/ui'

import browserConfig from '@browser/config'

import ExportVariantsButton from './ExportVariantsButton'

const SettingsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;

  @media (max-width: 1100px) {
    flex-direction: column;
  }
`

const FiltersWrapper = styled.div`
  display: flex;
  flex-grow: 2;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 1350px) {
    flex-direction: column;
  }

  @media (max-width: 700px) {
    align-items: center;
  }
`

const AnalysisGroupMenuWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1em;

  @media (max-width: 700px) {
    flex-direction: column;
  }

  @media (min-width: 701px) {
    > * {
      margin-right: 0.5em;
    }
  }
`

const FiltersFirstColumn = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 700px) {
    align-items: center;
  }
`

const FiltersSecondColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  label {
    margin-bottom: 0.375em;
  }

  @media (max-width: 1350px) {
    flex-direction: row;
    justify-content: flex-start;
    margin-top: 1em;

    label {
      margin-right: 2em;
    }
  }

  @media (max-width: 700px) {
    flex-direction: column;
  }
`

const SearchWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  justify-content: flex-end;

  @media (max-width: 1100px) {
    margin-top: 0.525em;
  }
`

const keyboardShortcuts = {
  lof: 'l',
  missense: 'm',
  synonymous: 's',
  other: 'o',
}

const VariantFilterControls = ({
  filter,
  geneId,
  onChangeAnalysisGroup,
  onChangeFilter,
  renderedVariants,
  selectedAnalysisGroup,
}) => {
  const searchInput = useRef(null)

  return (
    <SettingsWrapper>
      <FiltersWrapper>
        <FiltersFirstColumn>
          <ConsequenceCategoriesControl
            categorySelections={filter.includeCategories}
            id="variant-filter"
            onChange={includeCategories => {
              onChangeFilter({ ...filter, includeCategories })
            }}
          />
          {Object.keys(keyboardShortcuts).map(category => (
            <KeyboardShortcut
              key={category}
              handler={() => {
                onChangeFilter({
                  ...filter.includeCategories,
                  includeCategories: {
                    ...filter.includeCategories,
                    [category]: !filter.includeCategories[category],
                  },
                })
              }}
              keys={keyboardShortcuts[category]}
            />
          ))}

          <AnalysisGroupMenuWrapper>
            {browserConfig.variants.groups.options.length > 1 && (
              <React.Fragment>
                {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
                <label htmlFor="analysis-group">Current analysis group</label>
                <Combobox
                  id="analysis-group"
                  options={browserConfig.variants.groups.options.map(group => ({
                    id: group,
                    label: browserConfig.variants.groups.labels[group] || group,
                  }))}
                  onSelect={option => onChangeAnalysisGroup(option.id)}
                  value={
                    browserConfig.variants.groups.labels[selectedAnalysisGroup] ||
                    selectedAnalysisGroup
                  }
                />
              </React.Fragment>
            )}
            {!browserConfig.variants.hideExport && (
              <ExportVariantsButton
                exportFileName={`${selectedAnalysisGroup}_${geneId}_variants`}
                variants={renderedVariants}
              />
            )}
          </AnalysisGroupMenuWrapper>
        </FiltersFirstColumn>

        <FiltersSecondColumn>
          <Checkbox
            checked={filter.onlyInAnalysis}
            id="in-analysis-filter"
            label="Show only variants in analysis"
            onChange={onlyInAnalysis => {
              onChangeFilter({ ...filter, onlyInAnalysis })
            }}
          />
          {(browserConfig.variants.filters || []).map(f => (
            <Checkbox
              checked={filter.browserFilters[f.id]}
              id={`browser-filter-${f.id}`}
              label={f.label}
              onChange={value => {
                onChangeFilter({
                  ...filter,
                  browserFilters: { ...filter.browserFilters, [f.id]: value },
                })
              }}
            />
          ))}
        </FiltersSecondColumn>
      </FiltersWrapper>

      <SearchWrapper>
        <SearchInput
          ref={searchInput}
          placeholder="Search variant table"
          value={filter.searchText}
          onChange={searchText => {
            onChangeFilter({ ...filter, searchText })
          }}
        />
        <KeyboardShortcut
          keys="/"
          handler={e => {
            // preventDefault to avoid typing a "/" in the search input
            e.preventDefault()
            if (searchInput.current) {
              searchInput.current.focus()
            }
          }}
        />
      </SearchWrapper>
    </SettingsWrapper>
  )
}

VariantFilterControls.propTypes = {
  filter: PropTypes.shape({
    browserFilters: PropTypes.objectOf(PropTypes.bool).isRequired,
    includeCategories: PropTypes.shape({
      lof: PropTypes.bool.isRequired,
      missense: PropTypes.bool.isRequired,
      synonymous: PropTypes.bool.isRequired,
      other: PropTypes.bool.isRequired,
    }).isRequired,
    onlyInAnalysis: PropTypes.bool.isRequired,
    searchText: PropTypes.string.isRequired,
  }).isRequired,
  geneId: PropTypes.string.isRequired,
  onChangeAnalysisGroup: PropTypes.func.isRequired,
  onChangeFilter: PropTypes.func.isRequired,
  renderedVariants: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedAnalysisGroup: PropTypes.string.isRequired,
}

export default VariantFilterControls
