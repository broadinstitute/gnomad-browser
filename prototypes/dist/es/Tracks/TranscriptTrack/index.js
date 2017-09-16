'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactMotion = require('react-motion');

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _transcriptFlipOutButton = require('./transcriptFlipOutButton');

var _transcriptFlipOutButton2 = _interopRequireDefault(_transcriptFlipOutButton);

var _calculateOffsets = require('../../utilities/calculateOffsets');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; } /* eslint-disable react/prop-types */

// import FlatButton from 'material-ui/FlatButton'
// import ContentAdd from 'material-ui/svg-icons/content/add'

// eslint-disable-line

var TranscriptAxis = function TranscriptAxis(_ref) {
  var css = _ref.css,
      title = _ref.title,
      leftPanelWidth = _ref.leftPanelWidth,
      fontSize = _ref.fontSize,
      expandTranscriptButton = _ref.expandTranscriptButton;

  return _react2.default.createElement(
    'div',
    { style: { width: leftPanelWidth }, className: css.transcriptLeftAxis },
    _react2.default.createElement(
      'div',
      { style: { fontSize: fontSize }, className: css.transcriptName },
      expandTranscriptButton || title
    )
  );
};
TranscriptAxis.propTypes = {
  title: _react.PropTypes.string,
  leftPanelWidth: _react.PropTypes.number.isRequired
};

var TranscriptDrawing = function TranscriptDrawing(_ref2) {
  var css = _ref2.css,
      width = _ref2.width,
      height = _ref2.height,
      regions = _ref2.regions,
      xScale = _ref2.xScale,
      positionOffset = _ref2.positionOffset,
      isMaster = _ref2.isMaster;

  return _react2.default.createElement(
    'svg',
    {
      width: width,
      height: height
    },
    _react2.default.createElement('rect', {
      className: css.transcriptTrackBackground,
      x: 0,
      y: 0,
      width: width,
      height: height,
      stroke: 'none'
    }),
    _react2.default.createElement('line', {
      className: css.transcriptTrackLine,
      x1: 0,
      x2: width,
      y1: height / 2,
      y2: height / 2,
      strokeWidth: 2
    }),
    regions.map(function (region, i) {
      var start = positionOffset(region.start);
      var stop = positionOffset(region.stop);
      var localThickness = void 0;
      if (isMaster) {
        localThickness = region.thickness;
      } else {
        localThickness = css.flipOutExonThickness;
      }
      if (start.offsetPosition !== undefined && stop.offsetPosition !== undefined) {
        return _react2.default.createElement('line', {
          className: css.rectangle,
          x1: xScale(start.offsetPosition),
          x2: xScale(stop.offsetPosition),
          y1: height / 2,
          y2: height / 2,
          stroke: start.color,
          strokeWidth: localThickness,
          key: i + '-rectangle2'
        });
      }
    })
  );
};

var Transcript = function Transcript(_ref3) {
  var css = _ref3.css,
      width = _ref3.width,
      height = _ref3.height,
      leftPanelWidth = _ref3.leftPanelWidth,
      regions = _ref3.regions,
      xScale = _ref3.xScale,
      title = _ref3.title,
      positionOffset = _ref3.positionOffset,
      isMaster = _ref3.isMaster,
      fanOut = _ref3.fanOut,
      motionHeight = _ref3.motionHeight,
      paddingTop = _ref3.paddingTop,
      paddingBottom = _ref3.paddingBottom,
      fontSize = _ref3.fontSize,
      opacity = _ref3.opacity;

  var localHeight = void 0;
  if (motionHeight !== undefined) {
    localHeight = motionHeight;
  } else {
    localHeight = height;
  }
  var expandTranscriptButton = void 0;
  if (isMaster) {
    localHeight = 40;
    paddingTop = 2;
    paddingBottom = 2;
    expandTranscriptButton = _react2.default.createElement(_transcriptFlipOutButton2.default, {
      css: css,
      localHeight: localHeight,
      leftPanelWidth: leftPanelWidth,
      onClick: fanOut
    });
  }
  return _react2.default.createElement(
    'div',
    {
      style: {
        height: localHeight,
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        opacity: opacity
      },
      className: css.transcriptContainer
    },
    _react2.default.createElement(TranscriptAxis, {
      css: css,
      leftPanelWidth: leftPanelWidth,
      title: title,
      fontSize: fontSize,
      expandTranscriptButton: expandTranscriptButton
    }),
    _react2.default.createElement(
      'div',
      { className: css.transcriptData },
      _react2.default.createElement(TranscriptDrawing, {
        css: css,
        width: width,
        height: localHeight,
        regions: regions,
        xScale: xScale,
        positionOffset: positionOffset,
        isMaster: isMaster
      })
    )
  );
};
Transcript.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func };

