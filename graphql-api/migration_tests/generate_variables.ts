import * as fs from 'fs/promises';
import * as path from 'path';

const testData = require('./test-identifiers.json');

interface VariableMapping {
  filename: string;
  variables: Record<string, any>;
}

function cleanDescription(obj: any): any {
    const { description, ...rest } = obj;
    return rest;
}

async function generateVariables() {
  const mappings: VariableMapping[] = [
    // === Existing Mappings (adapted for new config) ===
    {
      filename: 'variant-gnomad-v4-standard.json',
      variables: {
        variantId: testData.variants.v4_liftover_target.variantId,
        dataset: testData.datasets.gnomad_r4
      }
    },
    {
      filename: 'variant-gnomad-v4-non-ukb.json',
      variables: {
        variantId: testData.variants.v4_liftover_target.variantId,
        dataset: testData.datasets.gnomad_r4_non_ukb
      }
    },
    {
      filename: 'variant-gnomad-v2.json',
      variables: {
        variantId: testData.variants.v2_liftover_source.variantId,
        dataset: testData.datasets.gnomad_r2_1
      }
    },
    {
      filename: 'variant-by-rsid.json',
      variables: {
        rsid: testData.variants.v4_liftover_target.rsid,
        dataset: testData.datasets.gnomad_r4
      }
    },
    {
      filename: 'variant-by-vrsid.json',
      variables: {
        vrsId: testData.variants.v4_liftover_target.vrsId,
        dataset: testData.datasets.gnomad_r4
      }
    },
    {
        filename: 'variant-search-by-id.json',
        variables: {
            query: testData.variants.v4_liftover_target.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-search-by-rsid.json',
        variables: {
            query: testData.variants.v4_liftover_target.rsid,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-search-by-caid.json',
        variables: {
            query: testData.variants.caid_example.caid,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-search-clinvar.json',
        variables: {
            query: testData.variants.clinvar_variant.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-non-existent.json',
        variables: {
            variantId: testData.variants.non_existent.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-invalid-format.json',
        variables: {
            variantId: testData.variants.invalid_format.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-multiallelic.json',
        variables: {
            variantId: testData.variants.v4_liftover_target.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'variant-with-flags.json',
        variables: {
            variantId: testData.variants.v4_liftover_target.variantId,
            dataset: testData.datasets.gnomad_r4
        }
    },
    
    // === NEW MAPPINGS FROM REAL BROWSER QUERIES ===

    // --- Variant Pages ---
    {
        filename: 'variant-page-v4.json',
        variables: {
            datasetId: testData.datasets.gnomad_r4,
            includeLocalAncestry: true,
            includeLiftoverAsSource: false,
            includeLiftoverAsTarget: true,
            referenceGenome: testData.reference_genomes.grch38,
            variantId: testData.variants.v4_liftover_target.variantId
        }
    },
    {
        filename: 'variant-page-v3.json',
        variables: {
            datasetId: testData.datasets.gnomad_r3,
            includeLiftoverAsSource: false,
            includeLiftoverAsTarget: true,
            referenceGenome: testData.reference_genomes.grch38,
            variantId: testData.variants.v3_liftover_target.variantId
        }
    },
    {
        filename: 'variant-page-v2.json',
        variables: {
            datasetId: testData.datasets.gnomad_r2_1,
            includeLiftoverAsSource: true,
            includeLiftoverAsTarget: false,
            referenceGenome: testData.reference_genomes.grch37,
            variantId: testData.variants.v2_liftover_source.variantId
        }
    },
    {
        filename: 'variant-page-exac.json',
        variables: {
            datasetId: testData.datasets.exac,
            includeLiftoverAsSource: true,
            includeLiftoverAsTarget: false,
            referenceGenome: testData.reference_genomes.grch37,
            variantId: testData.variants.exac_liftover_source.variantId
        }
    },

    // --- Gene Pages ---
    {
        filename: 'gene-page-grch38.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            referenceGenome: testData.reference_genomes.grch38,
            shortTandemRepeatDatasetId: testData.datasets.gnomad_r3,
            includeShortTandemRepeats: true
        }
    },
    {
        filename: 'gene-page-grch37.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            referenceGenome: testData.reference_genomes.grch37,
            shortTandemRepeatDatasetId: testData.datasets.gnomad_r3,
            includeShortTandemRepeats: false
        }
    },
    {
        filename: 'gene-coverage-v4.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            datasetId: testData.datasets.gnomad_r4,
            referenceGenome: testData.reference_genomes.grch38,
            includeExomeCoverage: true,
            includeGenomeCoverage: true
        }
    },
    {
        filename: 'gene-coverage-v3.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            datasetId: testData.datasets.gnomad_r3,
            referenceGenome: testData.reference_genomes.grch38,
            includeExomeCoverage: false,
            includeGenomeCoverage: true
        }
    },
    {
        filename: 'gene-coverage-v2.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            datasetId: testData.datasets.gnomad_r2_1,
            referenceGenome: testData.reference_genomes.grch37,
            includeExomeCoverage: true,
            includeGenomeCoverage: true
        }
    },
     {
        filename: 'gene-coverage-exac.json',
        variables: {
            geneId: testData.genes.pcsk9.geneId,
            datasetId: testData.datasets.exac,
            referenceGenome: testData.reference_genomes.grch37,
            includeExomeCoverage: true
        }
    },
    {
        filename: 'variants-in-gene-v4.json',
        variables: {
            datasetId: testData.datasets.gnomad_r4,
            geneId: testData.genes.pcsk9.geneId,
            referenceGenome: testData.reference_genomes.grch38,
        }
    },
    {
        filename: 'variants-in-gene-v2.json',
        variables: {
            datasetId: testData.datasets.gnomad_r2_1,
            geneId: testData.genes.pcsk9.geneId,
            referenceGenome: testData.reference_genomes.grch37
        } 
    },
    {
        filename: 'variants-in-gene-exac.json',
        variables: {
            datasetId: testData.datasets.exac,
            geneId: testData.genes.pcsk9.geneId,
            referenceGenome: testData.reference_genomes.grch37
        }
    },

    // --- Region Pages ---
    {
        filename: 'region-page-v4.json',
        variables: {
            ...cleanDescription(testData.regions.grch38_pcs_k9_locus),
            referenceGenome: testData.reference_genomes.grch38,
            includeShortTandemRepeats: true,
            shortTandemRepeatDatasetId: testData.datasets.gnomad_r3
        }
    },
    {
        filename: 'region-page-v2.json',
        variables: {
            ...cleanDescription(testData.regions.grch37_pcsk9_locus),
            referenceGenome: testData.reference_genomes.grch37,
            includeShortTandemRepeats: false,
            shortTandemRepeatDatasetId: testData.datasets.gnomad_r3
        }
    },
    {
        filename: 'region-coverage-v4.json',
        variables: {
            ...cleanDescription(testData.regions.grch38_pcs_k9_locus),
            datasetId: testData.datasets.gnomad_r4,
            referenceGenome: testData.reference_genomes.grch38,
            includeExomeCoverage: true,
            includeGenomeCoverage: true
        }
    },
    {
        filename: 'region-coverage-v2.json',
        variables: {
            ...cleanDescription(testData.regions.grch37_pcsk9_locus),
            datasetId: testData.datasets.gnomad_r2_1,
            referenceGenome: testData.reference_genomes.grch37,
            includeExomeCoverage: true,
            includeGenomeCoverage: true
        }
    },
    {
        filename: 'variants-in-region-v4.json',
        variables: {
            ...cleanDescription(testData.regions.grch38_pcs_k9_locus),
            datasetId: testData.datasets.gnomad_r4,
            referenceGenome: testData.reference_genomes.grch38,
        }
    },
    {
        filename: 'variants-in-region-v3.json',
        variables: {
            ...cleanDescription(testData.structural_variant_regions.grch38_example),
            datasetId: testData.datasets.gnomad_r3,
            referenceGenome: testData.reference_genomes.grch38,
        }
    },
    {
        filename: 'variants-in-region-v2.json',
        variables: {
            ...cleanDescription(testData.regions.grch37_pcsk9_locus),
            datasetId: testData.datasets.gnomad_r2_1,
            referenceGenome: testData.reference_genomes.grch37,
        }
    },
    
    // --- Transcript Pages ---
    {
        filename: 'transcript-page-v4.json',
        variables: {
            transcriptId: testData.transcripts.pcsk9_canonical.transcriptId,
            referenceGenome: testData.reference_genomes.grch38
        }
    },
    {
        filename: 'transcript-page-v2.json',
        variables: {
            transcriptId: testData.transcripts.pcsk9_canonical.transcriptId,
            referenceGenome: testData.reference_genomes.grch37
        }
    },
    {
        filename: 'transcript-coverage-v4.json',
        variables: {
            transcriptId: testData.transcripts.pcsk9_canonical.transcriptId,
            datasetId: testData.datasets.gnomad_r4,
            referenceGenome: testData.reference_genomes.grch38,
            includeExomeCoverage: true,
            includeGenomeCoverage: true
        }
    },
    {
        filename: 'variants-in-transcript-v4.json',
        variables: {
            datasetId: testData.datasets.gnomad_r4,
            transcriptId: testData.transcripts.pcsk9_canonical.transcriptId,
            referenceGenome: testData.reference_genomes.grch38,
        }
    },

    // --- Other/Misc Pages ---
    {
        filename: 'structural-variants-in-region-v4.json',
        variables: {
            datasetId: testData.datasets.gnomad_sv_r4,
            ...cleanDescription(testData.structural_variant_regions.grch38_example),
            referenceGenome: testData.reference_genomes.grch38
        }
    },
    {
        filename: 'short-tandem-repeats-all.json',
        variables: {
            datasetId: testData.datasets.gnomad_r4
        }
    },
    {
        filename: 'mitochondrial-variant-page-v4.json',
        variables: {
            datasetId: testData.datasets.gnomad_r4,
            variantId: testData.mitochondrial_variants.example.variantId,
            referenceGenome: testData.reference_genomes.grch38
        }
    },
    {
        filename: 'variant-cooccurrence-v2.json',
        variables: {
            ...cleanDescription(testData.cooccurrence_variants.example),
            datasetId: testData.datasets.gnomad_r2_1
        }
    }
  ];

  const queriesDir = path.join(__dirname, 'queries');
  
  for (const mapping of mappings) {
    const filepath = path.join(queriesDir, mapping.filename);
    await fs.writeFile(filepath, JSON.stringify(mapping.variables, null, 2));
    console.log(`Generated ${mapping.filename}`);
  }
  
  console.log(`\nGenerated ${mappings.length} variable files from test-identifiers.json`);
}

generateVariables().catch(console.error);