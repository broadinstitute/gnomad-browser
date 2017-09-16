"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import fewerTranscripts from './transcript-flip-out-less.svg'
// import moreTranscripts from './transcript-flip-out-more.svg'

var fewerTranscripts = _react2.default.createElement(
  "svg",
  null,
  _react2.default.createElement("rect", { x: "13.2", y: "16.7", width: "9.5", height: "9.1" }),
  _react2.default.createElement("rect", { x: "24.6", y: "16.7", width: "18.3", height: "9.1" }),
  _react2.default.createElement("rect", { x: "44.8", y: "16.7", width: "28.8", height: "9.1" }),
  _react2.default.createElement("rect", { x: "75.4", y: "16.7", width: "9.5", height: "9.1" })
);

var moreTranscripts = _react2.default.createElement(
  "svg",
  null,
  _react2.default.createElement("rect", { x: "14.5", y: "10.4", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "25.8", y: "10.4", width: "18.3", height: "3.7" }),
  _react2.default.createElement("rect", { x: "46.1", y: "10.4", width: "28.8", height: "3.7" }),
  _react2.default.createElement("rect", { x: "14.5", y: "15.9", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "76.7", y: "10.4", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "25.8", y: "15.9", width: "18.3", height: "3.7" }),
  _react2.default.createElement("rect", { x: "46.1", y: "15.9", width: "28.8", height: "3.7" }),
  _react2.default.createElement("rect", { x: "14.5", y: "21.5", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "76.7", y: "21.5", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "46.1", y: "21.5", width: "28.8", height: "3.7" }),
  _react2.default.createElement("rect", { x: "14.5", y: "27.1", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "76.7", y: "27.1", width: "9.5", height: "3.7" }),
  _react2.default.createElement("rect", { x: "25.8", y: "27.1", width: "18.3", height: "3.7" })
);

var TranscriptFlipOutButton = function TranscriptFlipOutButton(_ref) {
  var css = _ref.css,
      localHeight = _ref.localHeight,
      leftPanelWidth = _ref.leftPanelWidth,
      onClick = _ref.onClick;

  return _react2.default.createElement(
    "div",
    { className: css.transcriptFlipOutButtonContainer },
    _react2.default.createElement(
      "button",
      {
        className: css.transcriptFlipOutButton,
        style: {
          height: localHeight - 10,
          width: leftPanelWidth - 10
        },
        onClick: onClick
      },
      "+"
    )
  );
};
TranscriptFlipOutButton.propTypes = {
  css: _react.PropTypes.object.isRequired,
  localHeight: _react.PropTypes.number.isRequired,
  leftPanelWidth: _react.PropTypes.number.isRequired,
  onClick: _react.PropTypes.func.isRequired
};
exports.default = TranscriptFlipOutButton;