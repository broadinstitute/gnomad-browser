export const svTypes = ['DEL', 'DUP', 'MCNV', 'INS', 'INV', 'CPX', 'OTH', 'BND', 'CTX'] as const

export const svTypeLabels: Record<string, string> = {
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
  BND: '#397246',
  CPX: '#71E38C',
  CTX: '#397246',
  DEL: '#D43925',
  DUP: '#2376B2',
  INS: '#D474E0',
  INV: '#FA931E',
  MCNV: '#7459B2',
  OTH: '#397246',
}
