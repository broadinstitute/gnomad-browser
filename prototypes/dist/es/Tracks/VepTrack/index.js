'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-disable react/prop-types */


var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getHeader = function getHeader(field) {
  return _react2.default.createElement(
    'th',
    { key: field.title + '-header-cell' },
    field.title
  );
};

var abstractCellStyle = {
  paddingLeft: 20,
  paddingRight: 20
};

var normalCellStyles = {
  string: _extends({}, abstractCellStyle),
  integer: _extends({}, abstractCellStyle),
  float: _extends({}, abstractCellStyle)
};

var specialCellStyles = {
  filter: _extends({}, normalCellStyles.string)
};

var tableCellStyles = _extends({}, normalCellStyles, specialCellStyles);

var getFilterBackgroundColor = function getFilterBackgroundColor(filter) {
  switch (filter) {
    case 'PASS':
      return '#85C77D';
    default:
      return '#F1FF87';
  }
};
var formatFitler = function formatFitler(filters) {
  return filters.split('|').map(function (filter) {
    return _react2.default.createElement(
      'span',
      {
        style: {
          border: '1px solid #000',
          marginLeft: 10,
          padding: '1px 2px 1px 2px',
          backgroundColor: getFilterBackgroundColor(filter)
        }
      },
      filter
    );
  });
};

var getDataCell = function getDataCell(dataKey, cellDataType, dataRow, i) {
  switch (cellDataType) {
    case 'string':
      return _react2.default.createElement(
        'td',
        {
          style: tableCellStyles[cellDataType],
          key: 'cell-' + dataKey + '-' + i
        },
        dataRow[dataKey]
      );
    case 'float':
      return _react2.default.createElement(
        'td',
        {
          style: tableCellStyles[cellDataType],
          key: 'cell-' + dataKey + '-' + i
        },
        dataRow[dataKey].toPrecision(3)
      );
    case 'integer':
      return _react2.default.createElement(
        'td',
        {
          style: tableCellStyles[cellDataType],
          key: 'cell-' + dataKey + '-' + i
        },
        dataRow[dataKey]
      );
    case 'filter':
      return _react2.default.createElement(
        'td',
        {
          style: tableCellStyles[cellDataType],
          key: 'cell-' + dataKey + '-' + i
        },
        formatFitler(dataRow[dataKey])
      );
    default:
      return _react2.default.createElement(
        'td',
        {
          style: tableCellStyles[cellDataType],
          key: 'cell-' + dataKey + '-' + i
        },
        dataRow[dataKey]
      );
  }
};

var getDataRow = function getDataRow(tableConfig, dataRow, i) {
  var cells = tableConfig.fields.map(function (field, i) {
    return getDataCell(field.dataKey, field.dataType, dataRow, i);
  });
  return _react2.default.createElement(
    'tr',
    { style: { backgroundColor: '#e0e0e0' }, key: 'row-' + i },
    cells
  );
};

var PositionTableTrack = function PositionTableTrack(_ref) {
  var title = _ref.title,
      height = _ref.height,
      tableConfig = _ref.tableConfig,
      tableData = _ref.tableData;

  var headers = tableConfig.fields.map(function (field) {
    return getHeader(field);
  });
  var rows = tableData.map(function (rowData, i) {
    return getDataRow(tableConfig, rowData, i);
  });

  return _react2.default.createElement(
    'div',
    { className: _styles2.default.track },
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h3',
        null,
        title
      ),
      _react2.default.createElement(
        'table',
        { className: _styles2.default.genericTableTrack, style: { width: '100%' } },
        _react2.default.createElement(
          'thead',
          null,
          _react2.default.createElement(
            'tr',
            null,
            headers
          )
        ),
        _react2.default.createElement(
          'tbody',
          null,
          rows
        )
      )
    )
  );
};
PositionTableTrack.propTypes = {
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  leftPanelWidth: _react.PropTypes.number, // eslint-disable-line
  xScale: _react.PropTypes.func, // eslint-disable-line
  positionOffset: _react.PropTypes.func, // eslint-disable-line
  tableConfig: _react.PropTypes.object.isRequired,
  tableData: _react.PropTypes.array.isRequired
};

exports.default = PositionTableTrack;