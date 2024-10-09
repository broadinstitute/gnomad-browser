const content = `// This example uses only the JS standard library, but more sophisticated
// clients are also available. See
// https://graphql.org/community/tools-and-libraries/?tags=javascript_client

// For brevity, and to keep the focus on the JS code, we don't include every
// field from the raw query here.

query = \`
  query VariantsInGene {
    gene(gene_symbol: "BRCA1", reference_genome: GRCh38) {
      variants(dataset: gnomad_r4) {
        variant_id
        pos
        exome {
          ac
          ac_hemi
          ac_hom
          an
          af
        }
      }
    }
  }\`;

fetch("https://gnomad.broadinstitute.org/api", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ query }),
})
  .then((r) => r.json())
  .then((data) => console.log(JSON.stringify(data)));
`

export default content
