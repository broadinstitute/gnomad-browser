'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMaxMeanFromCoverageDatasets = undefined;

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getMaxMeanFromCoverageDatasets = exports.getMaxMeanFromCoverageDatasets = function getMaxMeanFromCoverageDatasets(dataConfig) {
  var joined = dataConfig.datasets.reduce(function (acc, dataset) {
    return acc.concat(dataset.data);
  }, []);
  return _ramda2.default.reduce(function (acc, value) {
    return _ramda2.default.max(acc, value.mean);
  }, 0, joined);
};