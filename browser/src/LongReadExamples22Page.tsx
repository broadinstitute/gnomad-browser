import React from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const LR_DATASET = 'gnomad_r4_lr'

const examples = [
  {
    section: 'Presentation-linked archetypes',
    description:
      'Chromosome 22 regions that connect to the long-read use cases in the literature-survey presentation.',
    items: [
      {
        title: 'ATXN10 repeat locus',
        description:
          'Repeat expansion archetype: inspect population repeat alleles and their surrounding haplotypes. The loaded callset includes the ATXN10 TRV at chr22:45,729,580.',
        evidence: '60 kb · 954 sites · 344 TR alleles',
        region: '22-45700000-45760000',
      },
      {
        title: 'CYP2D6 / CYP2D7 pharmacogene locus',
        description:
          'Paralog and pseudogene archetype: a compact duplicated locus where copy assignment and complete haplotype structure matter for hybrid star alleles.',
        evidence: '100 kb · 2,376 sites · 18 duplication alleles · 26 alleles ≥1 kb',
        region: '22-42100000-42200000',
      },
      {
        title: '22q11.2 low-copy repeats — proximal window',
        description:
          'Complex structural-variant archetype: dense repeat and large-variant diversity in the segmental duplications that mediate recurrent 22q11.2 rearrangements.',
        evidence: '100 kb · 2,016 sites · 483 alleles ≥1 kb · longest 33.7 kb',
        region: '22-20250000-20350000',
      },
      {
        title: '22q11.2 low-copy repeats — distal window',
        description:
          'A second LCR22 window for comparing complete local haplotypes rather than treating each breakpoint-adjacent call independently.',
        evidence: '100 kb · 2,727 sites · 507 alleles ≥1 kb · longest 87.3 kb',
        region: '22-21250000-21350000',
      },
      {
        title: 'Immunoglobulin lambda locus',
        description:
          'Duplicated-locus archetype: sequence placement is difficult in the dense IGL region, making this useful for exploring copy-aware haplotypes and large insertions.',
        evidence: '100 kb · 3,359 sites · 30 duplication alleles · longest 93.6 kb',
        region: '22-22850000-22950000',
      },
      {
        title: 'SVA insertion cluster',
        description:
          'Mobile-element archetype: four SVA insertion alleles occur in this 50 kb window, enabling comparison of inserted sequence and haplotype context.',
        evidence: '50 kb · 1,054 sites · 4 mobile-element insertions',
        region: '22-24700000-24750000',
      },
    ],
  },
  {
    section: 'Methylation signals',
    description:
      'Exploratory windows from the separate mixed-provenance chr22 methylation prototype. Values are individual-level summaries and are not phased to either haplotype.',
    items: [
      {
        title: 'Variable methylation near 18.83 Mb',
        description:
          'A pericentromeric window with broad between-sample methylation variation, useful for viewing methylation beside unusually complex local haplotypes.',
        evidence: '20 kb · 149 CpGs · mean 54.5% · mean inter-sample SD 18.3 points',
        region: '22-18820000-18840000',
      },
      {
        title: 'Variable methylation in the IGL region',
        description:
          'A compact interval where methylation variability overlaps a duplicated immune locus, connecting the methylation and sequence-placement archetypes.',
        evidence: '20 kb · 192 CpGs · mean 40.7% · mean inter-sample SD 16.4 points',
        region: '22-22880000-22900000',
      },
      {
        title: 'Low-methylation domain near 41.92 Mb',
        description:
          'A CpG-dense window with low mean methylation across the available reference participants.',
        evidence: '20 kb · 858 CpGs · mean 17.9% · mean 209 observed samples per CpG',
        region: '22-41910000-41930000',
      },
      {
        title: 'Low-methylation domain near 45.97 Mb',
        description:
          'The strongest 10 kb low-methylation window in the chr22 scan among windows with broad sample coverage.',
        evidence: '10 kb · 653 CpGs · mean 10.6% · mean 210 observed samples per CpG',
        region: '22-45970000-45980000',
      },
    ],
  },
  {
    section: 'Data-driven chr22 discovery regions',
    description:
      'High-complexity windows found by grouping HGSVC/HPRC Y1 allele rows from the loaded chromosome 22 ClickHouse candidate. Counts describe ALT allele rows, not independent participants or clinical events.',
    items: [
      {
        title: 'Pericentromeric FAM230D region',
        description:
          'A short-read-challenging repeat-rich region already represented on the original examples page, now measured directly in the chr22 Y1 load.',
        evidence: '50 kb · 1,504 sites · 1,964 TR alleles · 1,170 structural-size alleles',
        region: '22-18200000-18250000',
      },
      {
        title: 'Repeat and large-SV hotspot at 38.1 Mb',
        description:
          'A mixed window for examining whether long repeat alleles and large structural calls co-segregate on a limited set of population haplotypes.',
        evidence: '100 kb · 2,102 sites · 1,422 TR alleles · 570 alleles ≥1 kb',
        region: '22-38100000-38200000',
      },
      {
        title: 'Repeat hotspot at 46.45 Mb',
        description:
          'One of the strongest non-pericentromeric chr22 windows by large-repeat burden, suitable for motif, length, and haplotype-cluster exploration.',
        evidence: '100 kb · 2,487 sites · 1,223 TR alleles · 581 alleles ≥1 kb',
        region: '22-46450000-46550000',
      },
      {
        title: 'Subtelomeric repeat and SV hotspot',
        description:
          'Near-terminal sequence with the highest large-allele burden among the selected windows, illustrating why subtelomeric reconstruction benefits from long reads.',
        evidence: '100 kb · 2,549 sites · 1,783 TR alleles · 724 alleles ≥1 kb',
        region: '22-50600000-50700000',
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
  height: 100%;
  box-sizing: border-box;

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

const Evidence = styled.div`
  color: #444;
  font-size: 0.82em;
  font-weight: 600;
  margin-bottom: 8px;
`

const LongReadExamples22Page = () => (
  <InfoPage>
    <DocumentTitle title="Chromosome 22 Long Read Examples" />
    <h1>Chromosome 22 Long Read Example Regions</h1>
    <p>
      Curated regions from the current chromosome 22 Y1 HGSVC/HPRC load. They map the data to themes
      in the long-read literature presentation and highlight regions that stood out in direct
      ClickHouse queries of variants and the separate methylation prototype.
    </p>
    <p>
      These are exploratory population-reference views, not pathogenic examples. Recurrence can
      provide context for a patient finding, but this page does not establish disease association or
      clinical thresholds. Methylation is context-dependent, and the prototype signals below need
      biological validation before interpretation.
    </p>

    {examples.map((section) => (
      <Section key={section.section}>
        <SectionTitle>{section.section}</SectionTitle>
        <SectionDescription>{section.description}</SectionDescription>
        <ExampleGrid>
          {section.items.map((item) => {
            const url = `/region/${item.region}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc&show_haplotypes=true`
            return (
              <a
                key={item.region}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <ExampleCard>
                  <ExampleTitle>{item.title}</ExampleTitle>
                  <ExampleDescription>{item.description}</ExampleDescription>
                  <Evidence>{item.evidence}</Evidence>
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

export default LongReadExamples22Page
