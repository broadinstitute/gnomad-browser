'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateXScale = exports.invertPositionOffset = exports.calculatePositionOffset = exports.calculateOffsetRegions = exports.assignAttributes = exports.calculateOffset = exports.addPadding = exports.calculateRegionDistances = exports.flipOrderIfNegativeStrand = exports.applyExonSubset = exports.filterRegions = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /* eslint-disable react/prop-types */
/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */


var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _d3Scale = require('d3-scale');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// const EXON_PADDING = 50
var FEATURES_TO_DISPLAY = ['CDS'];

var filterRegions = exports.filterRegions = _ramda2.default.curry(function (featureList, regions) {
  return regions.filter(function (region) {
    return _ramda2.default.contains(region.feature_type, featureList);
  });
});

var applyExonSubset = exports.applyExonSubset = _ramda2.default.curry(function (exonSubset, regions) {
  if (exonSubset) {
    var _exonSubset = _slicedToArray(exonSubset, 2),
        start = _exonSubset[0],
        stop = _exonSubset[1];

    return regions.slice(start, stop);
  }
  return regions;
});

var flipOrderIfNegativeStrand = exports.flipOrderIfNegativeStrand = function flipOrderIfNegativeStrand(regions) {
  if (_ramda2.default.all(function (region) {
    return region.strand === '-';
  }, regions)) {
    return _ramda2.default.reverse(regions);
  } else if (_ramda2.default.all(function (region) {
    return region.strand === '+';
  }, regions)) {
    return regions;
  }
  throw Error('There is mix of (+) and (-) strands...');
};

var calculateRegionDistances = exports.calculateRegionDistances = function calculateRegionDistances(regions) {
  return regions.map(function (region, i) {
    if (i === 0) {
      return _extends({}, region, {
        previousRegionDistance: 0
      });
    }
    return _extends({}, region, {
      previousRegionDistance: region.start - regions[i - 1].stop
    });
  });
};

var addPadding = exports.addPadding = _ramda2.default.curry(function (padding, regions) {
  if (padding === 0) return regions;
  return regions.reduce(function (acc, region, i) {
    var startPad = {
      feature_type: 'start_pad',
      start: region.start - padding,
      stop: region.start - 1
    };

    var endPad = {
      feature_type: 'end_pad',
      start: region.stop + 1,
      stop: region.stop + padding
    };
    if (i === 0) {
      return [region, endPad];
    }
    // check if total padding greater than distance between exons
    if (region.previousRegionDistance < padding * 2) {
      return [].concat(_toConsumableArray(_ramda2.default.init(acc)), [// remove previous end_pad
      {
        feature_type: 'intron',
        start: region.start - region.previousRegionDistance,
        stop: region.start - 1
      }, region, endPad]);
    }
    return [].concat(_toConsumableArray(acc), [startPad, region, endPad]);
  }, []);
});

var calculateOffset = exports.calculateOffset = _ramda2.default.curry(function (regions) {
  return regions.reduce(function (acc, region, i) {
    if (i === 0) return [_extends({}, region, { offset: 0 })];
    return [].concat(_toConsumableArray(acc), [_extends({}, region, {
      offset: acc[i - 1].offset + (region.start - acc[i - 1].stop)
    })]);
  }, []);
});

var defaultAttributeConfig = {
  CDS: {
    color: '#FFB33D',
    thickness: '30px'
  },
  start_pad: {
    color: '#28BCCC',
    thickness: '5px'
  },
  end_pad: {
    color: '#BEEB9F',
    thickness: '5px'
  },
  intron: {
    color: '#FF9559',
    thickness: '5px'
  },
  default: {
    color: '#grey',
    thickness: '5px'
  }
};

var assignAttributes = exports.assignAttributes = _ramda2.default.curry(function (attributeConfig, regions) {
  return regions.map(function (region) {
    var feature_type = region.feature_type;

    return _extends({}, region, {
      color: attributeConfig[feature_type].color,
      thickness: attributeConfig[feature_type].thickness
    });
  });
});

var calculateOffsetRegions = exports.calculateOffsetRegions = function calculateOffsetRegions() {
  var featuresToDisplay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : FEATURES_TO_DISPLAY;
  var attributeConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultAttributeConfig;
  var padding = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 50;
  var regions = arguments[3];
  var exonSubset = arguments[4];
  return _ramda2.default.pipe(filterRegions(featuresToDisplay), applyExonSubset(exonSubset), flipOrderIfNegativeStrand, calculateRegionDistances, addPadding(padding), calculateOffset, assignAttributes(attributeConfig))(regions);
};

var calculatePositionOffset = exports.calculatePositionOffset = _ramda2.default.curry(function (regions, position) {
  var result = 0;
  for (var i = 0; i < regions.length; i++) {
    if (position >= regions[i].start && position <= regions[i].stop) {
      result = {
        offsetPosition: position - regions[i].offset,
        color: regions[i].color
      };
    }
  }
  return result;
});

var invertPositionOffset = exports.invertPositionOffset = _ramda2.default.curry(function (regions, xScale, scaledPosition) {
  var result = 0;
  for (var i = 0; i < regions.length; i++) {
    if (scaledPosition >= xScale(regions[i].start - regions[i].offset) && scaledPosition <= xScale(regions[i].stop - regions[i].offset)) {
      result = Math.floor(xScale.invert(scaledPosition) + regions[i].offset);
    }
  }
  return result;
});

var calculateXScale = exports.calculateXScale = function calculateXScale(width, offsetRegions) {
  return (0, _d3Scale.scaleLinear)().domain([offsetRegions[0].start, offsetRegions[offsetRegions.length - 1].stop - offsetRegions[offsetRegions.length - 1].offset]).range([0, width]);
};