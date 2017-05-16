import React from 'react'

import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import Drawer from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'

import RegionViewerFull from '../RegionViewer/examples/RegionViewerFull.example'
import VariantTableFullDemo from '../VariantTable/VariantTable.example'
import RegionViewerFullV1 from '../RegionViewer/examples/RegionViewerFull-V1.example'
import RegionTableDemo from '../RegionViewer/examples/RegionTable.example'
import TranscriptFlipOutDemo from '../RegionViewer/examples/TranscriptFlipOut.example'
import SashimiDemo from '../Tracks/SashimiTrack/SashimiTrack.example.js'
import GenericTableTrackDemo from '../Tracks/GenericTableTrack/GenericTableTrack.example.js'
import ClinvarVariantsDemo from '../Tracks/GenericTableTrack/ClinVar.example.js'
import VepTrackDemo from '../Tracks/VepTrack/VepTrack.example.js'
import VDSPage from '../VDS/index.js'
import InfiniteDemo from '../InfiniteTable/infinite.example.js'
import DbLofGenePageDemo from './dblof/dbLofGenePageComponents.example.js'
import SchizophreniaDemo from './schizophrenia/schizophrenia.example.js'

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
            to={'/region-table'}
            onClick={this.handleToggle}
          >
            <MenuItem>Region table</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/transcript-flip-out'}
            onClick={this.handleToggle}
          >
            <MenuItem>Multiple transcripts</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/region-viewer-full'}
            onClick={this.handleToggle}
          >
            <MenuItem>With coverage/variants</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/region-viewer-full-v1'}
            onClick={this.handleToggle}
          >
            <MenuItem>With coverage/variants v1</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/sashimi'}
            onClick={this.handleToggle}
          >
            <MenuItem>Sashimi plot</MenuItem>
          </NavLink>
          <NavLink
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
            to={'/generic-table'}
            onClick={this.handleToggle}
          >
            <MenuItem>Generic table track</MenuItem>
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
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/infinite'}
            onClick={this.handleToggle}
          >
            <MenuItem>Infinite table</MenuItem>
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
        <Route exact path={'/variant-table'} component={VariantTableFullDemo} />
        <Route exact path={'/region-table'} component={RegionTableDemo} />
        <Route exact path={'/region-viewer-full'} component={RegionViewerFull} />
        <Route exact path={'/region-viewer-full-v1'} component={RegionViewerFullV1} />
        <Route exact path={'/transcript-flip-out'} component={TranscriptFlipOutDemo} />
        <Route exact path={'/sashimi'} component={SashimiDemo} />
        <Route exact path={'/generic-table'} component={GenericTableTrackDemo} />
        <Route exact path={'/vds'} component={VDSPage} />
        <Route exact path={'/vep'} component={VepTrackDemo} />
        <Route exact path={'/clinvar'} component={ClinvarVariantsDemo} />
        <Route exact path={'/infinite'} component={InfiniteDemo} />
        <Route exact path={'/db-lof-gene-page-components'} component={DbLofGenePageDemo} />
        <Route exact path={'/schizophrenia'} component={SchizophreniaDemo} />
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
