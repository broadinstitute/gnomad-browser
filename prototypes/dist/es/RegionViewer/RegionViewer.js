'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTapEventPlugin = require('react-tap-event-plugin');

var _reactTapEventPlugin2 = _interopRequireDefault(_reactTapEventPlugin);

var _calculateOffsets = require('../utilities/calculateOffsets');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // eslint-disable-line

(0, _reactTapEventPlugin2.default)();

var exonColor = _styles2.default.exonColor,
    paddingColor = _styles2.default.paddingColor,
    masterExonThickness = _styles2.default.masterExonThickness,
    masterPaddingThickness = _styles2.default.masterPaddingThickness;

var RegionViewer = function (_Component) {
  _inherits(RegionViewer, _Component);

  function RegionViewer() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, RegionViewer);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = RegionViewer.__proto__ || Object.getPrototypeOf(RegionViewer)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      leftPanelWidth: 100,
      rightPanelWidth: 50,
      featuresToDisplay: ['CDS'],
      ready: false
    }, _this.setWidth = function (event, newValue) {
      var newWidth = 800 * newValue;
      _this.setState({ width: newWidth });
    }, _this.setLeftPanelWidth = function (event, newValue) {
      var leftPanelWidth = Math.floor(400 * newValue);
      _this.setState({ leftPanelWidth: leftPanelWidth });
    }, _this.renderChildren = function (childProps) {
      return _react2.default.Children.map(_this.props.children, function (child) {
        if (child) {
          return _react2.default.cloneElement(child, childProps);
        }
      });
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(RegionViewer, [{
    key: 'render',
    value: function render() {
      var css = this.props.css;
      var _state = this.state,
          featuresToDisplay = _state.featuresToDisplay,
          leftPanelWidth = _state.leftPanelWidth;
      var _props = this.props,
          regions = _props.regions,
          regionAttributes = _props.regionAttributes,
          width = _props.width,
          exonSubset = _props.exonSubset,
          padding = _props.padding;


      var offsetRegions = (0, _calculateOffsets.calculateOffsetRegions)(featuresToDisplay, regionAttributes, padding, regions, exonSubset);

      var positionOffset = (0, _calculateOffsets.calculatePositionOffset)(offsetRegions);
      var xScale = (0, _calculateOffsets.calculateXScale)(width, offsetRegions);
      var invertOffset = (0, _calculateOffsets.invertPositionOffset)(offsetRegions, xScale);

      var childProps = {
        leftPanelWidth: leftPanelWidth,
        positionOffset: positionOffset,
        invertOffset: invertOffset,
        xScale: xScale,
        width: width,
        offsetRegions: offsetRegions,
        regionAttributes: regionAttributes,
        padding: padding
      };

      return _react2.default.createElement(
        'div',
        { className: css.regionViewer },
        _react2.default.createElement(
          'div',
          { style: { width: width + leftPanelWidth }, className: css.regionArea },
          this.renderChildren(childProps)
        )
      );
    }
  }]);

  return RegionViewer;
}(_react.Component);

RegionViewer.propTypes = {
  css: _react.PropTypes.object,
  regions: _react.PropTypes.array.isRequired,
  regionAttributes: _react.PropTypes.object,
  padding: _react.PropTypes.number.isRequired,
  exonSubset: _react.PropTypes.array,
  onRegionClick: _react.PropTypes.func
};
RegionViewer.defaultProps = {
  css: _styles2.default,
  exonSubset: null,
  onRegionClick: function onRegionClick() {},
  regionAttributes: {
    CDS: {
      color: exonColor,
      thickness: masterExonThickness
    },
    start_pad: {
      color: paddingColor,
      thickness: masterPaddingThickness
    },
    end_pad: {
      color: paddingColor,
      thickness: masterPaddingThickness
    },
    intron: {
      color: paddingColor,
      thickness: masterPaddingThickness
    },
    default: {
      color: 'grey',
      thickness: masterPaddingThickness
    }
  }
};
exports.default = RegionViewer;