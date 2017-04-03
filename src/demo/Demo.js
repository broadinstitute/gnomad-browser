import React from 'react'

import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import Drawer from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'

import RegionViewerFull from '../RegionViewer/RegionViewerFull.example'
import RegionViewerFullV1 from '../RegionViewer/RegionViewerFull-V1.example'
import RegionTableDemo from '../RegionViewer/RegionTable.example'
import TranscriptFlipOutDemo from '../RegionViewer/TranscriptFlipOut.example'

import css from './styles.css'

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
        <Route exact path={'/region-table'} component={RegionTableDemo} />
        <Route exact path={'/region-viewer-full'} component={RegionViewerFull} />
        <Route exact path={'/region-viewer-full-v1'} component={RegionViewerFullV1} />
        <Route exact path={'/transcript-flip-out'} component={TranscriptFlipOutDemo} />
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
