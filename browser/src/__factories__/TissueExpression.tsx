import { Factory } from 'fishery'
import { GtexTissueExpression } from '../GenePage/TranscriptsTissueExpression'
import { Pext } from '../GenePage/GenePage'

type PextParams = {
  tissues?: string[]
  regions?: {
    start: number
    stop: number
  }[]
}

export const pextFactory = Factory.define<Pext>(({ params }) => {
  const defaultTissues = ['adipose_subcutaneous', 'adipose_visceral_omentum', 'adrenal_gland']

  const { tissues: paramTissues, regions: paramRegions } = params as PextParams

  const tissues = [...defaultTissues, ...(paramTissues ?? [])]

  const defaultRegions = [
    {
      start: 10,
      stop: 20,
    },
    {
      start: 20,
      stop: 30,
    },
    {
      start: 40,
      stop: 60,
    },
  ]

  const regions = [...defaultRegions, ...(paramRegions ?? [])]

  const pextObject: Pext = {
    regions: regions.map((region, i) => {
      const dummyValue = i / Object.keys(tissues).length

      const tissueObjects = tissues.map((tissue) => {
        return {
          tissue,
          value: dummyValue,
        }
      })

      return {
        start: region.start,
        stop: region.stop,
        mean: dummyValue,
        tissues: tissueObjects,
      }
    }),
    flags: [],
  }

  return pextObject
})

export const gtexTissueExpressionFactory = Factory.define<GtexTissueExpression>(({ params }) => {
  const defaultTissues = {
    adipose_subcutaneous: 0,
    adipose_visceral_omentum: 0,
    adrenal_gland: 0,
    artery_aorta: 0,
    artery_coronary: 0,
    artery_tibial: 0,
    bladder: 0,
    brain_amygdala: 0,
    brain_anterior_cingulate_cortex_ba24: 0,
    brain_caudate_basal_ganglia: 0,
    brain_cerebellar_hemisphere: 0,
    brain_cerebellum: 0,
    brain_cortex: 0,
    brain_frontal_cortex_ba9: 0,
    brain_hippocampus: 0,
    brain_hypothalamus: 0,
    brain_nucleus_accumbens_basal_ganglia: 0,
    brain_putamen_basal_ganglia: 0,
    brain_spinal_cord_cervical_c_1: 0,
    brain_substantia_nigra: 0,
    breast_mammary_tissue: 0,
    cells_ebv_transformed_lymphocytes: 0,
    cells_transformed_fibroblasts: 0,
    cervix_ectocervix: 0,
    cervix_endocervix: 0,
    colon_sigmoid: 0,
    colon_transverse: 0,
    esophagus_gastroesophageal_junction: 0,
    esophagus_mucosa: 0,
    esophagus_muscularis: 0,
    fallopian_tube: 0,
    heart_atrial_appendage: 0,
    heart_left_ventricle: 0,
    kidney_cortex: 0,
    liver: 0,
    lung: 0,
    minor_salivary_gland: 0,
    muscle_skeletal: 0,
    nerve_tibial: 0,
    ovary: 0,
    pancreas: 0,
    pituitary: 0,
    prostate: 0,
    skin_not_sun_exposed_suprapubic: 0,
    skin_sun_exposed_lower_leg: 0,
    small_intestine_terminal_ileum: 0,
    spleen: 0,
    stomach: 0,
    testis: 0,
    thyroid: 0,
    uterus: 0,
    vagina: 0,
    whole_blood: 0,
  }

  const tissueObject = { ...defaultTissues, ...params } as typeof defaultTissues

  const tissueArray: GtexTissueExpression = Object.entries(tissueObject).map((entry) => ({
    tissue: entry[0],
    value: entry[1],
  }))

  return tissueArray
})
