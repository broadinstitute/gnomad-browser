import { ExternalLink } from '@gnomad/ui'
import React from 'react'
import styled from 'styled-components'

import InlineList from '../InlineList'
import { getCategoryFromConsequence } from '../vepConsequences'
import { LofteeFilter, LofteeFlag } from './Loftee'
import TranscriptConsequencePropType from './TranscriptConsequencePropType'

const AttributeName = styled.dt`
  display: inline;

  ::after {
    content: ': ';
  }
`

const AttributeValue = styled.dd`
  display: inline;
  margin: 0;
`

const AttributeList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
`

type AttributeProps = {
  children: React.ReactNode
  name: string
}

const Attribute = ({ children, name }: AttributeProps) => (
  <div style={{ marginTop: '0.25em' }}>
    <AttributeName>{name}</AttributeName>
    <AttributeValue>{children}</AttributeValue>
  </div>
)

const Marker = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;

  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid #000;
    border-radius: 5px;
    background: ${(props: any) => props.color};
  }
`

const colors = {
  red: '#FF583F',
  yellow: '#F0C94D',
  green: 'green',
}

const lofteeAnnotationMarker = (consequence: any) => {
  switch (consequence.lof) {
    case 'HC':
      return <Marker color={colors.green} />
    case 'OS':
      return null
    case 'LC':
    default:
      return <Marker color={colors.red} />
  }
}

const lofteeAnnotationDescription = (consequence: any) => {
  switch (consequence.lof) {
    case 'HC':
      return 'High-confidence'
    case 'OS':
      return 'Other splice (beta)'
    case 'LC':
      return (
        <span>
          Low-confidence (
          {consequence.lof_filter
            .split(',')
            .map((filter: any) => <LofteeFilter key={filter} filter={filter} />)
            .reduce(
              (acc: any, el: any, i: any) => (i === 0 ? [...acc, el] : [...acc, ' ', el]),
              []
            )}
          )
        </span>
      )
    default:
      return consequence.lof
  }
}

const PREFERRED_DOMAIN_DATABASES = new Set(['Pfam'])

const renderDomain = (domain: any) => {
  if (domain.database === 'Pfam') {
    return (
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      <ExternalLink href={`https://pfam.xfam.org/family/${domain.name}`}>
        {domain.name} ({domain.database})
      </ExternalLink>
    )
  }

  return `${domain.name} (${domain.database})`
}

type TranscriptConsequenceProteinDomainsProps = {
  consequence: TranscriptConsequencePropType
}

const TranscriptConsequenceProteinDomains = ({
  consequence,
}: TranscriptConsequenceProteinDomainsProps) => {
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const domains = consequence.domains
    .map((domain) => {
      const [database, name] = domain.split(':')
      return { database: database.replace(/_domains?/, ''), name }
    })
    .sort((domain1, domain2) => {
      if (
        PREFERRED_DOMAIN_DATABASES.has(domain1.database) &&
        !PREFERRED_DOMAIN_DATABASES.has(domain2.database)
      ) {
        return -1
      }
      if (
        !PREFERRED_DOMAIN_DATABASES.has(domain1.database) &&
        PREFERRED_DOMAIN_DATABASES.has(domain2.database)
      ) {
        return 1
      }

      return domain1.database.localeCompare(domain2.database)
    })

  return <InlineList items={domains.map(renderDomain)} label="Protein domains" maxLength={2} />
}

type TranscriptConsequenceProps = {
  consequence: TranscriptConsequencePropType
}

const TranscriptConsequence = ({ consequence }: TranscriptConsequenceProps) => {
  const category = getCategoryFromConsequence(consequence.major_consequence)

  let consequenceSpecificAttributes = null

  if (category === 'missense') {
    const polyphenColor =
      {
        benign: colors.green,
        possibly_damaging: colors.yellow,
        // @ts-expect-error TS(2538) FIXME: Type 'undefined' cannot be used as an index type.
      }[consequence.polyphen_prediction] || colors.red

    const siftColor = consequence.sift_prediction === 'tolerated' ? colors.green : colors.red

    consequenceSpecificAttributes = (
      <>
        {consequence.polyphen_prediction && (
          <Attribute name="Polyphen">
            <Marker color={polyphenColor} /> {consequence.polyphen_prediction}
          </Attribute>
        )}
        {consequence.sift_prediction && (
          <Attribute name="SIFT">
            <Marker color={siftColor} /> {consequence.sift_prediction}
          </Attribute>
        )}
      </>
    )
  } else if (
    // "NC" annotations were removed from the data pipeline some time ago.
    // Some ExAC variants still have them.
    consequence.lof === 'NC' ||
    (category === 'lof' && !consequence.lof) // See https://github.com/broadinstitute/gnomad-browser/issues/364
  ) {
    consequenceSpecificAttributes = (
      <>
        {consequence.domains && consequence.domains.length > 0 && (
          <Attribute name="Domains">{consequence.domains.join(', ')}</Attribute>
        )}
        <Attribute name="pLoF">
          <Marker color={colors.red} /> Low-confidence (Non-protein-coding transcript)
        </Attribute>
      </>
    )
  } else if (consequence.lof) {
    consequenceSpecificAttributes = (
      <>
        <Attribute name="pLoF">
          {lofteeAnnotationMarker(consequence)} {lofteeAnnotationDescription(consequence)}
        </Attribute>
        {consequence.lof_flags && (
          <Attribute name="Flag">
            <Marker color={colors.yellow} />{' '}
            {consequence.lof_flags
              .split(',')
              .map((flag) => <LofteeFlag key={flag} flag={flag} />)
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              .reduce((acc, el, i) => (i === 0 ? [...acc, el] : [...acc, ' ', el]), [])}
          </Attribute>
        )}
      </>
    )
  }

  return (
    <AttributeList>
      {consequence.hgvsp ? (
        <Attribute name="HGVSp">{consequence.hgvsp}</Attribute>
      ) : (
        <Attribute name="HGVSc">{consequence.hgvsc}</Attribute>
      )}
      {consequence.domains && consequence.domains.length > 0 && (
        <Attribute name="Domains">
          <TranscriptConsequenceProteinDomains consequence={consequence} />
        </Attribute>
      )}
      {consequenceSpecificAttributes}
    </AttributeList>
  )
}

export default TranscriptConsequence
