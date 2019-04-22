import CaretDown from '@fortawesome/fontawesome-free/svgs/solid/caret-down.svg'
import { darken, transparentize } from 'polished'
import PropTypes from 'prop-types'
import queryString from 'query-string'
import React, { Component } from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components'

import datasetLabels from './datasetLabels'
import sampleCounts from './sampleCounts'

const NavigationMenuWrapper = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  border: 1px solid #6c757d;
  border-radius: 0.5em;
  margin: 0;
  list-style-type: none;
`

const TopLevelNavigationLink = styled.a`
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 100%;
  padding: 0.375em 0.25em;
  color: #000;
  outline: none;
  text-decoration: none;

  &:visited {
    color: #000;
  }

  &:focus {
    box-shadow: 0 0 0 0.2em ${transparentize(0.5, '#428bca')};
  }
`.withComponent(Link)

const NavigationMenuItem = styled.li`
  position: relative;
  display: inline-block;

  ${TopLevelNavigationLink} {
    background: ${props => (props.isActive ? darken(0.15, '#f8f9fa') : 'none')};
  }

  &:first-child {
    ${TopLevelNavigationLink} {
      padding-left: 0.75em;
      border-top-left-radius: 0.5em;
      border-bottom-left-radius: 0.5em;
    }
  }

  &:last-child {
    ${TopLevelNavigationLink} {
      padding-right: 0.75em;
      border-top-right-radius: 0.5em;
      border-bottom-right-radius: 0.5em;
    }
  }
`

const MoreIcon = styled.span`
  svg {
    position: relative;
    top: 0.11em;
    width: 0.9em;
    height: 0.9em;
  }
`

const SubNavigationMenu = styled.ul`
  position: absolute;
  z-index: 1;
  right: 0;
  display: ${props => (props.isExpanded ? 'block' : 'none')};
  width: 220px;
  padding: 0.5em 0;
  border: 1px solid #6c757d;
  margin: 0;
  background: #f8f9fa;
  list-style-type: none;

  @media (max-width: 1200px) {
    right: auto;
    left: -100px;
  }

  @media (max-width: 900px) {
    left: -150px;
  }
`

const SubNavigationLink = styled.a`
  display: inline-block;
  box-sizing: border-box;
  width: 100%;
  padding: 0.25em 0.5em;
  color: #000;
  text-decoration: none;

  &:visited {
    color: #000;
  }

  &:active,
  &:focus,
  &:hover {
    background: ${transparentize(0.75, '#428bca')};
  }

  &:focus {
    outline: 2px solid #428bca;
  }
`.withComponent(Link)

const ItemDescription = styled.div`
  margin-top: 0.125em;
  margin-left: 5px;
  font-size: 0.8em;
  opacity: 0.6;
