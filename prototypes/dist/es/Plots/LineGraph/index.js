'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _d3Scale = require('d3-scale');

var _d3Array = require('d3-array');

var _d3Shape = require('d3-shape');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-mixed-operators */
/* eslint-disable react/prop-types */
var LineGraph = function LineGraph(_ref) {
  var title = _ref.title,
      datax = _ref.datax,
      datay = _ref.datay,
      ytitle = _ref.ytitle,
      xtitle = _ref.xtitle,
      width = _ref.width,
      height = _ref.height;

  var data = _ramda2.default.zip(datax, datay);
  var padding = 30;

  var yscale = (0, _d3Scale.scaleLinear)().domain([0, (0, _d3Array.max)(datay) + (0, _d3Array.max)(datay) * 0.2]).range([0, height - padding * 2]);
  var xscale = (0, _d3Scale.scaleLinear)().domain([0, (0, _d3Array.max)(datax) + (0, _d3Array.max)(datax) * 0.2]).range([0, width - padding * 2]);
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
        x: 10,
        y: height / 2,
        transform: 'rotate(270 10 ' + height / 2 + ')'
      },
      xtitle
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
      ytitle
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
          { key: x },
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
            x
          )
        );
      })
    );
  };

  var LineSVG = (0, _d3Shape.line)().x(function (d) {
    return xscale(d[0]);
  }).y(function (d) {
    return yscale(d[1]);
  });

  var Line = function Line() {
    return _react2.default.createElement('path', {
      d: LineSVG(data),
      fill: 'none',
      stroke: 'blue',
      strokeWidth: 4
    });
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
      _react2.default.createElement(Line, null)
    )
  );
};

exports.default = LineGraph;