/* eslint-disable camelcase */
/* eslint-disablestatus windowStatus window*/
/* eslint-disable new-cap */
/* eslint-disable react/prop-types */

import React, { PropTypes } from 'react'
import { Table, Column } from 'react-virtualized'
import { List, Map } from 'immutable'
import { scaleLog, scaleLinear } from 'd3-scale'
// import R from 'ramda'
import 'react-virtualized/styles.css'

import ColumnHeaders from './ColumnHeaders'

import css from './styles.css'

const frequencyScale = scaleLog()
  .domain([0.000001, 10])
  .range(['white', '#3498DB'])
const homozygoteScale = scaleLinear()
  .domain([0, 200])
  .range(['white', '#FFD34E'])
//
// const renderProteinChange = (annotations) => {
//   const referenceResidueMissense = /^\D{3}/.exec(annotations.change)
//   const alternateResidueMissSense = /\D{3}$/.exec(annotations.change)
//   const numberMatches = /\d+/.exec(annotations.change)
//   if (
//     referenceResidueMissense
//     && alternateResidueMissSense
//     && numberMatches
//   ) {
//     let style
//     switch (alternateResidueMissSense[0]) {
//       case 'Ter':
//       case 'del':
//       case 'Dup':
//         style = css.stop
//         break
//       default:
//         style = css.alt
//     }
//     return (
//       <div className={css.residueChange}>
//         <span className={css.ref}>{referenceResidueMissense[0]}</span>
//         <span className={css.residue}>{numberMatches[0]}</span>
//         <span className={style}>{alternateResidueMissSense[0]}</span>
//       </div>
//     )
//   }
//   return annotations.change
// }
//
//
// const renderSpliceVariant = (annotations) => {
//   const numberMatches = /\d+/.exec(annotations.change)
//   const refSilent = /(\D)\>/.exec(annotations.change)
//   const altSilent = /\>(\D)/.exec(annotations.change)
//   if (
//     numberMatches
//     && refSilent
//     && altSilent
//   ) {
//     return (
//       <div className={css.residueChange}>
//         <span className={css.refSilent}>{refSilent[0].substring(0, 1)}</span>
//         <span className={css.bpSilent}>{numberMatches[0]}</span>
//         <span className={css.altSilent}>{altSilent[0].substring(1, 2)}</span>
//       </div>
//     )
//   }
//   return annotations.change
// }
//
// const renderChange = (annotationType, annotations) => {
//   if (annotationType === 'Protein change') {
//     return renderProteinChange(annotations)
//   }
//   if (annotationType === 'Base change') {
//     return renderSpliceVariant(annotations)
//   }
//   if (annotations.change === 'None') {
//     return <div className={css.none}>-</div>
//   }
//   return annotations.change
// }
//
// const renderConsequenceChange = (consequence) => {
//   const formatted = consequence.split('_').join(' ')
//   return (
//     <div className={css.consequenceLabel}>
//       {formatted}
//     </div>
//   )
// }
//

const renderDatasets = (variant, datasets) => {
  if (!datasets) return
  const nodes = datasets.map(dataset => {
    if (dataset === 'all') return
    let style
    if (dataset === 'ExAC') {
      if (variant.ExAC.filter === 'PASS') {
        style = css.dataIndicatorExac
      } else {
        style = css.dataIndicatorExacFiltered
      }
      return <div className={style}>E</div>
    }
    if (dataset === 'gnomAD') {
      if (variant.gnomAD.filter === 'PASS') {
        style = css.dataIndicatorGnomad
      } else {
        style = css.dataIndicatorGnomadFiltered
      }
      return <div className={style}>G</div>
    }
    return
  })
  return nodes
}


const setVariantHandler = (e, variant_id) => {
  e.preventDefault()
  console.log(variant_id)
  // browserHistory.push(`/browser/variant/${variant}`)
}

const logVariant = (variant) => {
  console.log(variant.datasets)
}

