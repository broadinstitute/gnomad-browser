'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineDataForTable = exports.combineVariantData = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-disable dot-notation */
/* eslint-disable no-return-assign */
/* eslint-disable consistent-return */

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var add = function add(next, variant, field) {
  if (!next[field]) {
    return Number(variant[field]);
  }
  return Number(next[field]) + Number(variant[field]);
};

var addNested = function addNested(next, variant, field) {
  if (!variant[field]) return;
  var keys = Object.keys(variant[field]);
  if (!next[field]) return variant[field];
  return keys.reduce(function (acc, key) {
    return _extends({}, acc, _defineProperty({}, key, next[field][key] + variant[field][key]));
  }, {});
};

/**
 * `combineVariantData` takes an array of variants and
 * stores/combines/sums fields based on a fields object. Variants
 * with identical `variant_id` fields are reduced under a single
 * index with original datasets preserved under field `dataset`
 * with summed/common data at the top level of the object and also
 * stored under 'all'
 * @param {object} fields what to do with each field
 * @param {array} variants variants from multiple datasets
 * @returns {object} variantsCombined indexed by variant_id
*/

var combineVariantData = exports.combineVariantData = _ramda2.default.curry(function (fields, variants) {
  return _ramda2.default.reduce(function (acc, variant) {
    var variant_id = variant.variant_id;

    var next = _extends({}, acc[variant_id]);
    fields.constantFields.forEach(function (field) {
      return next[field] = variant[field];
    });
    fields.sumFields.forEach(function (field) {
      return next[field] = add(next, variant, field);
    });
    fields.nestedSumFields.forEach(function (field) {
      return next[field] = addNested(next, variant, field);
    });
    next['allele_freq'] = next.allele_count / next.allele_num;
    if (!next['datasets']) {
      next['datasets'] = ['all', variant.dataset];
    } else {
      next['datasets'] = [].concat(_toConsumableArray(next['datasets']), [variant.dataset]);
    }
    next[variant.dataset] = fields.uniqueFields.reduce(function (acc, field) {
      return _extends({}, acc, _defineProperty({}, field, variant[field]));
    }, {});
    next.all = fields.uniqueFields.reduce(function (acc, field) {
      return _extends({}, acc, _defineProperty({}, field, next[field]));
    }, {});
    return _extends({}, acc, _defineProperty({}, variant_id, next));
  }, {})(variants);
});

var convertToList = function convertToList(mergedVariants) {
  return Object.keys(mergedVariants).map(function (v) {
    return mergedVariants[v];
  }).sort(function (a, b) {
    return a.pos - b.pos;
  });
};

var addQualityResults = _ramda2.default.map(function (variant) {
  var results = variant.datasets.slice(1, variant.datasets.length).map(function (dataset) {
    return {
      dataset: dataset,
      filter: variant[dataset].filter
    };
  });
  var resultList = _ramda2.default.pluck('filter', results);
  var pass = void 0;
  if (_ramda2.default.all(function (result) {
    return result === 'PASS';
  }, resultList)) {
    pass = 'all';
  } else if (_ramda2.default.none(function (result) {
    return result === 'PASS';
  }, resultList)) {
    pass = 'none';
  } else {
    pass = results.find(function (result) {
      return result.filter === 'PASS';
    }).dataset;
  }
  return _extends({}, variant, {
    pass: pass
  });
});

var combineDataForTable = exports.combineDataForTable = function combineDataForTable(variants, fields) {
  return _ramda2.default.pipe(combineVariantData(fields), convertToList, addQualityResults)(variants);
};