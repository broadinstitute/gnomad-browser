import React from 'react'

import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import Drawer from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'

import RegionViewerFull from '../RegionViewer/RegionViewerFull.example'
import VariantTableFullDemo from '../VariantTable/VariantTable.example'
import RegionViewerFullV1 from '../RegionViewer/RegionViewerFull-V1.example'
import RegionTableDemo from '../RegionViewer/RegionTable.example'
import TranscriptFlipOutDemo from '../RegionViewer/TranscriptFlipOut.example'
import NigiriDemo from '../Tracks/NigiriTrack/NigiriTrack.example.js'
import VDSPage from '../VDS'

import css from './styles.css'

const vdsGraphiqlURL = 'http://localhost:8020/?query=query%20test%20%7B%0A%20%20gene(gene_name%3A%20%22ZFY%22)%20%7B%0A%20%20%20%20gene_name%0A%20%20%20%20gene_id%0A%20%20%20%20chrom%0A%20%20%20%20start%0A%20%20%20%20stop%0A%20%20%20%20exome_variants%20%7B%0A%20%20%20%20%20%20contig%0A%20%20%20%20%20%20start%0A%20%20%20%20%20%20ref%0A%20%20%20%20%20%20alt%0A%20%20%20%20%20%20rsid%0A%20%20%20%20%20%20qual%0A%20%20%20%20%20%20pass%0A%20%20%20%20%20%20info%20%7B%0A%20%20%20%20%20%20%20%20CSQ%0A%20%20%20%20%20%20%20%20GQ_HIST_ALT%0A%20%20%20%20%20%20%20%20GQ_HIST_ALL%0A%20%20%20%20%20%20%20%20DP_HIST_ALL%0A%20%20%20%20%20%20%20%20DP_HIST_ALT%0A%20%20%20%20%20%20%20%20AC%0A%20%20%20%20%20%20%20%20AC_AFR%0A%20%20%20%20%20%20%20%20AC_AMR%0A%20%20%20%20%20%20%20%20AC_ASJ%0A%20%20%20%20%20%20%20%20AF_OTH%0A%20%20%20%20%20%20%20%20AF_SAS%0A%20%20%20%20%20%20%20%20BaseQRankSum%0A%20%20%20%20%20%20%20%20ClippingRankSum%0A%20%20%20%20%20%20%20%20FS%0A%20%20%20%20%20%20%20%20InbreedingCoeff%0A%20%20%20%20%20%20%20%20MQ%0A%20%20%20%20%20%20%20%20MQRankSum%0A%20%20%20%20%20%20%20%20QD%0A%20%20%20%20%20%20%20%20ReadPosRankSum%0A%20%20%20%20%20%20%20%20SOR%0A%20%20%20%20%20%20%20%20VQSLOD%0A%20%20%20%20%20%20%20%20AN%0A%20%20%20%20%20%20%20%20AN_AFR%0A%20%20%20%20%20%20%20%20AN_OTH%0A%20%20%20%20%20%20%20%20AN_SAS%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20vep%20%7B%0A%20%20%20%20%20%20%20%20variant_class%0A%20%20%20%20%20%20%20%20ancestral%0A%20%20%20%20%20%20%20%20assembly_name%0A%20%20%20%20%20%20%20%20input%0A%20%20%20%20%20%20%20%20most_severe_consequence%0A%20%20%20%20%20%20%20%20assembly_name%0A%20%20%20%20%20%20%20%20context%0A%20%20%20%20%20%20%20%20input%0A%20%20%20%20%20%20%20%20intergenic_consequences%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A&operationName=test'

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
            to={'/variant-table'}
            onClick={this.handleToggle}
          >
            <MenuItem>Variant table</MenuItem>
          </NavLink>
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
            to={'/nigiri'}
            onClick={this.handleToggle}
          >
            <MenuItem>Nigiri plot</MenuItem>
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
        <Route exact path={'/nigiri'} component={NigiriDemo} />
        <Route exact path={'/vds'} component={VDSPage} />
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
