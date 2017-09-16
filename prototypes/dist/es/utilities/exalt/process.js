'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processVariantsList = exports.processVariant = exports.processAnnotations = exports.processComboAnnotations = exports.extractUniquePubMedIdsFromVariants = exports.extractPubMedIdList = exports.getPopulationDataBounds = exports.domainPopulation = exports.getDataBounds = exports.domain = exports.reshapePopulationData = exports.getMaximumConsequence = exports.getMostSevereConsequence = exports.maximumObjectProperty = exports.uniqueQualityOptions = exports.uniqueVepFields = exports.uniqueConsequences = exports.getConsequences = exports.getAnnotations = exports.POPULATIONS = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _constants = require('../../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* eslint-disable no-param-reassign */

/**
 * Extract variant consequence and annotations
 * from vep_annotations prior after fetching
 */

var POPULATIONS = exports.POPULATIONS = ['European (Non-Finnish)', 'East Asian', 'Other', 'African', 'Latino', 'South Asian', 'European (Finnish)'];

var isChange = _ramda2.default.test(/:[c]./);
var isProtein = _ramda2.default.test(/:[p]./);

// :: String -> [Array]
var packageBP = _ramda2.default.pipe(_ramda2.default.split(/:[c]./), function (i) {
  return {
    type: 'Base change',
    change: i[1],
    transcript: i[0]
  };
});
// :: String -> [Array]
var packageProtein = _ramda2.default.pipe(_ramda2.default.split(/:[p]./), function (i) {
  return {
    type: 'Protein change',
    change: i[1],
    transcript: i[0],
    residue: Number(/\d+/.exec(i[1])[0])
  };
});

// :: Variant -> [Annotations]
var shapeAnnotation = _ramda2.default.pipe(_ramda2.default.prop('vep_annotations'), _ramda2.default.pluck('HGVSp'), _ramda2.default.dropRepeats, _ramda2.default.map(_ramda2.default.pipe(_ramda2.default.cond([[isChange, packageBP], [isProtein, packageProtein], [_ramda2.default.isEmpty, _ramda2.default.always({
  type: 'none'
})]]))));

// :: Variant -> { Annotations }
var getAnnotations = exports.getAnnotations = _ramda2.default.pipe(shapeAnnotation, _ramda2.default.reduce(function (accumulator, annotation) {
  if (annotation.type === 'none') {
    return accumulator;
  }
  return {
    transcripts: _ramda2.default.uniq([].concat(_toConsumableArray(accumulator.transcripts), [annotation.transcript])),
    types: _ramda2.default.uniq([].concat(_toConsumableArray(accumulator.types), [annotation.type])),
    changes: _ramda2.default.uniq([].concat(_toConsumableArray(accumulator.changes), [annotation.change])),
    residues: _ramda2.default.uniq([].concat(_toConsumableArray(accumulator.residues), [annotation.residue]))
  };
}, {
  transcripts: [],
  types: [],
  changes: [],
  residues: []
}), function (v) {
  return {
    transcripts: v.transcripts || 'None',
    type: v.types[0] || 'None',
    change: v.changes[0] || 'None',
    residue: v.residues[0] || 'None'
  };
});

// :: Variant -> { Consequences: { consequence: count }
var getConsequences = exports.getConsequences = _ramda2.default.pipe(_ramda2.default.prop('vep_annotations'), _ramda2.default.pluck('Consequence'), _ramda2.default.map(_ramda2.default.split('&')), _ramda2.default.flatten, _ramda2.default.reduce(function (accumulator, consequence) {
  return _extends({}, accumulator, _defineProperty({}, consequence, _ramda2.default.inc(accumulator[consequence]) || 1));
}, {}));

// :: [Variants] -> [Strings]
var uniqueConsequences = exports.uniqueConsequences = _ramda2.default.pipe(_ramda2.default.pluck('vep_annotations'), _ramda2.default.map(_ramda2.default.pipe(_ramda2.default.pluck('Consequence'), _ramda2.default.map(_ramda2.default.split('&')))), _ramda2.default.flatten, _ramda2.default.uniq);

var uniqueVepFields = exports.uniqueVepFields = function uniqueVepFields(field, variants) {
  if (field === 'PolyPhen' || field === 'SIFT') {
    return _ramda2.default.pipe(_ramda2.default.pluck('vep_annotations'), _ramda2.default.map(_ramda2.default.pipe(_ramda2.default.pluck(field))), _ramda2.default.flatten, _ramda2.default.reject(_ramda2.default.isEmpty), _ramda2.default.map(function (item) {
      return _ramda2.default.split('(', item)[0];
    }), _ramda2.default.uniq)(variants);
  }
  return _ramda2.default.pipe(_ramda2.default.pluck('vep_annotations'), _ramda2.default.map(_ramda2.default.pipe(_ramda2.default.pluck(field))), _ramda2.default.flatten, _ramda2.default.uniq)(variants);
};

// :: [Variants] -> [Strings]
var uniqueQualityOptions = exports.uniqueQualityOptions = _ramda2.default.pipe(_ramda2.default.pluck('filter'), _ramda2.default.flatten, _ramda2.default.uniq);

// :: { k: v } -> k with max v
var maximumObjectProperty = exports.maximumObjectProperty = _ramda2.default.pipe(_ramda2.default.toPairs, _ramda2.default.sort(function (a, b) {
  return b[1] - a[1];
}), _ramda2.default.head, _ramda2.default.head);

// :: { k: v } -> k with max v
var getMostSevereConsequence = exports.getMostSevereConsequence = function getMostSevereConsequence(consequences) {
  var all = _constants.CATEGORY_DEFINITIONS.all;

  var mostSevereIndex = Object.keys(consequences).reduce(function (acc, consequence) {
    var severity = all.indexOf(consequence);
    if (severity < acc && severity !== -1) return severity;
    return acc;
  }, all.length);
  return all[mostSevereIndex];
};

