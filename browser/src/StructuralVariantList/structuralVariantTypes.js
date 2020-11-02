// BND and CTX types are grouped as "other"
export const svTypes = ['DEL', 'DUP', 'MCNV', 'INS', 'INV', 'CPX', 'OTH']

export const svTypeLabels = {
  BND: 'breakend',
  CPX: 'complex',
  CTX: 'translocation',
  DEL: 'deletion',
  DUP: 'duplication',
  INS: 'insertion',
  INV: 'inversion',
  MCNV: 'multi CNV',
  OTH: 'other',
}

export const svTypeColors = {
  BND: undefined,
  CPX: '#71E38C',
  CTX: undefined,
  DEL: '#D43925',
  DUP: '#2376B2',
  INS: '#D474E0',
  INV: '#FA931E',
  MCNV: '#7459B2',
  OTH: '#397246',
}
