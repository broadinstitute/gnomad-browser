const SHARED_GTEX_TISSUES = {
  adipose_subcutaneous: {
    fullName: 'Adipose - Subcutaneous',
    color: '#FF6600',
  },
  adipose_visceral_omentum: {
    fullName: 'Adipose - Visceral (Omentum)',
    color: '#FFAA00',
  },
  adrenal_gland: {
    fullName: 'Adrenal Gland',
    color: '#33DD33',
  },
  artery_aorta: {
    fullName: 'Artery - Aorta',
    color: '#FF5555',
  },
  artery_coronary: {
    fullName: 'Artery - Coronary',
    color: '#FFAA99',
  },
  artery_tibial: {
    fullName: 'Artery - Tibial',
    color: '#FF0000',
  },
  brain_amygdala: {
    fullName: 'Brain - Amygdala',
    color: '#EEEE00',
  },
  brain_anterior_cingulate_cortex_ba24: {
    fullName: 'Brain - Anterior cingulate cortex (BA24)',
    color: '#EEEE00',
  },
  brain_caudate_basal_ganglia: {
    fullName: 'Brain - Caudate (basal ganglia)',
    color: '#EEEE00',
  },
  brain_cerebellar_hemisphere: {
    fullName: 'Brain - Cerebellar Hemisphere',
    color: '#EEEE00',
  },
  brain_cerebellum: {
    fullName: 'Brain - Cerebellum',
    color: '#EEEE00',
  },
  brain_cortex: {
    fullName: 'Brain - Cortex',
    color: '#EEEE00',
  },
  brain_frontal_cortex_ba9: {
    fullName: 'Brain - Frontal Cortex (BA9)',
    color: '#EEEE00',
  },
  brain_hippocampus: {
    fullName: 'Brain - Hippocampus',
    color: '#EEEE00',
  },
  brain_hypothalamus: {
    fullName: 'Brain - Hypothalamus',
    color: '#EEEE00',
  },
  brain_nucleus_accumbens_basal_ganglia: {
    fullName: 'Brain - Nucleus accumbens (basal ganglia)',
    color: '#EEEE00',
  },
  brain_putamen_basal_ganglia: {
    fullName: 'Brain - Putamen (basal ganglia)',
    color: '#EEEE00',
  },
  brain_spinal_cord_cervical_c_1: {
    fullName: 'Brain - Spinal cord (cervical c-1)',
    color: '#EEEE00',
  },
  brain_substantia_nigra: {
    fullName: 'Brain - Substantia nigra',
    color: '#EEEE00',
  },
  breast_mammary_tissue: {
    fullName: 'Breast - Mammary Tissue',
    color: '#33CCCC',
  },
  cells_ebv_transformed_lymphocytes: {
    fullName: 'Cells - EBV-transformed lymphocytes',
    color: '#CC66FF',
  },
  colon_sigmoid: {
    fullName: 'Colon - Sigmoid',
    color: '#EEBB77',
  },
  colon_transverse: {
    fullName: 'Colon - Transverse',
    color: '#CC9955',
  },
  esophagus_gastroesophageal_junction: {
    fullName: 'Esophagus - Gastroesophageal Junction',
    color: '#8B7355',
  },
  esophagus_mucosa: {
    fullName: 'Esophagus - Mucosa',
    color: '#552200',
  },
  esophagus_muscularis: {
    fullName: 'Esophagus - Muscularis',
    color: '#BB9988',
  },
  heart_atrial_appendage: {
    fullName: 'Heart - Atrial Appendage',
    color: '#9900FF',
  },
  heart_left_ventricle: {
    fullName: 'Heart - Left Ventricle',
    color: '#660099',
  },
  kidney_cortex: {
    fullName: 'Kidney - Cortex',
    color: '#22FFDD',
  },
  liver: {
    fullName: 'Liver',
    color: '#AABB66',
  },
  lung: {
    fullName: 'Lung',
    color: '#99FF00',
  },
  minor_salivary_gland: {
    fullName: 'Minor Salivary Gland',
    color: '#99BB88',
  },
  muscle_skeletal: {
    fullName: 'Muscle - Skeletal',
    color: '#AAAAFF',
  },
  nerve_tibial: {
    fullName: 'Nerve - Tibial',
    color: '#FFD700',
  },
  ovary: {
    fullName: 'Ovary',
    color: '#FFAAFF',
  },
  pancreas: {
    fullName: 'Pancreas',
    color: '#995522',
  },
  pituitary: {
    fullName: 'Pituitary',
    color: '#AAFF99',
  },
  prostate: {
    fullName: 'Prostate',
    color: '#DDDDDD',
  },
  skin_not_sun_exposed_suprapubic: {
    fullName: 'Skin - Not Sun Exposed (Suprapubic)',
    color: '#0000FF',
  },
  skin_sun_exposed_lower_leg: {
    fullName: 'Skin - Sun Exposed (Lower leg)',
    color: '#7777FF',
  },
  small_intestine_terminal_ileum: {
    fullName: 'Small Intestine - Terminal Ileum',
    color: '#555522',
  },
  spleen: {
    fullName: 'Spleen',
    color: '#778855',
  },
  stomach: {
    fullName: 'Stomach',
    color: '#FFDD99',
  },
  testis: {
    fullName: 'Testis',
    color: '#AAAAAA',
  },
  thyroid: {
    fullName: 'Thyroid',
    color: '#006600',
  },
  uterus: {
    fullName: 'Uterus',
    color: '#FF66FF',
  },
  vagina: {
    fullName: 'Vagina',
    color: '#FF5599',
  },
  whole_blood: {
    fullName: 'Whole Blood',
    color: '#FF00BB',
  },
}

const V2_SPECIFIC_GTEX_TISSUES = {
  bladder: {
    fullName: 'Bladder',
    color: '#AA0000',
  },
  cells_transformed_fibroblasts: {
    fullName: 'Cells - Transformed fibroblasts',
    color: '#AAEEFF',
  },
  cervix_ectocervix: {
    fullName: 'Cervix - Ectocervix',
    color: '#FFCCCC',
  },
  cervix_endocervix: {
    fullName: 'Cervix - Endocervix',
    color: '#CCAADD',
  },
  fallopian_tube: {
    fullName: 'Fallopian Tube',
    color: '#FFCCCC',
  },
}

const V4_SPECIFIC_GTEX_TISSUES = {
  cells_cultured_fibroblasts: {
    fullName: 'Cells - Cultured fibroblasts',
    color: '#AAEEFF',
  },
}

export type GtexTissueName =
  | keyof typeof SHARED_GTEX_TISSUES
  | keyof typeof V2_SPECIFIC_GTEX_TISSUES
  | keyof typeof V4_SPECIFIC_GTEX_TISSUES

export type TissueDetail = {
  fullName: string
  color: string
}

export type GtexTissues = Record<GtexTissueName, TissueDetail>

export const ALL_GTEX_TISSUES: GtexTissues = {
  ...SHARED_GTEX_TISSUES,
  ...V2_SPECIFIC_GTEX_TISSUES,
  ...V4_SPECIFIC_GTEX_TISSUES,
}
