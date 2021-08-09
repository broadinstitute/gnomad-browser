import queryString from 'query-string'
import React, { useEffect, useRef, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import {
  isRegionId,
  isVariantId,
  normalizeVariantId,
  parseRegionId,
  isRsId,
} from '@gnomad/identifiers'
import { Searchbox, Select } from '@gnomad/ui'

import { referenceGenomeForDataset } from './datasets'

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: ${props => props.width};

  select {
    border-right: 1px solid #ddd;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    background-color: #fff;
  }

  input {
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`

export const fetchSearchResults = (dataset, query) => {
  // ==============================================================================================
  // Structural Variants
  // ==============================================================================================

  const STRUCTURAL_VARIANT_ID_REGEX = /^(MCNV|INS|DEL|DUP|INV)_(\d+|X|Y)_([1-9][0-9]*)$/i

  const isStructuralVariantId = str => {
    const match = STRUCTURAL_VARIANT_ID_REGEX.exec(str)
    if (!match) {
      return false
    }

    const chrom = match[2]
    const chromNumber = Number(chrom)
    if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
      return false
    }

    const id = Number(match[3])
    if (id > 1e9) {
      return false
    }

    return true
  }

  if (isStructuralVariantId(query)) {
    const structuralVariantId = query.toUpperCase()
    return Promise.resolve([
      {
        label: structuralVariantId,
        value: `/variant/${structuralVariantId}?dataset=${dataset}`,
      },
    ])
  }

  // ==============================================================================================
  // Variants
  // ==============================================================================================

  if (isVariantId(query)) {
    const variantId = normalizeVariantId(query)
    return Promise.resolve([
      {
        label: variantId,
        value: `/variant/${variantId}?dataset=${dataset}`,
      },
    ])
  }

  if (isRsId(query)) {
    const rsId = query
    return Promise.resolve([
      {
        label: rsId,
        value: `/variant/${rsId}?dataset=${dataset}`,
      },
    ])
  }

  // ==============================================================================================
  // Region
  // ==============================================================================================

  if (isRegionId(query)) {
    const { chrom, start, stop } = parseRegionId(query)
    const regionId = `${chrom}-${start}-${stop}`
    const results = [
      {
        label: regionId,
        value: `/region/${regionId}?dataset=${dataset}`,
      },
    ]

    // If a position is entered, return options for a 40 base region centered
    // at the position and the position as a one base region.
    if (start === stop) {
      const windowRegionId = `${chrom}-${Math.max(1, start - 20)}-${stop + 20}`
      results.unshift({
        label: windowRegionId,
        value: `/region/${windowRegionId}?dataset=${dataset}`,
      })
    }

    return Promise.resolve(results)
  }

  // ==============================================================================================
  // Gene ID
  // ==============================================================================================

  const upperCaseQuery = query.toUpperCase()

  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const geneId = upperCaseQuery
    return Promise.resolve([
      {
        label: geneId,
        value: `/gene/${geneId}?dataset=${dataset}`,
      },
    ])
  }

  // ==============================================================================================
  // Transcript ID
  // ==============================================================================================

  if (/^ENST\d{11}$/.test(upperCaseQuery)) {
    const transcriptId = upperCaseQuery
    return Promise.resolve([
      {
        label: transcriptId,
        value: `/transcript/${transcriptId}?dataset=${dataset}`,
      },
    ])
  }

  // ==============================================================================================
  // Gene symbol
  // ==============================================================================================

  return fetch('/api/', {
    body: JSON.stringify({
      query: `
        query GeneSearch($query: String!, $referenceGenome: ReferenceGenomeId!) {
          gene_search(query: $query, reference_genome: $referenceGenome) {
            ensembl_id
            symbol
          }
        }
      `,
      variables: { query, referenceGenome: referenceGenomeForDataset(dataset) },
    }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(response => {
      if (!response.data.gene_search) {
        throw new Error('Unable to retrieve search results')
      }

      const genes = response.data.gene_search

      const geneSymbolCounts = {}
      genes.forEach(gene => {
        if (geneSymbolCounts[gene.symbol] === undefined) {
          geneSymbolCounts[gene.symbol] = 0
        }
        geneSymbolCounts[gene.symbol] += 1
      })

      return genes.map(gene => ({
        label:
          geneSymbolCounts[gene.symbol] > 1 ? `${gene.symbol} (${gene.ensembl_id})` : gene.symbol,
        value: `/gene/${gene.ensembl_id}?dataset=${dataset}`,
      }))
    })
}

const getDefaultSearchDataset = selectedDataset => {
  if (selectedDataset) {
    if (selectedDataset.startsWith('gnomad_r3')) {
      return 'gnomad_r3'
    }
    if (selectedDataset === 'exac') {
      return 'exac'
    }
  }
  return 'gnomad_r2_1'
}

export default withRouter(props => {
  const {
    history,
    location,
    match,
    placeholder = 'Search by gene, region, or variant',
    width,
    ...rest
  } = props

  const currentParams = queryString.parse(location.search)
  const defaultSearchDataset = getDefaultSearchDataset(currentParams.dataset)
  const [searchDataset, setSearchDataset] = useState(defaultSearchDataset)

  // Update search dataset when active dataset changes.
  // Cannot rely on props for this because the top bar does not re-render.
  useEffect(() => {
    return history.listen(newLocation => {
      const newParams = queryString.parse(newLocation.search)
      setSearchDataset(getDefaultSearchDataset(newParams.dataset))
    })
  })

  const innerSearchbox = useRef(null)

  return (
    <Wrapper width={width}>
      <Select
        value={searchDataset}
        onChange={e => {
          setSearchDataset(e.target.value)
          if (innerSearchbox.current) {
            innerSearchbox.current.updateResults()
          }
        }}
      >
        <option value="gnomad_r3">gnomAD v3.1.1</option>
        <option value="gnomad_r2_1">gnomAD v2.1.1</option>
        <option value="gnomad_sv_r2_1">gnomAD SVs v2.1</option>
        <option value="exac">ExAC</option>
      </Select>
      <span style={{ flexGrow: 1 }}>
        <Searchbox
          // Clear input when URL changes
          key={history.location.pathname}
          {...rest}
          ref={innerSearchbox}
          width="100%"
          fetchSearchResults={query => fetchSearchResults(searchDataset, query)}
          placeholder={placeholder}
          onSelect={url => {
            const parsedUrl = queryString.parseUrl(url)
            const nextParams = { dataset: searchDataset }
            history.push({
              pathname: parsedUrl.url,
              search: queryString.stringify(nextParams),
            })
          }}
        />
      </span>
    </Wrapper>
  )
})
