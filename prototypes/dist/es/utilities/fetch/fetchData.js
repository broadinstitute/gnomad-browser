'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchTranscriptsByGeneName = exports.fetchAllByGeneName = exports.test = undefined;

var _graphqlFetch = require('graphql-fetch');

var _graphqlFetch2 = _interopRequireDefault(_graphqlFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var API_URL = process.env.API_URL;

var test = exports.test = function test() {
  return 'this is a test';
};

var fetchAllByGeneName = exports.fetchAllByGeneName = function fetchAllByGeneName(geneName) {
  var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : API_URL;

  var query = '\n  {\n    gene(gene_name: "' + geneName + '") {\n      gene_id\n      gene_name\n      start\n      stop\n      exome_coverage {\n        pos\n        mean\n      }\n      genome_coverage {\n        pos\n        mean\n      }\n      transcript {\n        exons {\n          feature_type\n          start\n          stop\n          strand\n        }\n      }\n      exons {\n        _id\n        start\n        transcript_id\n        feature_type\n        strand\n        stop\n        chrom\n        gene_id\n      }\n      exome_variants {\n        chrom\n        pos\n        ref\n        alt\n        variant_id\n        allele_num\n        allele_freq\n        allele_count\n        hom_count\n      }\n      genome_variants {\n        chrom\n        pos\n        ref\n        alt\n        variant_id\n        allele_num\n        allele_freq\n        allele_count\n        hom_count\n      }\n  }\n}';
  return new Promise(function (resolve, reject) {
    (0, _graphqlFetch2.default)(url)(query).then(function (data) {
      return resolve(data.data.gene);
    }).catch(function (error) {
      console.log(error);
      reject(error);
    });
  });
};

var fetchTranscriptsByGeneName = exports.fetchTranscriptsByGeneName = function fetchTranscriptsByGeneName(geneName) {
  var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : API_URL;

  var query = '\n  {\n    gene(gene_name: "' + geneName + '") {\n      gene_id\n      gene_name\n      start\n      stop\n      exons {\n        _id\n        start\n        transcript_id\n        feature_type\n        strand\n        stop\n        chrom\n        gene_id\n      }\n      transcript {\n        exons {\n          feature_type\n          start\n          stop\n          strand\n        }\n      }\n  }\n}';
  return new Promise(function (resolve, reject) {
    (0, _graphqlFetch2.default)(url)(query).then(function (data) {
      return resolve(data.data.gene);
    }).catch(function (error) {
      console.log(error);
      reject(error);
    });
  });
};