`

class NavigationMenu extends Component {
  static propTypes = {
    items: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          isActive: PropTypes.bool,
          label: PropTypes.string.isRequired,
          url: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
        }),
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          isActive: PropTypes.bool,
          label: PropTypes.string.isRequired,
          children: PropTypes.arrayOf(
            PropTypes.shape({
              id: PropTypes.string.isRequired,
              label: PropTypes.string.isRequired,
              url: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
              description: PropTypes.string,
            })
          ).isRequired,
        }),
      ])
    ).isRequired,
  }

  state = {
    expandedItem: null,
  }

  container = React.createRef()

  onBlur = () => {
    setTimeout(() => {
      if (!document.activeElement || !this.container.current.contains(document.activeElement)) {
        this.setState({ expandedItem: null })
      }
    }, 0)
  }

  onClickExpandButton = e => {
    e.preventDefault()
    const { item } = this.findItem(e.currentTarget.dataset.item)
    this.setState(state => ({ expandedItem: state.expandedItem === item.id ? null : item.id }))
  }

  onKeyDownTopLevelItem = e => {
    const { key } = e

    const { items } = this.props
    const { expandedItem } = this.state
    const isExpanded = expandedItem !== null
    const { index, item } = this.findItem(e.currentTarget.dataset.item)

    switch (key) {
      case ' ':
        e.preventDefault()
        if (item.children) {
          this.setState(state => ({
            expandedItem: state.expandedItem === item.id ? null : item.id,
          }))
        } else {
          e.currentTarget.click()
        }
        break
      case 'Escape':
        this.setState({ expandedItem: null })
        break
      case 'Tab':
        if (e.shiftKey) {
          if (index > 0) {
            e.preventDefault()
            if (isExpanded && items[index - 1].children) {
              this.focusItem(items[index - 1].children[items[index - 1].children.length - 1].id)
            } else {
              this.focusItem(items[index - 1].id)
            }
          }
        } else if (index < items.length - 1) {
          e.preventDefault()
          if (isExpanded && item.children) {
            this.focusItem(item.children[0].id)
          } else {
            this.focusItem(items[index + 1].id)
          }
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (item.children) {
          this.setState({ expandedItem: item.id }, () => {
            this.focusItem(item.children[0].id)
          })
        }
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        if (index > 0) {
          this.focusItem(items[index - 1].id)
        }
        break
      case 'ArrowRight':
        if (index < items.length - 1) {
          this.focusItem(items[index + 1].id)
        }
        break
      default:
    }
  }

  onKeyDownSubMenuItem = e => {
    const { key } = e

    const { items } = this.props
    const { index, parentItem, parentIndex } = this.findItem(e.currentTarget.dataset.item)

    switch (key) {
      case 'Escape':
        this.focusItem(parentItem.id)
        this.setState({ expandedItem: null })
        break
      case ' ':
        e.preventDefault()
        e.currentTarget.click()
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (index > 0) {
            this.focusItem(parentItem.children[index - 1].id)
          } else {
            this.focusItem(parentItem.id)
          }
        } else if (index < parentItem.children.length - 1) {
          this.focusItem(parentItem.children[index + 1].id)
        } else if (parentIndex < items.length - 1) {
          this.focusItem(items[parentIndex + 1].id)
        }
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        this.focusItem(parentItem.id)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (index < parentItem.children.length - 1) {
          this.focusItem(parentItem.children[index + 1].id)
        } else if (parentIndex < items.length - 1) {
          this.focusItem(items[parentIndex + 1].id)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (index > 0) {
          this.focusItem(parentItem.children[index - 1].id)
        } else {
          this.focusItem(parentItem.id)
        }
        break
      default:
    }
  }

  findItem(itemId) {
    const { items } = this.props
    for (let i = 0; i < items.length; i += 1) {
      if (itemId === items[i].id) {
        return {
          index: i,
          item: items[i],
        }
      }
      if (items[i].children) {
        for (let j = 0; j < items[i].children.length; j += 1) {
          if (itemId === items[i].children[j].id) {
            return {
              index: j,
              item: items[i].children[j],
              parentItem: items[i],
              parentIndex: i,
            }
          }
        }
      }
    }
    return null
  }

  focusItem(itemId) {
    const { item, parentItem } = this.findItem(itemId)
    const topLevelItem = parentItem === undefined ? item : parentItem
    this.setState(
      state => (state.expandedItem ? { expandedItem: topLevelItem.id } : {}),
      () => {
        const itemElement = this.container.current.querySelector(`[data-item="${itemId}"]`)
        itemElement.focus()
      }
    )
  }

  render() {
    const { items } = this.props
    const { expandedItem } = this.state
    return (
      <NavigationMenuWrapper ref={this.container}>
        {items.map(item => {
          const isExpanded = expandedItem === item.id
          return (
            <NavigationMenuItem key={item.id} isActive={item.isActive}>
              {item.url ? (
                <TopLevelNavigationLink
                  data-item={item.id}
                  to={item.url}
                  onBlur={this.onBlur}
                  onKeyDown={this.onKeyDownTopLevelItem}
                >
                  {item.label}
                </TopLevelNavigationLink>
              ) : (
                <React.Fragment key={item.id}>
                  <TopLevelNavigationLink
                    aria-expanded={isExpanded}
                    aria-haspopup="true"
                    aria-label={item.label}
                    data-item={item.id}
                    role="button"
                    to="#"
                    onBlur={this.onBlur}
                    onClick={this.onClickExpandButton}
                    onKeyDown={this.onKeyDownTopLevelItem}
                  >
                    <MoreIcon>
                      <CaretDown />
                    </MoreIcon>
                  </TopLevelNavigationLink>
                  <SubNavigationMenu isExpanded={isExpanded}>
                    {item.children.map(childItem => (
                      <li key={childItem.id}>
                        <SubNavigationLink
                          data-item={childItem.id}
                          to={childItem.url}
                          onBlur={this.onBlur}
                          onClick={() => {
                            this.setState({ expandedItem: null })
                            this.focusItem(item.id)
                          }}
                          onKeyDown={this.onKeyDownSubMenuItem}
                        >
                          {childItem.label}
                          {childItem.description && (
                            <ItemDescription>{childItem.description}</ItemDescription>
                          )}
                        </SubNavigationLink>
                      </li>
                    ))}
                  </SubNavigationMenu>
                </React.Fragment>
              )}
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuWrapper>
    )
  }
}

const DatasetSelector = withRouter(({ datasetOptions, history, selectedDataset }) => {
  const {
    includeShortVariants = true,
    includeStructuralVariants = true,
    includeExac = true,
  } = datasetOptions

  const datasetLink = datasetId =>
    Object.assign({}, history.location, {
      search: queryString.stringify({ dataset: datasetId }),
    })

  const topLevelShortVariantDataset =
    selectedDataset !== 'gnomad_sv_r2' ? selectedDataset : 'gnomad_r2_1'

  let datasets = []

  if (includeShortVariants) {
    const shortVariantDatasets = [
      {
        id: 'current_short_variant',
        isActive: selectedDataset !== 'gnomad_sv_r2',
        label: datasetLabels[topLevelShortVariantDataset],
        url: datasetLink(topLevelShortVariantDataset),
      },
      {
        id: 'gnomad_subsets',
        isActive: selectedDataset !== 'gnomad_sv_r2',
        label: 'gnomAD subsets',
        children: [
          {
            id: 'gnomad_r2_1',
            label: datasetLabels.gnomad_r2_1,
            url: datasetLink('gnomad_r2_1'),
            description: `${sampleCounts.gnomad_r2_1.total.toLocaleString()} samples`,
          },
          {
            id: 'gnomad_r2_1_controls',
            label: datasetLabels.gnomad_r2_1_controls,
            url: datasetLink('gnomad_r2_1_controls'),
            description: `${sampleCounts.gnomad_r2_1_controls.total.toLocaleString()} samples`,
          },
          {
            id: 'gnomad_r2_1_non_cancer',
            label: datasetLabels.gnomad_r2_1_non_cancer,
            url: datasetLink('gnomad_r2_1_non_cancer'),
            description: `${sampleCounts.gnomad_r2_1_non_cancer.total.toLocaleString()} samples`,
          },
          {
            id: 'gnomad_r2_1_non_neuro',
            label: datasetLabels.gnomad_r2_1_non_neuro,
            url: datasetLink('gnomad_r2_1_non_neuro'),
            description: `${sampleCounts.gnomad_r2_1_non_neuro.total.toLocaleString()} samples`,
          },
          {
            id: 'gnomad_r2_1_non_topmed',
            label: datasetLabels.gnomad_r2_1_non_topmed,
            url: datasetLink('gnomad_r2_1_non_topmed'),
            description: `${sampleCounts.gnomad_r2_1_non_topmed.total.toLocaleString()} samples`,
          },
        ],
      },
    ]

    if (includeExac) {
      shortVariantDatasets[1].children.push({
        id: 'exac',
        label: datasetLabels.exac,
        url: datasetLink('exac'),
        description: `${sampleCounts.exac.total.toLocaleString()} samples`,
      })
    }

    datasets = datasets.concat(shortVariantDatasets)
  }

  if (includeStructuralVariants) {
    datasets.push({
      id: 'gnomad_sv_r2',
      isActive: selectedDataset === 'gnomad_sv_r2',
      label: datasetLabels.gnomad_sv_r2,
      url: datasetLink('gnomad_sv_r2'),
    })
  }

  return <NavigationMenu items={datasets} />
})

DatasetSelector.propTypes = {
  datasetOptions: PropTypes.shape({
    includeShortVariants: PropTypes.bool,
    includeStructuralVariants: PropTypes.bool,
    includeExac: PropTypes.bool,
  }),
  selectedDataset: PropTypes.string.isRequired,
}

DatasetSelector.defaultProps = {
  datasetOptions: {
    includeShortVariants: true,
    includeStructuralVariants: true,
    includeExac: true,
  },
}

export default DatasetSelector
