'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Scale = require('d3-scale');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; } /* eslint-disable react/prop-types */


var Axis = function Axis(_ref) {
  var title = _ref.title,
      css = _ref.css;

  return _react2.default.createElement(
    'div',
    { className: css.yLabel },
    title
  );
};
Axis.propTypes = {
  title: _react.PropTypes.string.isRequired
};

var VariantAxis = function VariantAxis(_ref2) {
  var title = _ref2.title,
      leftPanelWidth = _ref2.leftPanelWidth,
      css = _ref2.css;

  return _react2.default.createElement(
    'div',
    {
      style: { width: leftPanelWidth },
      className: css.variantLeftAxis
    },
    _react2.default.createElement(
      'div',
      { className: css.variantAxisName, style: { fontSize: 12 } },
      title
    )
  );
};
VariantAxis.propTypes = {
  title: _react.PropTypes.string.isRequired,
  leftPanelWidth: _react.PropTypes.number.isRequired
};

var VariantAlleleFrequency = function VariantAlleleFrequency(_ref3) {
  var css = _ref3.css,
      xScale = _ref3.xScale,
      offsetPosition = _ref3.offsetPosition,
      yPosition = _ref3.yPosition,
      color = _ref3.color,
      circleStroke = _ref3.circleStroke,
      circleStrokeWidth = _ref3.circleStrokeWidth,
      variant = _ref3.variant,
      afScale = _ref3.afScale;

  if (variant.allele_freq === 0) {
    return _react2.default.createElement('circle', {
      className: css.point,
      cx: xScale(offsetPosition),
      cy: yPosition,
      r: 1,
      fill: 'white',
      strokeWidth: circleStrokeWidth || 0,
      stroke: circleStroke || 0
    });
  }
  return _react2.default.createElement('circle', {
    className: css.point,
    cx: xScale(offsetPosition),
    cy: yPosition,
    r: afScale(variant.allele_freq),
    fill: color,
    strokeWidth: circleStrokeWidth || 0,
    stroke: circleStroke || 0
  });
};

var VariantCircle = function VariantCircle(_ref4) {
  var css = _ref4.css,
      xScale = _ref4.xScale,
      offsetPosition = _ref4.offsetPosition,
      yPosition = _ref4.yPosition,
      color = _ref4.color,
      circleRadius = _ref4.circleRadius,
      circleStroke = _ref4.circleStroke,
      circleStrokeWidth = _ref4.circleStrokeWidth;

  return _react2.default.createElement('circle', {
    className: css.point,
    cx: xScale(offsetPosition),
    cy: yPosition,
    r: circleRadius || 2,
    fill: color,
    strokeWidth: circleStrokeWidth || 0,
    stroke: circleStroke || 0
  });
};

var VariantTick = function VariantTick(_ref5) {
  var css = _ref5.css,
      xScale = _ref5.xScale,
      offsetPosition = _ref5.offsetPosition,
      yPosition = _ref5.yPosition,
      color = _ref5.color,
      tickHeight = _ref5.tickHeight,
      tickWidth = _ref5.tickWidth,
      tickStroke = _ref5.tickStroke,
      tickStrokeWidth = _ref5.tickStrokeWidth;

  return _react2.default.createElement('rect', {
    className: css.rect,
    x: xScale(offsetPosition),
    y: yPosition,
    width: tickWidth,
    height: tickHeight * 2,
    fill: color,
    strokeWidth: tickStrokeWidth || 0,
    stroke: tickStroke || 0
  });
};

var getVariantMarker = function getVariantMarker(_ref6) {
  var markerType = _ref6.markerType,
      markerKey = _ref6.markerKey,
      rest = _objectWithoutProperties(_ref6, ['markerType', 'markerKey']);

  switch (markerType) {
    case 'af':
      return _react2.default.createElement(VariantAlleleFrequency, _extends({ key: markerKey }, rest));
    case 'circle':
      return _react2.default.createElement(VariantCircle, _extends({ key: markerKey }, rest));
    case 'tick':
      return _react2.default.createElement(VariantTick, _extends({ key: markerKey }, rest));
    default:
      return _react2.default.createElement(VariantCircle, _extends({ key: markerKey }, rest));
  }
};

var setYPosition = function setYPosition(height, ySetting) {
  var yPad = 10;
  var max = height - yPad;
  var min = yPad;
  switch (ySetting) {
    case 'random':
      return Math.floor(Math.random() * (max - min) + min);
    case 'center':
      return Math.floor((max + min) / 2);
    default:
      return Math.floor(Math.random() * (max - min) + min);
  }
};

var lofColors = {
  HC: '#FF583F',
  LC: '#F0C94D'
};

var VariantTrack = function VariantTrack(_ref7) {
  var css = _ref7.css,
      title = _ref7.title,
      width = _ref7.width,
      height = _ref7.height,
      leftPanelWidth = _ref7.leftPanelWidth,
      variants = _ref7.variants,
      positionOffset = _ref7.positionOffset,
      markerConfig = _ref7.markerConfig,
      color = _ref7.color,
      rest = _objectWithoutProperties(_ref7, ['css', 'title', 'width', 'height', 'leftPanelWidth', 'variants', 'positionOffset', 'markerConfig', 'color']);

  return _react2.default.createElement(
    'div',
    { className: css.track },
    _react2.default.createElement(VariantAxis, {
      css: css,
      height: height,
      leftPanelWidth: leftPanelWidth,
      title: title
    }),
    _react2.default.createElement(
      'div',
      { className: css.data },
      _react2.default.createElement(
        'svg',
        {
          width: width,
          height: height
        },
        variants.map(function (variant, index) {
          var markerType = markerConfig.markerType,
              yPositionSetting = markerConfig.yPositionSetting,
              fillColor = markerConfig.fillColor,
              afMax = markerConfig.afMax;

          var yPosition = setYPosition(height, yPositionSetting);
          var regionViewerAttributes = positionOffset(variant.pos);
          var markerKey = title.replace(' ', '_') + '-' + index + '-' + markerType;
          var localColor = fillColor === 'lof' ? lofColors[variant.first_lof_flag] : '#757575';
          if (regionViewerAttributes === 0) return; // eslint-disable-line
          var afScale = (0, _d3Scale.scaleLog)().domain([0.00000660, afMax]).range([3, 6]);
          var childProps = _extends({
            css: css,
            index: index
          }, regionViewerAttributes, rest, markerConfig, {
            color: localColor,
            markerKey: markerKey,
            yPosition: yPosition,
            variant: variant,
            afScale: afScale
          });
          return getVariantMarker(childProps);
        })
      )
    )
  );
};
VariantTrack.propTypes = {
  css: _react.PropTypes.object,
  title: _react.PropTypes.string.isRequired,
  height: _react.PropTypes.number.isRequired,
  variants: _react.PropTypes.array.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  positionOffset: _react.PropTypes.func, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  color: _react.PropTypes.string,
  markerConfig: _react.PropTypes.object,
  activeVariant: _react.PropTypes.string
};
VariantTrack.defaultProps = {
  css: _styles2.default,
  color: 'grey',
  markerConfig: {
    markerType: 'circle',
    radius: 3,
    stroke: 'black',
    strokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: null
  }
};

exports.default = VariantTrack;