// :: Variant -> String
var getMaximumConsequence = exports.getMaximumConsequence = _ramda2.default.pipe(getConsequences, getMostSevereConsequence);

// :: Variant -> { Object }
var reshapePopulationData = exports.reshapePopulationData = function reshapePopulationData(variant) {
  var dataSets = ['pop_ans', 'pop_acs', 'pop_homs', 'frequency'];
  var populations = Object.keys(variant[dataSets[0]]);
  var reshaped = populations.reduce(function (object, population) {
    object[population] = dataSets.reduce(function (obj, d) {
      if (d === 'frequency') {
        obj[d] = (obj.pop_acs / obj.pop_ans).toPrecision(3);
        return obj;
      }
      obj[d] = variant[d][population];
      return obj;
    }, {});
    return object;
  }, {});
  var populationData = {
    data: reshaped,
    populations: populations
  };
  return populationData;
};

var domain = exports.domain = function domain(field, variantsList) {
  return _ramda2.default.pipe(_ramda2.default.pluck(field), _ramda2.default.uniq, _ramda2.default.sort(function (a, b) {
    return a - b;
  }))(variantsList);
};

var getDataBounds = exports.getDataBounds = function getDataBounds(variantsList) {
  var fields = ['hom_count', 'allele_count', 'allele_num', 'allele_freq'];
  return fields.reduce(function (accumulator, field) {
    return _extends({}, accumulator, _defineProperty({}, field, domain(field, variantsList)));
  }, {});
};

var domainPopulation = exports.domainPopulation = function domainPopulation(population, field, variantsList) {
  return _ramda2.default.pipe(_ramda2.default.pluck('populationData'), _ramda2.default.pluck(population), _ramda2.default.pluck(field), _ramda2.default.uniq, _ramda2.default.sort(function (a, b) {
    return a - b;
  }))(variantsList);
};

var getPopulationDataBounds = exports.getPopulationDataBounds = function getPopulationDataBounds(variantsList) {
  var fields = ['pop_acs', 'pop_ans', 'pop_homs', 'frequency'];
  return POPULATIONS.reduce(function (populationAccumulator, population) {
    return _extends({}, populationAccumulator, _defineProperty({}, population, fields.reduce(function (fieldAccumulator, field) {
      return _extends({}, fieldAccumulator, _defineProperty({}, field, domainPopulation(population, field, variantsList)));
    }, {})));
  }, {});
};

// ::  Variant -> [pubmed ids]
var extractPubMedIdList = exports.extractPubMedIdList = _ramda2.default.pipe(_ramda2.default.prop('vep_annotations'), _ramda2.default.pluck('PUBMED'), _ramda2.default.map(_ramda2.default.split('&')), _ramda2.default.flatten, _ramda2.default.reject(_ramda2.default.isEmpty), _ramda2.default.uniq);

var hasPubMed = _ramda2.default.pipe(extractPubMedIdList, function (list) {
  if (list.length > 0) {
    return 'Yes';
  }
  return 'No';
});

// :: [Variants] -> [pubmed id list]
var extractUniquePubMedIdsFromVariants = exports.extractUniquePubMedIdsFromVariants = _ramda2.default.pipe(_ramda2.default.pluck('pubMedIds'), _ramda2.default.flatten, _ramda2.default.uniq);

// :: Variant -> { Object }
var processComboAnnotations = exports.processComboAnnotations = function processComboAnnotations(field, variant) {
  return _ramda2.default.pipe(_ramda2.default.prop('vep_annotations'), _ramda2.default.pluck(field), _ramda2.default.reject(_ramda2.default.isEmpty), _ramda2.default.map(_ramda2.default.pipe(_ramda2.default.split('('), function (annotation) {
    return {
      annotation: annotation[0],
      value: Number(annotation[1].split(')')[0])
    };
  })))(variant);
};

var processAnnotations = exports.processAnnotations = function processAnnotations(field, variant) {
  return _ramda2.default.pipe(_ramda2.default.prop('vep_annotations'), _ramda2.default.pluck(field), _ramda2.default.reject(_ramda2.default.isEmpty), _ramda2.default.map(function (annotation) {
    return {
      annotation: annotation
    };
  }))(variant);
};

// :: Variant -> Variant w/ added props
var processVariant = exports.processVariant = function processVariant(variant) {
  var annotations = getAnnotations(variant);
  // console.log(extractPubMedIdList(variant))
  // console.log(hasPubMed(variant))
  var lof = 'None';
  if (_ramda2.default.head(processAnnotations('LoF', variant))) {
    lof = _ramda2.default.head(processAnnotations('LoF', variant)).annotation;
  }
  return _extends({}, variant, {
    // populationData: reshapePopulationData(variant).data,
    consequences: getConsequences(variant),
    consequence: getMaximumConsequence(variant),
    annotations: annotations,
    annotationType: annotations.type,
    polyPhen: processComboAnnotations('PolyPhen', variant),
    sift: processComboAnnotations('SIFT', variant),
    bioType: processAnnotations('BIOTYPE', variant),
    impact: processAnnotations('IMPACT', variant),
    clinSig: processAnnotations('CLIN_SIG', variant),
    pubMedIds: extractPubMedIdList(variant),
    hasPubMed: hasPubMed(variant),
    lof_flags: processAnnotations('LoF', variant),
    first_lof_flag: lof
  });
};

// :: [Variants] -> [Variants w/ added props]
var processVariantsList = exports.processVariantsList = _ramda2.default.reduce(function (accumulator, variant) {
  return [].concat(_toConsumableArray(accumulator), [processVariant(variant)]);
}, []);