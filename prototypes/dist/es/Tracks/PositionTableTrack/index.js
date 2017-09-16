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
  title: _react.PropTypes.string.isRequired,
  width: _react.PropTypes.number.isRequired
};

var Positions = function Positions(_ref2) {
  var width = _ref2.width,
      height = _ref2.height,
      offsetRegions = _ref2.offsetRegions,
      xScale = _ref2.xScale;
  return _react2.default.createElement(
    'svg',
    {
      width: width,
      height: height
    },
    offsetRegions.map(function (region, i) {
      return _react2.default.createElement(
        'text',
        {
          className: _styles2.default.text,
          x: xScale(region.start - region.offset),
          y: height / 2,
          key: i + '-text'
        },
        i
      );
    })
  );
};

var PositionTableTrack = function PositionTableTrack(_ref3) {
  var width = _ref3.width,
      height = _ref3.height,
      leftPanelWidth = _ref3.leftPanelWidth,
      offsetRegions = _ref3.offsetRegions,
      xScale = _ref3.xScale,
      title = _ref3.title;

  return _react2.default.createElement(
    'div',
    { className: _styles2.default.track },
    _react2.default.createElement(
      'div',
      { className: _styles2.default.yAxis },
      _react2.default.createElement(Axis, {
        height: height,
        width: leftPanelWidth,
        title: title
      })
    ),
    _react2.default.createElement(
      'div',
      { className: _styles2.default.data },
      _react2.default.createElement(Positions, {
        width: width,
        height: height,
        offsetRegions: offsetRegions,
        xScale: xScale
      }),
      _react2.default.createElement(
        'div',
        { className: _styles2.default.positionValues },
        _react2.default.createElement(
          'table',
          { className: _styles2.default.positionValuesTable, style: { width: "100%" } },
          _react2.default.createElement(
            'thead',
            null,
            _react2.default.createElement(
              'tr',
              null,
              _react2.default.createElement(
                'th',
                null,
                'index'
              ),
              _react2.default.createElement(
                'th',
                null,
                'feature_type'
              ),
              _react2.default.createElement(
                'th',
                null,
                'start'
              ),
              _react2.default.createElement(
                'th',
                null,
                'stop'
              ),
              _react2.default.createElement(
                'th',
                null,
                'size'
              ),
              _react2.default.createElement(
                'th',
                null,
                'previous region distance'
              ),
              _react2.default.createElement(
                'th',
                null,
                'offset'
              ),
              _react2.default.createElement(
                'th',
                null,
                'start scaled'
              ),
              _react2.default.createElement(
                'th',
                null,
                'stop stop scaled'
              )
            )
          ),
          _react2.default.createElement(
            'tbody',
            null,
            offsetRegions.map(function (region, i) {
              return _react2.default.createElement(
                'tr',
                { style: { backgroundColor: region.color }, key: i + '-row' },
                _react2.default.createElement(
                  'td',
                  null,
                  i
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.feature_type
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.start
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.stop
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.stop - region.start
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.previousRegionDistance
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  region.offset
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  xScale(region.start - region.offset).toPrecision(3)
                ),
                _react2.default.createElement(
                  'td',
                  null,
                  xScale(region.stop - region.offset).toPrecision(3)
                )
              );
            })
          )
        )
      )
    )
  );
};
PositionTableTrack.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func };

exports.default = PositionTableTrack;