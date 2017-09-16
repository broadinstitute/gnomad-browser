/* eslint-disable react/jsx-no-target-blank */
import React from 'react'

import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import Drawer from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'
import injectTapEventPlugin from 'react-tap-event-plugin'

/**
 * Components
 */
import RegionViewerDemo from '@broad/region/src/example'
import CoverageTrackDemo from '@broad/track-coverage/src/example'
import TranscriptTrackDemo from '@broad/track-transcript/src/example'
import SashimiTrackDemo from '@broad/track-sashimi/src/example'
import TableTrackDemo from '@broad/track-table/src/example'
import ManhattanDemo from '@broad/manhattan/src/example'
import StructureViewer from '@broad/structure-viewer/src/example'

import css from './styles.css'

injectTapEventPlugin()

class DrawerOpenRightExample extends React.Component {

  constructor(props) {
    super(props)
    this.state = { open: false }
  }

  handleToggle = () => this.setState({ open: !this.state.open })

  render() {
    return (
      <div>
        <RaisedButton
          label="Quick links"
          onClick={this.handleToggle}
        />
        <Drawer width={ 200 } openSecondary={ true } open={ this.state.open } >
          <MenuItem onClick={this.handleToggle}>Close menu</MenuItem>
          <MenuItem><a target="_blank" href="https://app.google.stackdriver.com/monitoring/1041370/matts-metrics-dashboard?project=exac-gnomad">GKE monitoring</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/logs/viewer?project=exac-gnomad&minLogLevel=0&expandAll=false&resource=container%2Fcluster_name%2Fgnomad-serving-cluster%2Fnamespace_id%2Fdefault">GKE logs</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/storage/browser/gnomad-browser/?project=exac-gnomad">Google storage</a></MenuItem>
          <MenuItem><a target="_blank" href="https://console.cloud.google.com/kubernetes/clusters/details/us-east1-d/spark-cluster?project=exac-gnomad">GKE container console</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8001/api/v1/proxy/namespaces/kube-system/services/kubernetes-dashboard/#/workload?namespace=default">Kubernetes dashboard</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8007/kubernetes#/topology/default">Cluster topology</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8008">Spark UI</a></MenuItem>
          <MenuItem><a target="_blank" href="http://localhost:8012">Zeppelin notebook</a></MenuItem>
          <MenuItem><a target="_blank" href="http://gnomad-api.broadinstitute.org">gnomAD GraphiQL</a></MenuItem>
        </Drawer>
      </div>
    )
  }
}

class DrawerSimpleExample extends React.Component {

  state = { open: false }

  handleToggle = () => this.setState({ open: !this.state.open })

  render() {
    return (
      <div>
        <RaisedButton
          label="Open menu"
          onClick={this.handleToggle}
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
            to={'/manhattan'}
            onClick={this.handleToggle}
          >
            <MenuItem>Manhattan</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/structure'}
            onClick={this.handleToggle}
          >
            <MenuItem>Structure viewer</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/gnomad'}
            onClick={this.handleToggle}
          >
            <MenuItem>gnomAD</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/dblof'}
            onClick={this.handleToggle}
          >
            <MenuItem>dbLoF</MenuItem>
          </NavLink>
          <NavLink
            className={css.navlink}
            activeClassName={css.active}
            exact
            to={'/schizophrenia'}
            onClick={this.handleToggle}
          >
            <MenuItem>Schizophrenia</MenuItem>
          </NavLink>
        </Drawer>
      </div>
    )
  }
}

const Demo = () =>
  <Router>
    <div>
      <div className={css.menus}>
        <DrawerSimpleExample />
        <h1 className={css.title}></h1>
        <DrawerOpenRightExample />
      </div>
      <div className={css.demoArea}>
        <Route exact path={'/'} render={() => {
            return (
              <div className={css.homePage}>
                <p className={css.subtitle}>lens is JavaScript framework for visualizing genomic data</p>
                <div className={css.features}>
                  <p>Build web portals to share results</p>
                  <p>Create ad hoc data interactive anlaysis tools</p>
                  <p>Performant with very large datasets such as gnomAD</p>
                  <p>Plot data by genomic coordinate along gene models</p>
                  <p>Filter/split/view data by annotation</p>
                  <p>Combine multiple variant datasets on the fly</p>
                </div>
              </div>
            )
          }} />
        <Route exact path={'/region-viewer'} component={RegionViewerDemo} />
        <Route exact path={'/coverage-track'} component={CoverageTrackDemo} />
        <Route exact path={'/transcript-track'} component={TranscriptTrackDemo} />
        <Route exact path={'/sashimi-track'} component={SashimiTrackDemo} />
        <Route exact path={'/table-track'} component={TableTrackDemo} />
        <Route exact path={'/manhattan'} component={ManhattanDemo} />
        <Route exact path={'/structure'} component={StructureViewer} />

        <Route
          exact
          path={'/gnomad'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: 'http://localhost:8011',
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
          path={'/dblof'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: 'http://localhost:8013',
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
          path={'/schizophrenia'}
          render={() => {
            return (
              React.createElement('iframe', {
                frameBorder: 0,
                src: 'http://localhost:8012',
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
