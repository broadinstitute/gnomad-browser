'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.groupExonsByTranscript = exports.getTranscriptsfromExons = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var getTranscriptsfromExons = exports.getTranscriptsfromExons = _ramda2.default.pipe(_ramda2.default.pluck('transcript_id'), _ramda2.default.uniq);

var groupExonsByTranscript = exports.groupExonsByTranscript = function groupExonsByTranscript(exons) {
  return exons.reduce(function (acc, exon) {
    var transcript_id = exon.transcript_id;

    if (!acc[transcript_id]) {
      return _extends({}, acc, _defineProperty({}, transcript_id, [exon]));
    }
    return _extends({}, acc, _defineProperty({}, transcript_id, [].concat(_toConsumableArray(acc[transcript_id]), [exon])));
  }, {});
};