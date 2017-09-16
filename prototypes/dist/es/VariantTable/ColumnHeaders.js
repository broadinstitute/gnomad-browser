'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ColumnHeaders = function ColumnHeaders(_ref) {
  var setSort = _ref.setSort;

  return _react2.default.createElement(
    'table',
    { className: _styles2.default.tableHeader },
    _react2.default.createElement(
      'thead',
      null,
      _react2.default.createElement(
        'tr',
        null,
        _react2.default.createElement(
          'th',
          { className: _styles2.default.positionColumnName },
          _react2.default.createElement(
            'button',
            {
              className: _styles2.default.button,
              onClick: function onClick() {
                return setSort('variant_id');
              },
              style: {
                width: 105
              }
            },
            'Variant'
          )
        ),
        _react2.default.createElement(
          'th',
          { className: _styles2.default.carrierColumnName },
          _react2.default.createElement(
            'button',
            {
              className: _styles2.default.button,
              onClick: function onClick() {
                return setSort('allele_count');
              }
            },
            'Allele Count'
          )
        ),
        _react2.default.createElement(
          'th',
          { className: _styles2.default.totalColumnName },
          _react2.default.createElement(
            'button',
            {
              className: _styles2.default.button,
              onClick: function onClick() {
                return setSort('allele_num');
              }
            },
            'Allele Number'
          )
        ),
        _react2.default.createElement(
          'th',
          { className: _styles2.default.frequencyColumnName },
          _react2.default.createElement(
            'button',
            {
              className: _styles2.default.button,
              onClick: function onClick() {
                return setSort('allele_freq');
              }
            },
            'Frequency'
          )
        ),
        _react2.default.createElement(
          'th',
          { className: _styles2.default.homozygotesColumnName },
          _react2.default.createElement(
            'button',
            {
              className: _styles2.default.button,
              onClick: function onClick() {
                return setSort('hom_count');
              }
            },
            'Homozygotes'
          )
        )
      )
    )
  );
};
ColumnHeaders.propTypes = {
  setSort: _react.PropTypes.func.isRequired
};
exports.default = ColumnHeaders;