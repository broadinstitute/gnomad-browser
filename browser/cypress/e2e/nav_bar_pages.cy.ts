import cypressConfig from '../../cypress.config'
import { aliasQuery, aliasMutation, hasOperationName } from '../utils/graphql-test-utils'

describe('Home Page', () => {
  // make sure basics of the page succesfully load
  it('Home page loads successfully', () => {
    cy.visit('/')

    // Make sure the page has the landing splash
    cy.contains('Genome Aggregation Database')
    cy.contains('gnomAD browser')

    // Make sure page content headers are there
    cy.contains('New to gnomAD?')
    cy.contains('About')

    // Check content contained in dataset selector dropdown
    cy.contains('gnomAD v2.1.1')
    cy.get('select').eq(1).select(['gnomAD v3.1.2'])
    cy.contains('gnomAD v2.1.1')
    cy.contains('gnomAD v3.1.2')
    cy.contains('gnomAD SVs v2.1')
    cy.contains('ExAC')

  })

  // json for each header page for ease of iterating for tests
  const headerPages = {
    pages: [
      {
        pageTitle: 'About',
        pageUrl: '/about',
        pageHeader: 'About gnomAD',
      },
      {
        pageTitle: 'Team',
        pageUrl: '/team',
        pageHeader: 'The gnomAD Team',
      },
      // news - in seperate application, test there instead?
      // changelog - same as above
      {
        pageTitle: 'Downloads',
        pageUrl: '/downloads',
        pageHeader: 'Google Cloud Public Datasets',
      },
      {
        pageTitle: 'Policies',
        pageUrl: '/policies',
        pageHeader: 'gnomAD Ethics Policy',
      },
      {
        pageTitle: 'Publications',
        pageUrl: '/publications',
        pageHeader: 'publications by the gnomAD group',
      },
      {
        pageTitle: 'Feedback',
        pageUrl: '/feedback',
        pageHeader: 'Tell us how you use gnomAD',
      },
      {
        pageTitle: 'Help',
        pageUrl: '/help',
        pageHeader: 'Table of contents',
      },
    ],
  }

  // test that each nav bar link correctly loads the respective page
  headerPages.pages.forEach((route) => {
    it(route.pageTitle + ' header link works correctly', () => {
      cy.visit('/')
      cy.contains(route.pageTitle).click()

      // ensure the route loads the correct page
      cy.contains('gnomAD browser')
      cy.contains(route.pageHeader)
      cy.url().should('include', route.pageUrl)
    })
  })
})
