/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'
import { currentGene, geneData, isFetching, actions as geneActions } from '@broad/redux-genes'
import { currentDisease, currentGeneDiseaseData } from '../redux'

import fetch from 'graphql-fetch'

const VARIANT_FX_API_URL = process.env.VARIANT_FX_API_URL

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchGeneIfNeeded: PropTypes.func.isRequired,
    fetchGeneDiseases: PropTypes.func.isRequired,
    resetSearchVariants: PropTypes.func.isRequired,
    currentDisease: PropTypes.string.isRequired,
    currentGeneDiseaseData: PropTypes.any.isRequired,
    match: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, match, fetchGeneIfNeeded, fetchGeneDiseases } = this.props
    fetchGeneIfNeeded(currentGene, match, history)
    fetchGeneDiseases()
  }

  componentDidUpdate(prevProps) {
    const { fetchGeneIfNeeded, currentDisease, currentGene, history } = this.props  // eslint-disable-line
    if (currentGene !== prevProps.currentGene) {
      // if(this.props.route.path == nextProps.route.path) return false
      history.push(`/gene/${currentGene}`)
      fetchGeneIfNeeded(currentGene)
      this.props.resetSearchVariants()
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = state => ({
  isFetching: isFetching(state),
  gene: geneData(state),
  currentGene: currentGene(state),
  currentDisease: currentDisease(state),
  currentGeneDiseaseData: currentGeneDiseaseData(state),
})

const mapDispatchToProps = geneFetchFunction => (dispatch) => {
  return {
    fetchGeneIfNeeded: (currentGene, match) => dispatch(
      geneActions.fetchGeneIfNeeded(currentGene, match, geneFetchFunction)
    ),
    resetSearchVariants: () => dispatch(
      variantActions.searchVariants('')
    ),
    fetchGeneDiseases: () => fetch(VARIANT_FX_API_URL)(`
      {
        genediseases {
          Disease
          Gene
          InheritanceMode
          DiseaseMechanism
          VariantClasses
          Missense
          GNO_Ind
          LMM_DIS_Ind
          OMG_DIS_Ind
          RBH_DIS_Ind
          RBH_HVO_Ind
          EGY_DIS_Ind
          EGY_HVO_Ind
          SGP_DIS_Ind
          SGP_HVO_Ind
          Case_Ind
          Control_Ind
          RBH_HVO_PTV_FF_AC
          RBH_HVO_MIS_FF_AC
          RBH_HVO_PAL_FF_AC
          RBH_HVO_SYN_FF_AC
          EGY_HVO_PTV_FF_AC
          EGY_HVO_MIS_FF_AC
          EGY_HVO_PAL_FF_AC
          EGY_HVO_SYN_FF_AC
          SGP_HVO_PTV_FF_AC
          SGP_HVO_MIS_FF_AC
          SGP_HVO_PAL_FF_AC
          SGP_HVO_SYN_FF_AC
          RBH_PTV_FF_AC
          RBH_MIS_FF_AC
          RBH_PAL_FF_AC
          RBH_SYN_FF_AC
          EGY_PTV_FF_AC
          EGY_MIS_FF_AC
          EGY_PAL_FF_AC
          EGY_SYN_FF_AC
          SGP_PTV_FF_AC
          SGP_MIS_FF_AC
          SGP_PAL_FF_AC
          SGP_SYN_FF_AC
          LMM_PTV_FF_AC
          LMM_MIS_FF_AC
          LMM_PAL_FF_AC
          LMM_SYN_FF_AC
          OMG_PTV_FF_AC
          OMG_MIS_FF_AC
          OMG_PAL_FF_AC
          OMG_SYN_FF_AC
          GNO_PTV_FF_AC
          GNO_MIS_FF_AC
          GNO_PAL_FF_AC
          GNO_SYN_FF_AC
          PTV_a
          PTV_c
          PTV_OR
          PTV_OR_lb
          PTV_OR_ub
          PTV_EF
          PTV_EF_lb
          PTV_EF_ub
          PTV_CE
          PTV_PT
          MIS_a
          MIS_c
          MIS_OR
          MIS_OR_lb
          MIS_OR_ub
          MIS_EF
          MIS_EF_lb
          MIS_EF_ub
          MIS_CE
          MIS_PT
          PAL_a
          PAL_c
          PAL_OR
          PAL_OR_lb
          PAL_OR_ub
          PAL_EF
          PAL_EF_lb
          PAL_EF_ub
          PAL_CE
          PAL_PT
        }
      }
    `).then(({data: {genediseases}}) => dispatch({type:'RECEIVE_GENE_DISEASES', genediseases}))
  }
}

const GenePageHOC = (
  ComposedComponent,
  geneFetchFunction
) => connect(
  mapStateToProps,
  mapDispatchToProps(geneFetchFunction)
)(GenePageContainer(ComposedComponent))

export default GenePageHOC
