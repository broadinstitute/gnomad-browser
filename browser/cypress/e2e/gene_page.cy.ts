import cypressConfig from '../../cypress.config'
import { aliasQuery, aliasMutation, hasOperationName } from '../utils/graphql-test-utils'

describe('Gene Page', () => {
  beforeEach(() => {

    // intercept GraphQL requests to API and serve local mock data instead
    cy.intercept('POST', '/api/', (req) => {
      if (hasOperationName(req, 'Gene')) {
        req.alias = 'GeneReply'
        req.reply({
          fixture: 'grch37_reference_stub.json',
        })
      } else if (hasOperationName(req, 'GeneCoverage')) {
        req.alias = 'GeneCoverageReply'
        req.reply({
          fixture: 'pcsk9_coverage_stub.json',
        })
      } else if (hasOperationName(req, 'VariantsInGene')) {
        req.alias = 'VariantsInGeneReply'
        req.reply({
          fixture: 'clinvar_stub.json',
        })
      }
    })
  })

  // test nav to gene page with stubbed data
  it('Gene sample link works correctly with stubbed network requests', () => {
    cy.visit('/gene/ENSG00000169174')
    cy.contains('proprotein convertase subtilisin/kexin type 9')
    cy.url().should('include', '/gene/ENSG00000169174')
  })
})
