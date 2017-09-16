'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TestComponent = function TestComponent(_ref) {
  var name = _ref.name,
      geneId = _ref.geneId;
  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(
      'h3',
      null,
      'Hello ',
      name,
      '!!'
    ),
    _react2.default.createElement(
      'p',
      null,
      'The gene is ',
      geneId
    )
  );
};

TestComponent.propTypes = {
  name: _react.PropTypes.string.isRequired,
  geneId: _react.PropTypes.string
};

exports.default = TestComponent;