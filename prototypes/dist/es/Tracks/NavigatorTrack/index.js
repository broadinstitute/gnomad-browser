'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactCursorPosition = require('react-cursor-position');

var _reactCursorPosition2 = _interopRequireDefault(_reactCursorPosition);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _utilities = require('../../utilities');

var _d3Array = require('d3-array');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable react/prop-types */
var NavigatorAxis = function NavigatorAxis(_ref) {
  var css = _ref.css,
      title = _ref.title,
      height = _ref.height,
      leftPanelWidth = _ref.leftPanelWidth;

  return _react2.default.createElement(
    'div',
    {
      style: { width: leftPanelWidth },
      className: css.loadingLeftAxis
    },
    _react2.default.createElement(
      'div',
      {
        className: css.loadingAxisName,
        style: {
          height: height,
          fontSize: 12
        }
      },
      title
    )
  );
};
// import R from 'ramda'

NavigatorAxis.propTypes = {
  leftPanelWidth: _react.PropTypes.number.isRequired
};

var ClickArea = function ClickArea(_ref2) {
  var css = _ref2.css,
      height = _ref2.height,
      width = _ref2.width,
      positionOffset = _ref2.positionOffset,
      invertOffset = _ref2.invertOffset,
      xScale = _ref2.xScale,
      position = _ref2.position,
      isPositionOutside = _ref2.isPositionOutside,
      scrollSync = _ref2.scrollSync,
      currentNavigatorPosition = _ref2.currentNavigatorPosition,
      onNavigatorClick = _ref2.onNavigatorClick,
      variants = _ref2.variants,
      currentVariant = _ref2.currentVariant,
      variantSort = _ref2.variantSort;

  var sortVariants = function sortVariants(variants, _ref3) {
    var key = _ref3.key,
        ascending = _ref3.ascending;
    return ascending ? variants.sort(function (a, b) {
      return a[key] - b[key];
    }) : variants.sort(function (a, b) {
      return b[key] - a[key];
    });
  };
  var sortedVariants = sortVariants(variants, variantSort);

  var currentlyVisibleVariants = sortedVariants.slice(scrollSync, scrollSync + 15);

  console.log(currentlyVisibleVariants);

  var tablePositionStart = _ramda2.default.head(currentlyVisibleVariants).pos;
  var tablePositionStop = _ramda2.default.last(currentlyVisibleVariants).pos;

  var tableRectPadding = 10;
  var tableRectStart = xScale(positionOffset(tablePositionStart).offsetPosition) - tableRectPadding;
  var tableRectStop = xScale(positionOffset(tablePositionStop).offsetPosition);
  var tableRectWidth = tableRectStop - tableRectStart + tableRectPadding;

  var variantPositions = currentlyVisibleVariants.map(function (v) {
    return {
      x: xScale(positionOffset(v.pos).offsetPosition),
      variant_id: v.variant_id,
      color: v.variant_id === currentVariant ? 'yellow' : 'red'
    };
  });

  var variantMarks = variantPositions.map(function (v, i) {
    return _react2.default.createElement(
      'g',
      null,
      v.variant_id === currentVariant && _react2.default.createElement('circle', {
        key: 'variant-active-circle',
        cx: v.x,
        cy: height / 3,
        r: 10,
        fill: 'rgba(0,0,0,0)',
        strokeWidth: 1,
        stroke: 'black',
        strokeDasharray: '3, 3'
      }),
      _react2.default.createElement('circle', {
        key: 'variant-' + v + '-' + i,
        cx: v.x,
        cy: height / 3,
        r: 5,
        fill: v.color,
        strokeWidth: 1,
        stroke: 'black'
      })
    );
  });
  var PositionMarks = function PositionMarks() {
    var tickHeight = 3;
    var numberOfTicks = 10;
    var textRotationDegrees = 0;
    var textXOffsetFromTick = 0;
    var textYOffsetFromTick = 7;
    var tickPositions = (0, _d3Array.range)(0, width, width / numberOfTicks);
    var tickGenomePositions = tickPositions.map(function (t) {
      return { x: t, label: invertOffset(t) };
    });

    var tickDrawing = function tickDrawing(x, genomePositionLabel) {
      return _react2.default.createElement(
        'g',
        { key: 'tick-' + x + '-axis' },
        _react2.default.createElement('line', {
          className: css.xTickLine,
          x1: x,
          x2: x,
          y1: height - 2,
          y2: height - 2 - tickHeight,
          stroke: 'black',
          strokeWidth: 1
        }),
        _react2.default.createElement(
          'text',
          {
            className: css.xTickText,
            x: x + textXOffsetFromTick,
            y: height - textYOffsetFromTick,
            transform: 'rotate(' + (360 - textRotationDegrees) + ' ' + x + ' ' + height + ')'
          },
          genomePositionLabel
        )
      );
    };

    var axisTicksDrawing = _ramda2.default.tail(tickGenomePositions.map(function (_ref4) {
      var x = _ref4.x,
          label = _ref4.label;
      return tickDrawing(x, label);
    }));

    return _react2.default.createElement(
      'g',
      null,
      _react2.default.createElement('line', {
        className: css.xAxisLine,
        x1: 0 + 2,
        x2: width - 2,
        y1: height - 1,
        y2: height - 1,
        stroke: 'black',
        strokeWidth: 1
      }),
      _react2.default.createElement('line', {
        className: css.yAxisLine,
        x1: 1,
        x2: 1,
        y1: height - 7,
        y2: height,
        stroke: 'black',
        strokeWidth: 1
      }),
      _react2.default.createElement('line', {
        className: css.yAxisLine,
        x1: width - 1,
        x2: width - 1,
        y1: height - 7,
        y2: height,
        stroke: 'black',
        strokeWidth: 1
      }),
      axisTicksDrawing
    );
  };

  var navigatorBoxBottomPadding = 20;
  var navigatorBoxTopPadding = 2;

  return _react2.default.createElement(
    'svg',
    {
      className: css.areaClick,
      width: width,
      height: height,
      onClick: function onClick(_) {
        var genomePos = invertOffset(position.x);
        var tableIndex = (0, _utilities.getTableIndexByPosition)(genomePos, variants);
        onNavigatorClick(tableIndex, genomePos);
      }
    },
    _react2.default.createElement('rect', {
      className: css.navigatorContainerRect,
      x: 0,
      y: 0,
      width: width,
      height: height
    }),
    variantSort.key === 'pos' && _react2.default.createElement('rect', {
      className: css.tablePositionRect,
      x: tableRectStart,
      y: 0 + navigatorBoxTopPadding,
      width: tableRectWidth,
      height: height - navigatorBoxBottomPadding,
      strokeDasharray: '5, 5'
    }),
    !isPositionOutside && _react2.default.createElement('rect', {
      className: css.cursorPositionRect,
      x: position.x - 15,
      y: 0 + navigatorBoxTopPadding,
      width: 30,
      height: height - navigatorBoxBottomPadding,
      strokeDasharray: '5, 5'
    }),
    variantMarks,
    _react2.default.createElement(PositionMarks, null)
  );
};

var NavigatorTrack = function NavigatorTrack(props) {
  var css = props.css;

  return _react2.default.createElement(
    'div',
    { className: css.track },
    _react2.default.createElement(NavigatorAxis, {
      css: css,
      title: props.title,
      height: props.height,
      leftPanelWidth: props.leftPanelWidth
    }),
    _react2.default.createElement(
      _reactCursorPosition2.default,
      { className: css.cursorPosition },
      _react2.default.createElement(ClickArea, props)
    )
  );
};
NavigatorTrack.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number };
NavigatorTrack.defaultProps = {
  css: _styles2.default
};

exports.default = NavigatorTrack;