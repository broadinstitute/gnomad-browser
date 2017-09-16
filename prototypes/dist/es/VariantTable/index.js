'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-disable react/prop-types */


var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _reactVirtualized = require('react-virtualized');

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var VariantTable = function VariantTable(_ref) {
  var css = _ref.css,
      title = _ref.title,
      width = _ref.width,
      height = _ref.height,
      tableConfig = _ref.tableConfig,
      tableData = _ref.tableData,
      loadLookAhead = _ref.loadLookAhead,
      loadMoreRows = _ref.loadMoreRows,
      remoteRowCount = _ref.remoteRowCount,
      overscan = _ref.overscan,
      showIndex = _ref.showIndex,
      scrollToRow = _ref.scrollToRow,
      onRowClick = _ref.onRowClick,
      scrollCallback = _ref.scrollCallback;


  var abstractCellStyle = {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 4,
    paddingBottom: 3
  };

  var normalCellStyles = {
    string: _extends({}, abstractCellStyle),
    integer: _extends({}, abstractCellStyle),
    float: _extends({}, abstractCellStyle)
  };

  var specialCellStyles = {
    filter: _extends({}, normalCellStyles.string),
    variantId: _extends({}, normalCellStyles.string),
    datasets: _extends({}, normalCellStyles.string)
  };

  var tableCellStyles = _extends({}, normalCellStyles, specialCellStyles);

  var datasetConfig = {
    exome: { color: 'rgba(70, 130, 180, 0.9)', abbreviation: 'E', border: '1px solid #000' },
    exomeFiltered: { color: 'rgba(70, 130, 180, 0.4)', abbreviation: 'E', border: '1px dashed #000' },
    genome: { color: 'rgba(115, 171, 61, 1)', abbreviation: 'G', border: '1px solid #000' },
    genomeFiltered: { color: 'rgba(115, 171, 61, 0.4)', abbreviation: 'G', border: '1px dashed #000' }
  };
  var formatDatasets = function formatDatasets(dataRow, index) {
    return dataRow.datasets.map(function (dataset) {
      if (dataset === 'all') return;
      var filter = dataRow[dataset].filter;

      var border = void 0;
      var backgroundColor = void 0;
      if (filter !== 'PASS') {
        border = datasetConfig[dataset + 'Filtered'].border;
        backgroundColor = datasetConfig[dataset + 'Filtered'].color;
      } else {
        border = datasetConfig[dataset].border;
        backgroundColor = datasetConfig[dataset].color;
      }
      return _react2.default.createElement(
        'span',
        {
          key: '' + dataset + index,
          style: {
            border: border,
            marginLeft: 10,
            padding: '1px 4px 1px 4px',
            backgroundColor: backgroundColor
          }
        },
        datasetConfig[dataset].abbreviation
      );
    });
  };

  var getFilterBackgroundColor = function getFilterBackgroundColor(filter) {
    switch (filter) {
      case 'PASS':
        return '#85C77D';
      default:
        return '#F1FF87';
    }
  };
  var formatFitler = function formatFitler(filters, index) {
    return filters.split('|').map(function (filter) {
      return _react2.default.createElement(
        'span',
        {
          key: '' + filter + index,
          style: {
            color: 'black',
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

  var formatLoF = function formatLoF(lofs, index) {
    return lofs.map(function (lof) {
      return _react2.default.createElement(
        'span',
        {
          key: '' + lof.annotation + index,
          style: {
            border: '1px solid #000',
            marginLeft: 10,
            padding: '1px 2px 1px 2px'
          }
        },
        lof.annotation || ''
      );
    });
  };

  var formatVariantId = function formatVariantId(variantId) {
    var _variantId$split = variantId.split('-'),
        _variantId$split2 = _slicedToArray(_variantId$split, 4),
        chrom = _variantId$split2[0],
        pos = _variantId$split2[1],
        ref = _variantId$split2[2],
        alt = _variantId$split2[3];

    if (alt.length > 6) {
      alt = alt.slice(0, 6) + '...';
    }
    if (ref.length > 6) {
      ref = ref.slice(0, 6) + '...';
    }
    return _react2.default.createElement(
      'span',
      { key: 'variant-id-' + variantId },
      chrom,
      ':',
      pos,
      ' ',
      ref,
      ' / ',
      alt
    );
  };

  var getDataCell = function getDataCell(field, dataRow, i) {
    var dataKey = field.dataKey,
        dataType = field.dataType,
        width = field.width;

    var cellStyle = _extends({}, tableCellStyles[dataType], {
      width: width,
      maxWidth: width,
      minWidth: width
    });
    switch (dataType) {
      case 'string':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          dataRow[dataKey]
        );
      case 'float':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          dataRow[dataKey].toPrecision(3)
        );
      case 'integer':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          dataRow[dataKey]
        );
      case 'filter':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          formatFitler(dataRow[dataKey], i)
        );
      case 'variantId':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          formatVariantId(dataRow[dataKey])
        );
      case 'datasets':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          formatDatasets(dataRow)
        );
      case 'lof':
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          formatLoF(dataRow)
        );
      default:
        return _react2.default.createElement(
          'div',
          {
            style: cellStyle,
            key: 'cell-' + dataKey + '-' + i
          },
          dataRow[dataKey]
        );
    }
  };

  var getDataRow = function getDataRow(tableConfig, dataRow, i, showIndex) {
    var cells = tableConfig.fields.map(function (field, i) {
      return getDataCell(field, dataRow, i);
    });

    var indexCell = _react2.default.createElement(
      'div',
      {
        style: _extends({}, abstractCellStyle, {
          width: 10
        }),
        key: 'cell-index-' + i
      },
      i
    );

    return _react2.default.createElement(
      'div',
      {
        className: css.row,
        onClick: function onClick(e) {
          return onRowClick(dataRow['variant_id']);
        },
        onMouseEnter: function onMouseEnter(e) {
          return onRowClick(dataRow['variant_id']);
        },
        key: 'row-' + i
      },
      showIndex && indexCell,
      cells
    );
  };

  var getHeaderCell = function getHeaderCell(field) {
    return _react2.default.createElement(
      'div',
      {
        style: {
          width: field.width + 40,
          maxWidth: field.width + 40,
          minWidth: field.width + 40
        },
        className: css.headerButtonContainer,
        key: field.title + '-header-cell'
      },
      _react2.default.createElement(
        'button',
        {
          className: css.headerButton,
          style: _extends({}, abstractCellStyle),
          onClick: function onClick(e) {
            return field.onHeaderClick(field.dataKey);
          }
        },
        field.title
      )
    );
  };

  var headers = tableConfig.fields.map(function (field) {
    return getHeaderCell(field);
  });

  var isRowLoaded = function isRowLoaded(_ref2) {
    var index = _ref2.index;

    return !!tableData[index + loadLookAhead];
  };

  var rowRenderer = function rowRenderer(_ref3) {
    var key = _ref3.key,
        index = _ref3.index,
        style = _ref3.style;

    scrollCallback(index);
    return _react2.default.createElement(
      'div',
      {
        key: key,
        style: style
      },
      getDataRow(tableConfig, tableData[index], index, showIndex)
    );
  };

  var indexHeader = _react2.default.createElement(
    'div',
    {
      key: 'index-header-cell',
      style: _extends({}, abstractCellStyle, {
        marginBottom: 5,
        width: 10,
        borderBottom: '1px solid #000'
      })
    },
    'ix'
  );
  return _react2.default.createElement(
    'div',
    { className: css.variantTable },
    _react2.default.createElement(
      'div',
      { style: { width: width } },
      _react2.default.createElement(
        'h3',
        null,
        title
      ),
      _react2.default.createElement(
        'div',
        { className: css.headers },
        showIndex && indexHeader,
        headers
      ),
      _react2.default.createElement(
        _reactVirtualized.InfiniteLoader,
        {
          isRowLoaded: isRowLoaded,
          loadMoreRows: loadMoreRows,
          rowCount: remoteRowCount
        },
        function (_ref4) {
          var onRowsRendered = _ref4.onRowsRendered,
              registerChild = _ref4.registerChild;
          return _react2.default.createElement(_reactVirtualized.List, {
            height: height,
            onRowsRendered: onRowsRendered,
            ref: registerChild,
            rowCount: remoteRowCount,
            rowHeight: 30,
            rowRenderer: rowRenderer,
            overscanRowCount: overscan,
            width: width,
            scrollToIndex: scrollToRow
          });
        }
      )
    )
  );
};
VariantTable.propTypes = {
  css: _react.PropTypes.object,
  height: _react.PropTypes.number.isRequired,
  width: _react.PropTypes.number, // eslint-disable-line
  tableConfig: _react.PropTypes.object.isRequired,
  tableData: _react.PropTypes.array.isRequired,
  loadMoreRows: _react.PropTypes.func,
  overscan: _react.PropTypes.number,
  showIndex: _react.PropTypes.bool,
  scrollToRow: _react.PropTypes.number,
  onRowClick: _react.PropTypes.func,
  // onRowHover: PropTypes.func,
  scrollCallback: _react.PropTypes.func
};
VariantTable.defaultProps = {
  css: _styles2.default,
  loadMoreRows: function loadMoreRows() {},
  overscan: 100,
  loadLookAhead: 0,
  showIndex: false,
  scrollToRow: 10,
  setCurrentVariant: function setCurrentVariant() {},
  scrollCallback: function scrollCallback() {}
};

exports.default = VariantTable;