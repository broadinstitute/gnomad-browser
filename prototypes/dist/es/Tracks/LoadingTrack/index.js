'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable react/prop-types */
var Axis = function Axis(_ref) {
  var height = _ref.height,
      title = _ref.title,
      width = _ref.width;

  return _react2.default.createElement(
    'div',
    { className: _styles2.default.yLabel },
    title
  );
};
Axis.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number.isRequired
};

var LoadingAxis = function LoadingAxis(_ref2) {
  var title = _ref2.title,
      leftPanelWidth = _ref2.leftPanelWidth;

  return _react2.default.createElement(
    'div',
    {
      style: { width: leftPanelWidth },
      className: _styles2.default.loadingLeftAxis
    },
    _react2.default.createElement(
      'div',
      { className: _styles2.default.loadingAxisName, style: { fontSize: 12 } },
      title
    )
  );
};
LoadingAxis.propTypes = {
  leftPanelWidth: _react.PropTypes.number.isRequired
};

var LoadingTrack = function LoadingTrack(_ref3) {
  var width = _ref3.width,
      height = _ref3.height,
      leftPanelWidth = _ref3.leftPanelWidth;

  return _react2.default.createElement(
    'div',
    { className: _styles2.default.track },
    _react2.default.createElement(LoadingAxis, {
      height: height,
      leftPanelWidth: leftPanelWidth
    }),
    _react2.default.createElement(
      'div',
      { className: _styles2.default.data },
      'Loading'
    )
  );
};
LoadingTrack.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number };

exports.default = LoadingTrack;