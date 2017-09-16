'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Scale = require('d3-scale');

var _d3Array = require('d3-array');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-mixed-operators */
var BarGraph = function BarGraph(_ref) {
  var title = _ref.title,
      datax = _ref.datax,
      datay = _ref.datay,
      ytitle = _ref.ytitle,
      xtitle = _ref.xtitle,
      width = _ref.width,
      height = _ref.height,
      xticks = _ref.xticks;

  var padding = 50;

  var yscale = (0, _d3Scale.scaleLinear)().domain([0, (0, _d3Array.max)(datay) + (0, _d3Array.max)(datay) * 0.2]).range([0, height - padding * 2]);
  var xscale = (0, _d3Scale.scaleBand)().domain((0, _d3Array.range)(datax.length)).rangeRound([0, width - padding * 2]).paddingOuter(0.5).paddingInner(0.3);
  var Background = function Background() {
    return _react2.default.createElement('rect', {
      x: 0,
      y: 0,
      width: width,
      height: height,
      fill: '#FFFFFF',
      stroke: '#FFFFFF'
    });
  };
  var AxesBackground = function AxesBackground() {
    return _react2.default.createElement('rect', {
      x: padding,
      y: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: '#FFFFFF'
    });
  };
  var Title = function Title() {
    return _react2.default.createElement(
      'text',
      {
        className: _styles2.default.title,
        x: width / 2,
        y: padding / 2
      },
      title
    );
  };
  var Ylabel = function Ylabel() {
    return _react2.default.createElement(
      'text',
      {
        className: _styles2.default.ylabel,
        x: 5,
        y: height / 2,
        transform: 'rotate(270 10 ' + height / 2 + ')'
      },
      ytitle
    );
  };
  var Xlabel = function Xlabel() {
    return _react2.default.createElement(
      'text',
      {
        className: _styles2.default.xlabel,
        x: width / 2,
        y: height - 5
      },
      xtitle
    );
  };
  var Yaxis = function Yaxis() {
    return _react2.default.createElement('line', {
      x1: padding,
      x2: padding,
      y1: height - padding,
      y2: padding,
      stroke: '#FFFFFF'
    });
  };
  var Xaxis = function Xaxis() {
    return _react2.default.createElement('line', {
      x1: padding,
      x2: width - padding,
      y1: height - padding,
      y2: height - padding,
      stroke: 'black'
    });
  };
  var Yticks = function Yticks() {
    return _react2.default.createElement(
      'g',
      null,
      yscale.ticks().map(function (t) {
        return _react2.default.createElement(
          'g',
          { key: t },
          _react2.default.createElement('line', {
            x1: padding,
            x2: width - padding,
            y1: height - padding - yscale(t),
            y2: height - padding - yscale(t),
            stroke: '#BDBDBD'
          }),
          _react2.default.createElement(
            'text',
            {
              className: _styles2.default.yTickText,
              x: padding - 5,
              y: height - padding - yscale(t)
            },
            t
          )
        );
      })
    );
  };
  var Xticks = function Xticks() {
    // console.log(x)
    return _react2.default.createElement(
      'g',
      null,
      datax.map(function (x, i) {
        return _react2.default.createElement(
          'g',
          { key: 'xtick-' + x + '-' + i },
          _react2.default.createElement('line', {
            x1: padding + xscale(i),
            x2: padding + xscale(i),
            y1: height - padding,
            y2: height - padding - 5,
            stroke: 'black'
          }),
          _react2.default.createElement(
            'text',
            {
              className: _styles2.default.xTickText,
              x: padding + xscale(i),
              y: height - padding + 10
            },
            xticks && x
          )
        );
      })
    );
  };
  var Bars = function Bars() {
    return _react2.default.createElement(
      'g',
      null,
      datay.map(function (value, i) {
        return _react2.default.createElement('rect', {
          className: _styles2.default.bars,
          x: padding + xscale(i),
          y: height - padding - yscale(value),
          width: xscale.bandwidth(),
          height: yscale(value),
          fill: '#0D47A1',
          stroke: 'black',
          key: 'bar-' + value + '-' + i
        });
      })
    );
  };
  return _react2.default.createElement(
    'div',
    { className: _styles2.default.barGraph },
    _react2.default.createElement(
      'svg',
      { width: width, height: height },
      _react2.default.createElement(Background, null),
      _react2.default.createElement(AxesBackground, null),
      _react2.default.createElement(Title, null),
      _react2.default.createElement(Xlabel, null),
      _react2.default.createElement(Ylabel, null),
      _react2.default.createElement(Yaxis, null),
      _react2.default.createElement(Xaxis, null),
      _react2.default.createElement(Yticks, null),
      _react2.default.createElement(Xticks, null),
      _react2.default.createElement(Bars, null)
    )
  );
};

exports.default = BarGraph;