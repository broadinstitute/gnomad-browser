'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _d3Shape = require('d3-shape');

var _d3Array = require('d3-array');

var _d3Path = require('d3-path');

var _d3Scale = require('d3-scale');

var _plotting = require('../../utilities/plotting');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var CoverageTrack = function CoverageTrack(_ref) {
  var css = _ref.css,
      title = _ref.title,
      width = _ref.width,
      height = _ref.height,
      leftPanelWidth = _ref.leftPanelWidth,
      xScale = _ref.xScale,
      positionOffset = _ref.positionOffset,
      dataConfig = _ref.dataConfig,
      yTickNumber = _ref.yTickNumber,
      yMax = _ref.yMax;

  var scaleCoverage = function scaleCoverage(xScale, coverage) {
    var coverageScaled = coverage.map(function (base) {
      var newPosition = Math.floor(xScale(positionOffset(base.pos).offsetPosition));
      if (newPosition !== undefined) {
        return {
          mean: base.mean,
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

      return _extends({}, acc, _defineProperty({}, scaledPosition, base.mean));
    }, {});

    var _xScale$range = xScale.range(),
        _xScale$range2 = _slicedToArray(_xScale$range, 2),
        min = _xScale$range2[0],
        max = _xScale$range2[1];

    var final = (0, _d3Array.range)(min, max).map(function (i) {
      if (dict[i]) {
        return { scaledPosition: i, mean: dict[i] };
      }
      return { scaledPosition: i, mean: 0 };
    });
    return final;
  };

  var dataYDomainMax = yMax || (0, _plotting.getMaxMeanFromCoverageDatasets)(dataConfig);

  var yScale = (0, _d3Scale.scaleLinear)().domain([0, dataYDomainMax]).range([height, 0]);

  var dataArea = (0, _d3Shape.area)().x(function (base) {
    return base.scaledPosition;
  }).y0(function (_) {
    return height;
  }) // eslint-disable-line
  .y1(function (base) {
    return yScale(base.mean);
  });

  var dataLine = (0, _d3Shape.line)().defined(function (base) {
    return !isNaN(base.mean) && positionOffset(base.pos).offsetPosition !== undefined;
  }).x(function (base) {
    return xScale(positionOffset(base.pos).offsetPosition);
  }).y(function (base) {
    return yScale(base.mean);
  });

  var renderArea = function renderArea(dataset) {
    return _react2.default.createElement('path', {
      key: 'cov-series-' + dataset.name + '-area',
      d: dataArea(scaleCoverage(xScale, dataset.data)),
      fill: dataset.color,
      opacity: dataset.opacity
    });
  };
  var renderLine = function renderLine(dataset) {
    return _react2.default.createElement('path', {
      key: 'cov-series-' + dataset.name + '-line',
      d: dataLine(dataset.data),
      fill: 'none',
      stroke: dataset.color,
      opacity: 1,
      strokeWidth: dataset.strokeWidth
    });
  };

  var plots = dataConfig.datasets.map(function (dataset) {
    switch (dataset.type) {
      case 'area':
        return renderArea(dataset);
      case 'line':
        return renderLine(dataset);
      case 'line-area':
        return _react2.default.createElement(
          'g',
          null,
          renderArea(dataset),
          renderLine(dataset)
        );
      default:
        return renderArea(dataset);
    }
  });

  var _yScale$domain = yScale.domain(),
      _yScale$domain2 = _slicedToArray(_yScale$domain, 2),
      yScaleDomainMin = _yScale$domain2[0],
      yScaleDomainMax = _yScale$domain2[1];

  var _yScale$range = yScale.range(),
      _yScale$range2 = _slicedToArray(_yScale$range, 2),
      yScaleRangeMax = _yScale$range2[0],
      yScaleRangeMin = _yScale$range2[1];

  var incrementSize = Math.floor(yScaleDomainMax / yTickNumber);

  return _react2.default.createElement(
    'div',
    { className: css.coverageTrack },
    _react2.default.createElement(
      'div',
      {
        className: css.coverageYAxis,
        style: {
          width: leftPanelWidth
        }
      },
      _react2.default.createElement(
        'svg',
        { width: 50, height: yScaleRangeMax },
        _react2.default.createElement(
          'text',
          {
            className: css.ylabel,
            x: 10,
            y: yScaleRangeMax / 2,
            transform: 'rotate(270 10 ' + yScaleRangeMax / 2 + ')'
          },
          title
        ),
        _react2.default.createElement(
          'g',
          null,
          _react2.default.createElement(
            'text',
            {
              className: css.yticktext,
              x: 40,
              y: yScaleRangeMax
            },
            '0'
          ),
          _ramda2.default.tail((0, _d3Array.range)(yScaleDomainMin, yScaleDomainMax, incrementSize)).map(function (tick) {
            return _react2.default.createElement(
              'g',
              { key: 'ytick-' + tick },
              _react2.default.createElement(
                'text',
                {
                  className: css.yticktext,
                  x: 40,
                  y: yScaleRangeMax - yScale(tick) + 2
                },
                yScaleDomainMax - tick
              ),
              _react2.default.createElement('line', {
                className: css.ytickline,
                x1: 42,
                x2: 48,
                y1: yScaleRangeMax - yScale(tick),
                y2: yScaleRangeMax - yScale(tick),
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
      { className: css.coverageArea },
      _react2.default.createElement(
        'svg',
        {
          width: width,
          height: height
        },
        _react2.default.createElement('line', {
          x1: 0,
          x2: width,
          y1: yScaleRangeMax,
          y2: yScaleRangeMax,
          stroke: 'black',
          strokeWidth: 1
        }),
        _react2.default.createElement(
          'g',
          { className: css.coverage },
          plots
        )
      )
    )
  );
};
CoverageTrack.propTypes = {
  css: _react.PropTypes.object,
  title: _react.PropTypes.string,
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func, // eslint-disable-line
  dataConfig: _react.PropTypes.object.isRequired,
  yTickNumber: _react.PropTypes.number,
  yMax: _react.PropTypes.number
};
CoverageTrack.defaultProps = {
  title: '',
  css: _styles2.default,
  yTickNumber: 5,
  yMax: null
};

exports.default = CoverageTrack;