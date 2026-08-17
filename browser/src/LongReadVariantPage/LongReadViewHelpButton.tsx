import React from 'react'

import HaplotypeHelpButton from '../Haplotypes/HelpButton'

export const AOU_SUMMARY_ONLY_MESSAGE = 'All of Us is summary-only; Haplotype View is unavailable.'

const LongReadViewHelpButton = () => (
  <HaplotypeHelpButton title="Long Read Data Views">
    <h4 style={{ margin: '0 0 8px' }}>Summary View</h4>
    <p>
      Shows aggregate variant-level statistics across the long-read callset. Each row in the table
      is a single variant with its allele frequency, type, consequence, and annotations. Use this
      view to browse what variants exist in the region, filter by type or consequence, and compare
      long-read frequencies with short-read data. This is the default view and works at any region
      size.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Haplotype View</h4>
    <p>
      Shows phased haplotype data from 292 long-read sequenced samples. Where Summary View treats
      each variant independently, Haplotype View reveals how variants are physically linked on the
      same chromosome &mdash; which variants co-occur, which are mutually exclusive, and how
      haplotype diversity is structured across genetic ancestry groups.
    </p>

    <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>Cohort availability</h4>
    <p>{AOU_SUMMARY_ONLY_MESSAGE}</p>

    <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>
      Reading the visualization
    </h4>
    <p>
      Each row in the lollipop track represents a haplotype group &mdash; a set of samples that
      share the same (or very similar) variant composition. Dots along a row mark the variants
      carried by that group. The colored bars on the left show the ancestry composition of each
      group&rsquo;s carriers. Groups are arranged by similarity clustering, so structurally related
      haplotypes appear near each other.
    </p>

    <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>Key elements</h4>
    <ul style={{ margin: '0 0 0 20px', lineHeight: 1.8 }}>
      <li>
        <strong>Lollipop dots</strong> &mdash; each dot is a variant on that haplotype. Shape
        encodes type (circle = SNV, triangle = insertion, dashed line = deletion, diamond = SV,
        rectangle = tandem repeat). Color is configurable (variant type, allele fingerprint,
        frequency, etc.).
      </li>
      <li>
        <strong>Ancestry bars</strong> &mdash; the colored sidebar shows the genetic ancestry group
        breakdown (AFR, AMR, EAS, EUR, SAS) of samples carrying each haplotype group.
      </li>
      <li>
        <strong>Clustering &amp; genealogy tree</strong> &mdash; similarity clustering groups
        haplotypes by shared variant structure. The optional genealogy tree shows hierarchical
        relationships between clusters. Adjusting the resolution slider controls how finely clusters
        are split.
      </li>
      <li>
        <strong>Accordion regions</strong> &mdash; insertions and tandem repeats can be expanded
        into &ldquo;phantom&rdquo; coordinate space so their internal structure is visible rather
        than collapsed to a single point.
      </li>
    </ul>

    <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>
      How the views complement each other
    </h4>
    <p>
      Summary View answers &ldquo;what variants are here and how common are they?&rdquo; Haplotype
      View answers &ldquo;how do these variants travel together, and how do observed haplotype
      structures vary across genetic ancestry groups?&rdquo; Clicking a variant in the table scrolls
      the haplotype track to that position, and clicking a haplotype cluster filters the table to
      its variants &mdash; the two views are cross-linked.
    </p>
  </HaplotypeHelpButton>
)

export default LongReadViewHelpButton
