'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTableIndexByPosition = exports.getPositionsToFetch = exports.getXpos = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _d3Array = require('d3-array');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var getXpos = exports.getXpos = function getXpos(chr, pos) {
  var autosomes = Array.from(new Array(22), function (x, i) {
    return 'chr' + (i + 1);
  });
  var chromosomes = [].concat(_toConsumableArray(autosomes), ['chrX', 'chrY', 'chrM']);
  var chromosomeCodes = chromosomes.reduce(function (acc, chrom, i) {
    return _extends({}, acc, _defineProperty({}, chrom, i + 1));
  }, {});
  var chrStart = chromosomeCodes['chr' + chr] * 1e9;
  var xpos = chrStart + Number(pos);
  return xpos;
};

var getPositionsToFetch = exports.getPositionsToFetch = function getPositionsToFetch(position, padding, positionsWithData) {
  var first = position - padding;
  var last = position + padding;
  var toTest = (0, _d3Array.range)(first, last);

  var _R$partition = _ramda2.default.partition(function (pos) {
    return _ramda2.default.contains(pos, positionsWithData);
  }, toTest),
      _R$partition2 = _slicedToArray(_R$partition, 2),
      _ = _R$partition2[0],
      fetchThese = _R$partition2[1];

  return fetchThese;
};

var getTableIndexByPosition = exports.getTableIndexByPosition = function getTableIndexByPosition(position, variants) {
  return variants.findIndex(function (variant, i) {
    if (variants[i + 1]) {
      return position >= variant.pos && position <= variants[i + 1].pos;
    }
    return variants.length - 1;
  });
};