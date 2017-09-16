'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _DropDownMenu = require('material-ui/DropDownMenu');

var _DropDownMenu2 = _interopRequireDefault(_DropDownMenu);

var _MenuItem = require('material-ui/MenuItem');

var _MenuItem2 = _interopRequireDefault(_MenuItem);

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

var _utilities = require('../utilities');

var _transcriptTools = require('../utilities/transcriptTools');

var _RegionViewer = require('../RegionViewer');

var _RegionViewer2 = _interopRequireDefault(_RegionViewer);

var _TranscriptTrack = require('../Tracks/TranscriptTrack');

var _TranscriptTrack2 = _interopRequireDefault(_TranscriptTrack);

var _VariantTrack = require('../Tracks/VariantTrack');

var _VariantTrack2 = _interopRequireDefault(_VariantTrack);

var _LoadingTrack = require('../Tracks/LoadingTrack');

var _LoadingTrack2 = _interopRequireDefault(_LoadingTrack);

var _styles = require('./styles.css');

var _styles2 = _interopRequireDefault(_styles);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* eslint-disable camelcase */
// eslint-disable-line

// eslint-disable-line

var API_URL = 'http://localhost:8012/graphql';

var fetchVariantsFromHail = function fetchVariantsFromHail(geneName) {
  // const query = `{"query": "query test($geneName: String!) {gene(gene_name: $geneName) { gene_name exome_variants { start info { CSQ GQ_HIST_ALT GQ_HIST_ALL DP_HIST_ALL BaseQRankSum ClippingRankSum FS InbreedingCoeff MQ MQRankSum QD ReadPosRankSum SOR VQSLOD AN AN_AFR AN_AMR AN_ASJ AN_EAS AN_FIN AN_NFE AN_OTH AN_SAS}}}}", "variables": {"geneName": "${geneName}"}}`
  var query = '{"query": "query test($geneName: String!) {gene(gene_name: $geneName) { genome_variants { start consequence } exome_variants { start }}}", "variables": {"geneName": "' + geneName + '"}}';

  var header = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });

  return new Promise(function (resolve, reject) {
    (0, _isomorphicFetch2.default)(API_URL, {
      method: 'POST',
      body: query,
      headers: header
    }).then(function (response) {
      resolve(response.json());
    }).catch(function (error) {
      console.log(error);
      reject(error);
    });
  });
};