var TranscriptGroup = function TranscriptGroup(_ref4) {
  var css = _ref4.css,
      transcriptsGrouped = _ref4.transcriptsGrouped,
      fanOutButtonOpen = _ref4.fanOutButtonOpen,
      initialTranscriptStyles = _ref4.initialTranscriptStyles,
      finalTranscriptStyles = _ref4.finalTranscriptStyles,
      rest = _objectWithoutProperties(_ref4, ['css', 'transcriptsGrouped', 'fanOutButtonOpen', 'initialTranscriptStyles', 'finalTranscriptStyles']);

  var transcriptGroup = _react2.default.createElement(
    'div',
    { className: css.transcriptsGrouped },
    Object.keys(transcriptsGrouped).map(function (transcript, index) {
      var transcriptExonsFiltered = (0, _calculateOffsets.filterRegions)(['CDS'], transcriptsGrouped[transcript]);
      if (_ramda2.default.isEmpty(transcriptExonsFiltered)) {
        return;
      }
      var style = fanOutButtonOpen ? finalTranscriptStyles(index) : initialTranscriptStyles();
      return _react2.default.createElement(
        _reactMotion.Motion,
        { style: style, key: index },
        function (_ref5) {
          var top = _ref5.top,
              paddingTop = _ref5.paddingTop,
              paddingBottom = _ref5.paddingBottom,
              fontSize = _ref5.fontSize,
              opacity = _ref5.opacity;

          return _react2.default.createElement(Transcript, _extends({
            css: css,
            title: transcript,
            motionHeight: top,
            paddingTop: paddingTop,
            paddingBottom: paddingBottom,
            fontSize: fontSize,
            opacity: opacity,
            regions: transcriptExonsFiltered
          }, rest));
        }
      );
    })
  );
  return _react2.default.createElement(
    'div',
    null,
    transcriptGroup
  );
};
TranscriptGroup.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func };

var TranscriptTrack = function (_Component) {
  _inherits(TranscriptTrack, _Component);

  function TranscriptTrack() {
    var _ref6;

    var _temp, _this, _ret;

    _classCallCheck(this, TranscriptTrack);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref6 = TranscriptTrack.__proto__ || Object.getPrototypeOf(TranscriptTrack)).call.apply(_ref6, [this].concat(args))), _this), _this.state = {
      fanOutButtonOpen: false
    }, _this.config = {
      stiffness: 1000,
      damping: 50
    }, _this.fanOut = function () {
      if (!_this.state.fanOutButtonOpen) {
        _this.setState({ fanOutButtonOpen: true });
      } else {
        _this.setState({ fanOutButtonOpen: false });
      }
    }, _this.initialTranscriptStyles = function () {
      return {
        top: (0, _reactMotion.spring)(0, _this.config),
        paddingTop: 0,
        paddingBottom: 0,
        fontSize: 0,
        opacity: 1
      };
    }, _this.finalTranscriptStyles = function (childIndex) {
      var deltaY = (childIndex + 1) * 2;
      return {
        top: (0, _reactMotion.spring)(_this.props.height, _this.config),
        paddingTop: 2,
        paddingBottom: 2,
        fontSize: 11,
        opacity: 1
      };
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(TranscriptTrack, [{
    key: 'render',
    value: function render() {
      var transcriptGroup = void 0;
      // console.log(this.props.position)
      if (this.props.transcriptsGrouped) {
        transcriptGroup = _react2.default.createElement(TranscriptGroup, _extends({
          transcriptsGrouped: this.props.geneExons,
          fanOutButtonOpen: this.state.fanOutButtonOpen,
          initialTranscriptStyles: this.initialTranscriptStyles,
          finalTranscriptStyles: this.finalTranscriptStyles
        }, this.props));
      }
      return _react2.default.createElement(
        'div',
        {
          className: this.props.css.track
        },
        _react2.default.createElement(Transcript, _extends({
          isMaster: true, fanOut: this.fanOut,
          regions: this.props.offsetRegions
        }, this.props)),
        transcriptGroup
      );
    }
  }]);

  return TranscriptTrack;
}(_react.Component);

TranscriptTrack.PropTypes = {
  css: _react.PropTypes.object,
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func };


TranscriptTrack.defaultProps = {
  css: _styles2.default
};

exports.default = TranscriptTrack;