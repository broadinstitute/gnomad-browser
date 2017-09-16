'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-disable no-shadow */


var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _d3Shape = require('d3-shape');

var _d3Array = require('d3-array');

var _d3Path = require('d3-path');

var _d3Scale = require('d3-scale');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var SashimiTrack = function SashimiTrack(_ref) {
  var title = _ref.title,
      width = _ref.width,
      height = _ref.height,
      leftPanelWidth = _ref.leftPanelWidth,
      xScale = _ref.xScale,
      positionOffset = _ref.positionOffset,
      padding = _ref.padding,
      domainMax = _ref.domainMax,
      coverage = _ref.coverage,
      coverageColour = _ref.coverageColour,
      junctions = _ref.junctions;

  var coverageColor = coverageColour;

  var scaleCoverage = function scaleCoverage(xScale, coverage) {
    var coverageScaled = coverage.map(function (base) {
      var newPosition = Math.floor(xScale(positionOffset(base.pos).offsetPosition));
      if (newPosition !== undefined || newPosition !== NaN) {
        return {
          reading: base.reading,
          scaledPosition: newPosition
        };
      }
      return null;
    });
    var downSampled = _ramda2.default.uniqBy(function (b) {
      return b.scaledPosition;
    }, coverageScaled);
    var dict = downSampled.reduce(function (acc, base) {
      var scaledPosition = base.scaledPosition;

      return _extends({}, acc, _defineProperty({}, scaledPosition, base.reading));
    }, {});

    var _xScale$range = xScale.range(),
        _xScale$range2 = _slicedToArray(_xScale$range, 2),
        min = _xScale$range2[0],
        max = _xScale$range2[1];

    var final = (0, _d3Array.range)(min, max).map(function (i) {
      if (dict[i]) {
        return { scaledPosition: i, reading: dict[i] };
      }
      return { scaledPosition: i, reading: 0 };
    });
    return final;
  };

  var yScale = (0, _d3Scale.scaleLinear)().domain([0, domainMax]).range([200, 0]);

  var coverageArea = (0, _d3Shape.area)().x(function (base) {
    return base.scaledPosition;
  }).y0(function (_) {
    return height;
  }) // eslint-disable-line
  .y1(function (base) {
    return yScale(base.reading);
  });

  var calculateJunctionPositions = function calculateJunctionPositions(junctions) {
    var sashimiLabelSpacing = 50;

    return junctions.map(function (junction, i) {
      var _junction$positions = _slicedToArray(junction.positions, 3),
          start = _junction$positions[0],
          mid = _junction$positions[1],
          stop = _junction$positions[2];

      var startOffset = positionOffset(start.pos);
      var stopOffset = positionOffset(stop.pos);

      var startScaled = xScale(startOffset.offsetPosition);
      var stopScaled = xScale(stopOffset.offsetPosition);

      var mid1Scaled = (startScaled + stopScaled) / 2 - sashimiLabelSpacing;
      var mid2Scaled = (startScaled + stopScaled) / 2 + sashimiLabelSpacing;

      var startJunction = {
        xpos: startScaled,
        ypos: 0
      };
      var midpoint1 = {
        xpos: mid1Scaled,
        ypos: 300 * (i + 1)
      };
      var midpoint2 = {
        xpos: mid2Scaled,
        ypos: 300 * (i + 1)
      };
      var stopJunction = {
        xpos: stopScaled,
        ypos: 0
      };

      return _extends({}, junction, {
        positions: [startJunction, midpoint1, midpoint2, stopJunction]
      });
    });
  };

  var sashimiJunctionPath = function sashimiJunctionPath(junction) {
    var sashimiJunctionLine = (0, _d3Shape.line)().defined(function (junction) {
      return junction.xpos !== undefined;
    }).x(function (junction) {
      return junction.xpos;
    }).y(function (junction) {
      return yScale(junction.ypos);
    }).curve(_d3Shape.curveCatmullRom.alpha(1));

    var _junction$positions2 = _slicedToArray(junction.positions, 4),
        start = _junction$positions2[0],
        mid1 = _junction$positions2[1],
        mid2 = _junction$positions2[2],
        stop = _junction$positions2[3];

    return _react2.default.createElement(
      'g',
      null,
      _react2.default.createElement('path', {
        key: junction.series + '-' + start.xpos + '-' + stop.xpos + '-' + junction.reading,
        d: sashimiJunctionLine(junction.positions),
        fill: 'none',
        stroke: coverageColour,
        strokeWidth: 4
      }),
      _react2.default.createElement('rect', {
        x: mid1.xpos + 25,
        y: yScale(mid1.ypos + 60),
        width: 50,
        fill: 'white',
        height: 30,
        strokeWidth: 1,
        stroke: 'white'
      }),
      _react2.default.createElement(
        'text',
        {
          x: mid1.xpos + 50,
          y: yScale(mid1.ypos),
          style: { textAnchor: 'middle' }
        },
        junction.reading
      )
    );
  };

  var junctionPaths = calculateJunctionPositions(junctions).map(function (junction) {
    return sashimiJunctionPath(junction);
  });

  return _react2.default.createElement(
    'div',
    { className: _styles2.default.coverageTrack },
    _react2.default.createElement(
      'div',
      {
        className: _styles2.default.coverageYAxis,
        style: {
          width: leftPanelWidth
        }
      },
      _react2.default.createElement(
        'svg',
        { width: 50, height: height },
        _react2.default.createElement(
          'text',
          {
            className: _styles2.default.ylabel,
            x: 10,
            y: height / 2,
            transform: 'rotate(270 10 ' + height / 2 + ')'
          },
          title
        ),
        _react2.default.createElement(
          'g',
          null,
          (0, _d3Array.range)(0, 190, 10).map(function (tick) {
            return _react2.default.createElement(
              'g',
              { key: 'ytick-' + tick },
              _react2.default.createElement(
                'text',
                {
                  className: _styles2.default.yticktext,
                  x: 40,
                  y: height - tick
                },
                tick / 2
              ),
              _react2.default.createElement('line', {
                x1: 45,
                x2: 50,
                y1: height - tick,
                y2: height - tick,
                stroke: 'black',
                strokeWidth: 1,
                key: 'coverage-y-axis-' + tick
              })
            );
          })
        )
      )
    ),
    _react2.default.createElement(
      'div',
      { className: _styles2.default.coverageArea },
      _react2.default.createElement(
        'svg',
        {
          width: width,
          height: height
        },
        _react2.default.createElement('line', {
          x1: 0,
          x2: width,
          y1: height,
          y2: height,
          stroke: 'black',
          strokeWidth: 1
        }),
        _react2.default.createElement(
          'g',
          { className: _styles2.default.coverage },
          _react2.default.createElement('path', {
            d: coverageArea(scaleCoverage(xScale, coverage)),
            fill: coverageColor
          }),
          junctionPaths
        )
      )
    )
  );
};
SashimiTrack.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func, // eslint-disable-line
  coverage: _react.PropTypes.array.isRequired,
  junctions: _react.PropTypes.array.isRequired
};

exports.default = SashimiTrack;