const VariantsTable = ({
  variantsData,
  // setVisibleVariant,
}) => {
  const list = List(variantsData.map(variant => Map({
    variantData: {
      chrom: variant.chrom,
      pos: variant.pos,
      ref: variant.ref,
      alt: variant.alt,
      // annotationType: variant.annotationType,
      // annotations: variant.annotations,
      // consequence: variant.consequence,
      allele_count: variant.allele_count,
      allele_num: variant.allele_num,
      allele_freq: variant.allele_freq,
      hom_count: variant.hom_count,
      handler: logVariant,
      variant_id: variant.variant_id,
      datasets: variant.datasets,
      variant,
    },
  })))
  return (
    <Table
      rowClassName={css.row}
      width={800}
      height={350}
      headerHeight={20}
      rowHeight={30}
      rowCount={list.size}
      rowGetter={({ index }) => list.get(index)}
      disableHeader
    >
      <Column
        label={'Variant'}
        dataKey={'variantData'}
        width={250}
        cellRenderer={({
          cellData: {
            chrom,
            pos,
            ref,
            alt,
            // handler,
            variant_id,
          },
        }) => {
          return (
            <div
              className={css.positionData}
              onMouseOver={() =>
                handler(variant)}
                onClick={e => setVariantHandler(e, variant_id)}
             >
              <span className={css.chromosome}>
                {String(chrom)}
              </span>
              {' : '}
              <span className={css.pos}>
                {String(pos)}
              </span>
              {' '}
              <span className={css.ref}>
                {String(ref)}
              </span>
              {'/'}
              <span className={css.alt}>
                {String(alt)}
              </span>
            </div>
          )
        }}
      />
      <Column
        label={'N'}
        dataKey={'variantData'}
        width={145}
        className={css.carrierData}
        cellRenderer={({
          cellData: {
            allele_count,
            handler,
            variant_id,
            variant,
          },
         }) => (
          <div
            className={css.carrierData}
            onMouseOver={() => handler(variant)}
            onClick={(e) => setVariantHandler(e, variant_id)}
          >
            {allele_count}
          </div>
        )}
      />
      <Column
        label={'allele_num'}
        dataKey={'variantData'}
        width={120}
        className={css.totalData}
        cellRenderer={({
          cellData: {
            allele_num,
            handler,
            variant_id,
            variant,
          },
         }) => (
           <div
             className={css.carrierData}
             onMouseOver={() => handler(variant)}
             onClick={(e) => setVariantHandler(e, variant_id)}
           >
             {allele_num}
           </div>
         )}
        />
      <Column
        label={'allele_freq'}
        dataKey={'variantData'}
        width={100}
        className={css.frequencyData}
        cellRenderer={({
          cellData: {
            allele_freq,
            handler,
            variant_id,
            variant,
           },
         }) => (
          <div
            className={css.frequencyData}
            onMouseOver={() => handler(variant)}
            onClick={(e) => setVariantHandler(e, variant_id)}
          >
            {allele_freq.toPrecision(3)}
          </div>
        )}
      />
      <Column
        label={'hom_count'}
        dataKey={'variantData'}
        width={100}
        className={css.homozygotesData}
        cellRenderer={({
          cellData: {
            hom_count,
            handler,
            variant_id,
            variant,
           },
         }) => (
          <div
            className={css.homozygotesData}
            onMouseOver={() => handler(variant)}
            onClick={(e) => setVariantHandler(e, variant_id)}
          >
            {hom_count}
          </div>
        )}
      />
    </Table>
  )
}

const VariantTable = ({
  variantsData,
}) => {
  return (
    <div>
      <ColumnHeaders setSort={() => console.log('Time to sort')} />
      <VariantsTable variantsData={variantsData} />
    </div>
  )
}

VariantTable.propTypes = {
  variantsData: PropTypes.array.isRequired,
  // setVisibleVariant: PropTypes.func.isRequired,
  // currentVariant: PropTypes.string.isRequired,
  // setSort: PropTypes.func.isRequired,
}

export default VariantTable
