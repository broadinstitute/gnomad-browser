import * as fs from 'fs/promises';
import * as path from 'path';

const testVariants = require('./test-variants.json');

interface VariableMapping {
  filename: string;
  variables: Record<string, any>;
}

async function generateVariables() {
  const mappings: VariableMapping[] = [
    // gnomAD v4 standard variant
    {
      filename: 'variant-gnomad-v4-standard.json',
      variables: {
        variantId: testVariants.variants.gnomad_v4_standard.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // gnomAD v4 non-UKB
    {
      filename: 'variant-gnomad-v4-non-ukb.json',
      variables: {
        variantId: testVariants.variants.gnomad_v4_standard.variantId,
        dataset: testVariants.datasets.gnomad_v4_non_ukb
      }
    },
    // gnomAD v2
    {
      filename: 'variant-gnomad-v2.json',
      variables: {
        variantId: testVariants.variants.gnomad_v2_standard.variantId,
        dataset: testVariants.datasets.gnomad_v2
      }
    },
    // By RSID
    {
      filename: 'variant-by-rsid.json',
      variables: {
        rsid: testVariants.variants.gnomad_v4_standard.rsid,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // By VRS ID
    {
      filename: 'variant-by-vrsid.json',
      variables: {
        vrsId: testVariants.variants.gnomad_v4_standard.vrsId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Search by ID
    {
      filename: 'variant-search-by-id.json',
      variables: {
        query: testVariants.variants.gnomad_v4_standard.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Search by RSID
    {
      filename: 'variant-search-by-rsid.json',
      variables: {
        query: testVariants.variants.gnomad_v4_standard.rsid,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Search by CAID
    {
      filename: 'variant-search-by-caid.json',
      variables: {
        query: testVariants.variants.caid_example.caid,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Search ClinVar variant
    {
      filename: 'variant-search-clinvar.json',
      variables: {
        query: testVariants.variants.clinvar_variant.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Non-existent variant
    {
      filename: 'variant-non-existent.json',
      variables: {
        variantId: testVariants.variants.non_existent.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Invalid format
    {
      filename: 'variant-invalid-format.json',
      variables: {
        variantId: testVariants.variants.invalid_format.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // Multi-allelic (using same variant as standard for now)
    {
      filename: 'variant-multiallelic.json',
      variables: {
        variantId: testVariants.variants.gnomad_v4_standard.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    },
    // With flags (using same variant as standard for now)
    {
      filename: 'variant-with-flags.json',
      variables: {
        variantId: testVariants.variants.gnomad_v4_standard.variantId,
        dataset: testVariants.datasets.gnomad_v4
      }
    }
  ];

  const queriesDir = path.join(__dirname, 'queries');
  
  for (const mapping of mappings) {
    const filepath = path.join(queriesDir, mapping.filename);
    await fs.writeFile(filepath, JSON.stringify(mapping.variables));
    console.log(`Generated ${mapping.filename}`);
  }
  
  console.log(`\nGenerated ${mappings.length} variable files from test-variants.json`);
}

generateVariables().catch(console.error);