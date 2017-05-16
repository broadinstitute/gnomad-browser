/* eslint-disable react/jsx-no-target-blank */
import React from 'react'

import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import Drawer from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'

/**
 * Components
 */
import RegionViewerDemo from '../RegionViewer/example/RegionTable.example'

import CoverageTrackDemo from '../Tracks/CoverageTrack/example/CoverageTrack.example'
import CoverageTrackMultiDemo from '../Tracks/CoverageTrack/example_multi/CoverageTrackMulti.example'
import TranscriptTrackDemo from '../Tracks/TranscriptTrack/example/TranscriptTrack.example'
import SashimiTrackDemo from '../Tracks/SashimiTrack/SashimiTrack.example'
import TableTrackDemo from '../Tracks/TableTrack/TableTrack.example'

import VariantTableDemo from '../VariantTable/VariantTable.example'

/**
 * Composite demos
 */
// import ClinvarVariantsDemo from './clinvar/ClinVar.example'
// import VepTrackDemo from './vep/Vep.example'
// import VDSPage from './vds/VdsPage.example'
import DbLofGenePageDemo from './dblof/dbLofGenePageComponents.example'
import SchizophreniaDemo from './schizophrenia/schizophrenia.example'

import css from './styles.css'

const vdsGraphiqlURL = 'http://localhost:8004'

class DrawerSimpleExample extends React.Component {

  state = { open: false }

  handleToggle = () => this.setState({ open: !this.state.open })

  render() {
    return (
      <div>
        <RaisedButton
          label="Open menu"
          onTouchTap={this.handleToggle}
        />
        <Drawer open={this.state.open}>
          <MenuItem onClick={this.handleToggle}>Close menu</MenuItem>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/'}
            onClick={this.handleToggle}
          >
            <MenuItem>Home</MenuItem>
          </NavLink>
          <MenuItem><a target="_blank" href="https://app.google.stackdriver.com/monitoring/1041370/matts-metrics-dashboard?project=exac-gnomad">GKE monitoring</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/logs/viewer?project=exac-gnomad&minLogLevel=0&expandAll=false&resource=container%2Fcluster_name%2Fgnomad-serving-cluster%2Fnamespace_id%2Fdefault">GKE logs</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/storage/browser/gnomad-browser/?project=exac-gnomad">Google storage</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/kubernetes/clusters/details/us-east1-d/spark-cluster?project=exac-gnomad">GKE container console</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8001/api/v1/proxy/namespaces/kube-system/services/kubernetes-dashboard/#/workload?namespace=default">Kubernetes dashboard</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8007/kubernetes#/topology/default">Cluster topology</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8008">Spark UI</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8012">Zeppelin notebook</a></MenuItem>
          <MenuItem><a target="_blank" href="http://gnomad-api.broadinstitute.org">gnomAD GraphiQL</a></MenuItem>
          <MenuItem><a target="_blank" href={vdsGraphiqlURL}>VDS GraphiQL</a></MenuItem>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/region-viewer'}
            onClick={this.handleToggle}
          >
            <MenuItem>Region viewer</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/transcript-track'}
            onClick={this.handleToggle}
          >
            <MenuItem>Transcript track</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/coverage-track'}
            onClick={this.handleToggle}
          >
            <MenuItem>Coverage track</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/multi-coverage-track'}
            onClick={this.handleToggle}
          >
            <MenuItem>Multi-coverage</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/sashimi-track'}
            onClick={this.handleToggle}
          >
            <MenuItem>Sashimi track</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/table-track'}
            onClick={this.handleToggle}
          >
            <MenuItem>Table track</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/variant-table'}
            onClick={this.handleToggle}
          >
            <MenuItem>Variant table</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/db-lof-gene-page-components'}
            onClick={this.handleToggle}
          >
            <MenuItem>dbLoF gene page components</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/schizophrenia'}
            onClick={this.handleToggle}
          >
            <MenuItem>Schizophrenia meta-analysis</MenuItem>
          </NavLink>
          {/*<NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/vds'}
            onClick={this.handleToggle}
          >
            <MenuItem>VDS tracks</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/vep'}
            onClick={this.handleToggle}
          >
            <MenuItem>VEP track</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/clinvar'}
            onClick={this.handleToggle}
          >
            <MenuItem>Clinvar VDS</MenuItem>
          </NavLink>*/}
        </Drawer>
      </div>
    )
  }
}

const Demo = () =>
  <Router>
    <div>
      <DrawerSimpleExample />
      <div className={css.demoArea}>
        <Route exact path={'/'} render={() => <h1>gnomAD component demos</h1>} />
        <Route exact path={'/region-viewer'} component={RegionViewerDemo} />
        <Route exact path={'/coverage-track'} component={CoverageTrackDemo} />
        <Route exact path={'/multi-coverage-track'} component={CoverageTrackMultiDemo} />
        <Route exact path={'/transcript-track'} component={TranscriptTrackDemo} />
        <Route exact path={'/sashimi-track'} component={SashimiTrackDemo} />
        <Route exact path={'/table-track'} component={TableTrackDemo} />
        <Route exact path={'/variant-table'} component={VariantTableDemo} />
        <Route exact path={'/db-lof-gene-page-components'} component={DbLofGenePageDemo} />
        <Route exact path={'/schizophrenia'} component={SchizophreniaDemo} />
        {/*<Route exact path={'/vds'} component={VDSPage} />
        <Route exact path={'/vep'} component={VepTrackDemo} />
        <Route exact path={'/clinvar'} component={ClinvarVariantsDemo} />*/}
        <Route
          exact
          path={'/graphiql'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: vdsGraphiqlURL,
                style: {
                  height: 1500,
                  width: '100%',
                },
              })
            )
          }}
        />
        <Route
          exact
          path={'/cockpit'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: 'http://localhost:8007/kubernetes#/topology/default',
                style: {
                  height: 1500,
                  width: '100%',
                },
              })
            )
          }}
        />
        <Route
          exact
          path={'/spark'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: 'http://localhost:8008',
                style: {
                  height: 1500,
                  width: '100%',
                },
              })
            )
          }}
        />
      </div>
    </div>
  </Router>

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: '#4682b4',
  },
  appBar: {
    height: 50,
  },
})

const WrappedDemo = () =>
  <MuiThemeProvider muiTheme={getMuiTheme(muiTheme)}>
    <Demo />
  </MuiThemeProvider>

export default WrappedDemo