var VDSPage = function (_Component) {
  _inherits(VDSPage, _Component);

  function VDSPage() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, VDSPage);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = VDSPage.__proto__ || Object.getPrototypeOf(VDSPage)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      hasData: false,
      variantsFetched: false,
      currentGene: 'PCSK9',
      testGenes: ['PCSK9', 'ZNF658', 'MYH9', 'FMR1', 'BRCA2', 'CFTR', 'FBN1', 'TP53', 'SCN5A', 'MYH7', 'MYBPC3', 'ARSF', 'CD33', 'DMD', 'TTN', 'SRY', 'UTY', 'ZFY']
    }, _this.fetchTranscripts = function () {
      (0, _utilities.fetchTranscriptsByGeneName)(_this.state.currentGene).then(function (data) {
        _this.setState({ transcriptData: data });
        _this.setState({ hasData: true });
      });
    }, _this.fetchVariants = function () {
      fetchVariantsFromHail(_this.state.currentGene).then(function (data) {
        // console.log(data)
        _this.setState({ variantData: data.data.gene });
        _this.setState({ variantsFetched: true });
      });
    }, _this.handleChange = function (event, index, value) {
      _this.setState({ currentGene: value });
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(VDSPage, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.fetchTranscripts();
      this.fetchVariants();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(_, previousState) {
      if (previousState.currentGene !== this.state.currentGene) {
        this.fetchTranscripts();
        this.fetchVariants();
      }
    }
  }, {
    key: 'render',
    value: function render() {
      if (!this.state.hasData) {
        return _react2.default.createElement(
          'p',
          { className: _styles2.default.cool },
          'Loading!'
        );
      }
      var geneExons = this.state.transcriptData.exons;
      var canonicalExons = this.state.transcriptData.transcript.exons;
      var attributeConfig = {
        CDS: {
          color: '#424242',
          thickness: '30px'
        },
        start_pad: {
          color: '#e0e0e0',
          thickness: '5px'
        },
        end_pad: {
          color: '#e0e0e0',
          thickness: '5px'
        },
        intron: {
          color: '#e0e0e0',
          thickness: '5px'
        },
        default: {
          color: '#grey',
          thickness: '5px'
        }
      };
      var markerConfigCircle = {
        markerType: 'circle',
        circleRadius: 3,
        circleStroke: 'black',
        circleStrokeWidth: 1,
        yPositionSetting: 'random',
        fillColor: 'lof'
      };
      var markerConfigAll = _extends({}, markerConfigCircle, {
        markerType: 'circle',
        fillColor: '#757575',
        yPositionSetting: 'random',
        afMax: 0.005
      });
      var transcriptsGrouped = (0, _transcriptTools.groupExonsByTranscript)(geneExons);
      var variantsComponent0 = _react2.default.createElement(_LoadingTrack2.default, { height: 25 });
      var variantsComponent1 = _react2.default.createElement(_LoadingTrack2.default, { height: 25 });
      var variantsComponent2 = _react2.default.createElement(_LoadingTrack2.default, { height: 25 });
      var variantsComponent3 = _react2.default.createElement(_LoadingTrack2.default, { height: 25 });
      if (this.state.variantsFetched) {
        var exome_variants = this.state.variantData.exome_variants;
        var genome_variants = this.state.variantData.genome_variants;
        var exomeVariantsRdy = exome_variants.map(function (v) {
          return _extends({}, v, { pos: v.start });
        });
        var genomeVariantsRdy = genome_variants.map(function (v) {
          return _extends({}, v, { pos: v.start });
        });
        var missense = genomeVariantsRdy.filter(function (v) {
          return v.consequence === 'missense_variant';
        });
        var frame = genomeVariantsRdy.filter(function (v) {
          return v.consequence === 'frameshift_variant';
        });
        variantsComponent0 = _react2.default.createElement(_VariantTrack2.default, {
          title: 'all exome variants',
          height: 70,
          variants: exomeVariantsRdy,
          markerConfig: markerConfigAll
        });
        variantsComponent1 = _react2.default.createElement(_VariantTrack2.default, {
          title: 'all genome variants',
          height: 70,
          variants: genomeVariantsRdy,
          markerConfig: markerConfigAll
        });
        variantsComponent2 = _react2.default.createElement(_VariantTrack2.default, {
          title: 'Missense variants',
          height: 70,
          variants: missense,
          markerConfig: markerConfigAll
        });
        variantsComponent3 = _react2.default.createElement(_VariantTrack2.default, {
          title: 'Frameshift variants',
          height: 70,
          variants: frame,
          markerConfig: markerConfigAll
        });
      }

      return _react2.default.createElement(
        'div',
        { className: _styles2.default.page },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            _DropDownMenu2.default,
            { value: this.state.currentGene, onChange: this.handleChange },
            this.state.testGenes.map(function (gene) {
              return _react2.default.createElement(_MenuItem2.default, { key: gene + '-menu', value: gene, primaryText: gene });
            })
          )
        ),
        _react2.default.createElement(
          _RegionViewer2.default,
          {
            css: _styles2.default,
            width: 1100,
            regions: canonicalExons,
            padding: 80,
            regionAttributes: attributeConfig
          },
          variantsComponent0,
          variantsComponent1,
          variantsComponent2,
          variantsComponent3,
          _react2.default.createElement(_TranscriptTrack2.default, {
            transcriptsGrouped: transcriptsGrouped,
            height: 15
          })
        )
      );
    }
  }]);

  return VDSPage;
}(_react.Component);

exports.default = VDSPage;