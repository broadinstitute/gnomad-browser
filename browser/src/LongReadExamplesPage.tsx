import React from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const LR_DATASET = 'gnomad_r4_lr'

const examples = [
  {
    section: 'Complex Structural Variant Regions',
    items: [
      {
        title: 'MHC region (chr6)',
        description: 'Most complex motifs — dense TR and SV activity in the major histocompatibility complex.',
        region: '6-31400000-31450000',
        haplotypes: true,
      },
      {
        title: 'chr3 mega-TR',
        description: '2,976 enveloped variants in a single massive tandem repeat expansion.',
        region: '3-195750000-195800000',
        haplotypes: true,
      },
      {
        title: 'Subtelomeric repeats (chr1)',
        description: 'Subtelomeric region with high repeat content and structural variation.',
        region: '1-2100000-2150000',
        haplotypes: true,
      },
      {
        title: 'chr16 complex TR',
        description: 'Complex tandem repeat region with diverse motif patterns.',
        region: '16-85380000-85430000',
        haplotypes: true,
      },
      {
        title: 'chr2 diverse large SVs',
        description: '46 DEL, 46 DUP, 22 INS, 12 interspersed DUP, 2 complex DUP, 2 LINE insertions.',
        region: '2-130000000-130100000',
        haplotypes: true,
      },
      {
        title: 'chr1 ALU insertions',
        description: '4 ALU insertions, 2 deletions, 2 duplications.',
        region: '1-10000000-10100000',
        haplotypes: true,
      },
      {
        title: 'chr3 mixed SVs',
        description: '12 DEL, 4 ALU insertions, 4 DUP.',
        region: '3-50000000-50100000',
        haplotypes: true,
      },
    ],
  },
  {
    section: 'LR-Unique Enriched Regions (SR Blind Spots)',
    description:
      'Regions where 20–60% of variants are only found by long reads, with ≥100 LR-unique SVs/indels/TRs.',
    items: [
      {
        title: 'chr2 2q37 subtelomeric',
        description: '736 unique INS, 254 DEL, 200 TR, 174 DUP — highest SV diversity.',
        region: '2-231800000-231900000',
        haplotypes: true,
      },
      {
        title: 'chr1 1p36 subtelomeric',
        description: '1,020 unique INS, 170 TR — massive insertion enrichment.',
        region: '1-2600000-2700000',
        haplotypes: true,
      },
      {
        title: 'chr2 2q37.3 telomeric',
        description: '606 unique INS, 330 DEL, 262 TR.',
        region: '2-241800000-241900000',
        haplotypes: true,
      },
      {
        title: 'chr1 1q21.1 segdup',
        description: '1,020 unique INS, 141 DEL — known CNV hotspot.',
        region: '1-143200000-143300000',
        haplotypes: true,
      },
      {
        title: 'chr6 MHC region (wide)',
        description: '522 unique INS, 200 DEL, 95 TR.',
        region: '6-31400000-31500000',
        haplotypes: true,
      },
      {
        title: 'chr1 1p21 pericentromeric',
        description: '642 unique INS, 250 DEL, 178 DUP — 42% LR-unique.',
        region: '1-121600000-121700000',
        haplotypes: true,
      },
      {
        title: 'chr3 3p22',
        description: '418 unique INS, 202 DEL, 138 TR.',
        region: '3-51000000-51100000',
        haplotypes: true,
      },
      {
        title: 'chr1 1q25',
        description: '266 unique INS, 228 DEL, 230 TR — balanced across types.',
        region: '1-247100000-247200000',
        haplotypes: true,
      },
    ],
  },
  {
    section: 'LR-Unique SNV Hotspots',
    description:
      'Regions with decent SR coverage where LR still finds 40–45% more SNVs. Use the "SNVs" filter on the LR-unique track.',
    items: [
      {
        title: 'chr1 AMY1A/AMY1B/AMY2A amylase locus',
        description: '446 unique SNVs / 1,018 total — classic CNV/segdup region.',
        region: '1-103600000-103650000',
        haplotypes: false,
      },
      {
        title: 'chr5 SMN2 spinal muscular atrophy segdup',
        description: '216 unique SNVs / 489 total.',
        region: '5-70050000-70100000',
        haplotypes: false,
      },
      {
        title: 'chr16 16p11.2',
        description: '539 unique SNVs / 1,205 total — 45% LR-unique.',
        region: '16-34850000-34900000',
        haplotypes: false,
      },
      {
        title: 'chr9 9p11 pericentromeric',
        description: '393 unique SNVs / 905 total.',
        region: '9-40200000-40250000',
        haplotypes: false,
      },
      {
        title: 'chr22 pericentromeric (FAM230D)',
        description: '506 unique SNVs / 1,148 total.',
        region: '22-18200000-18250000',
        haplotypes: false,
      },
    ],
  },
]

const Section = styled.div`
  margin-bottom: 2em;
`

const SectionTitle = styled.h2`
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
  font-size: 1.2em;
`

const SectionDescription = styled.p`
  color: #666;
  margin-bottom: 1em;
`

const ExampleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
`

const ExampleCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px 16px;
  &:hover {
    border-color: #428bca;
    background: #f8fbff;
  }
`

const ExampleTitle = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
`

const ExampleDescription = styled.div`
  color: #666;
  font-size: 0.9em;
  margin-bottom: 8px;
`

const LongReadExamplesPage = () => (
  <InfoPage>
    <DocumentTitle title="Long Read Examples" />
    <h1>Long Read Example Regions</h1>
    <p>
      Curated regions showcasing long-read variant discovery in the gnomAD v4.1.1 long-read
      callset (292 samples). These highlight structural variants, tandem repeats, and regions
      where long reads find variants invisible to short-read sequencing.
    </p>

    {examples.map((section) => (
      <Section key={section.section}>
        <SectionTitle>{section.section}</SectionTitle>
        {section.description && <SectionDescription>{section.description}</SectionDescription>}
        <ExampleGrid>
          {section.items.map((item) => {
            const url = `/region/${item.region}?dataset=${LR_DATASET}${item.haplotypes ? '&show_haplotypes=true' : ''}`
            return (
              <a key={item.region} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <ExampleCard>
                  <ExampleTitle>{item.title}</ExampleTitle>
                  <ExampleDescription>{item.description}</ExampleDescription>
                  <code style={{ fontSize: '0.8em', color: '#888' }}>{item.region}</code>
                </ExampleCard>
              </a>
            )
          })}
        </ExampleGrid>
      </Section>
    ))}
  </InfoPage>
)

export default LongReadExamplesPage

