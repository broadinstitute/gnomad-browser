import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  margin-left: 2rem;
`

const Section = styled.div`
  margin-bottom: 1em;
`

const SectionHeader = styled.div`
  font-size: 1.1em;
  font-weight: bold;
`

const SectionList = styled.ul`
  margin-top: 0.5em;

  li {
    margin-bottom: 0.5em;
  }
`

const NumberOfVariantsInGnomadList = () => {
  return (
    <Container>
      <Section>
        <SectionHeader>Short variants</SectionHeader>
        <SectionList>
          <li>Total SNVs: 786,500,648</li>
          <li>Total InDels: 122,583,462</li>
          <li>
            Variant type totals
            <SectionList>
              <li>Synonymous: 9,643,254</li>
              <li>Missense: 16,412,219</li>
              <li>Nonsense: 726,924</li>
              <li>Frameshift: 1,186,588</li>
              <li>Canonical splice site: 542,514</li>
            </SectionList>
          </li>
        </SectionList>
      </Section>
      <Section>
        <SectionHeader>Structural variants</SectionHeader>
        <SectionList>
          <li>
            1,199,106 genome SVs
            <SectionList>
              <li>627,942 Depletions</li>
              <li>258,876 Duplications</li>
              <li>711 CNVs</li>
              <li>296,184 Insertions</li>
              <li>2,185 Inversersions</li>
              <li>13,116 Complex</li>
              <li>92 Canonical recriprocal translocations</li>
            </SectionList>
          </li>
          <li>
            {`66,826 rare (<1% AF) exome CNVs`}
            <SectionList>
              <li>30,855 Deletions</li>
              <li>35,971 Duplications</li>
            </SectionList>
          </li>
        </SectionList>
      </Section>
      <Section>
        <SectionHeader>Average number of variants per person</SectionHeader>
        <SectionList>
          <li>
            SNVs per person (<i>coming soon</i>)
          </li>
          <li>{`1 rare (<1% AF) coding CNV per individual`}</li>
          <li>11,844 SVs per genome</li>
        </SectionList>
      </Section>
    </Container>
  )
}

export default NumberOfVariantsInGnomadList
