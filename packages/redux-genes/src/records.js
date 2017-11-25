// https://gist.github.com/jareware/5f492d47fae45d577e922c431c267c67

import {
  Record,
  List,
  Map,
  OrderedMap,
  Set,
  fromJS as originalFromJS,
} from 'immutable'

export const createRecords = (config) => {
  const State = Record({
    isFetching: false,
    byGeneName: OrderedMap(),
    allGeneNames: Set(),
    currentGene: config.startingGene,
    currentTissue: null,
    currentTranscript: null,
    transcriptFanOut: false,
    currentExon: null,
    currentConstrainedRegion: null,
  })

  const Transcript = Record({
    chrom: null,
    start: null,
    stop: null,
    xstart: null,
    xstop: null,
    transcript_id: null,
    strand: null,
    exons: new List(),
    gtex_tissue_tpms_by_transcript: new Map(),
  })

  const Gene = Record({
    omim_description: null,
    stop: null,
    gene_id: null,
    omim_accession: null,
    chrom: null,
    strand: null,
    full_gene_name: null,
    gene_name_upper: null,
    other_names: null,
    canonical_transcript: null,
    start: null,
    xstop: null,
    xstart: null,
    gene_name: null,
    transcript: new Transcript(),
    transcripts: new List(),
  })


  const Exon = Record({
    chrom: null,
    start: null,
    stop: null,
    strand: null,
    feature_type: null,
  })

  const recordTypes = new Map({
    Gene,
    Transcript,
    Exon,
  })

  const fromJS = (function () {
    const fromJS = (json) => {
      return originalFromJS(json)
    }

    recordTypes.forEach((Type, name) => fromJS[name] = (any => new Type(fromJS(any))))

    fromJS.Exon = any => new Exon(fromJS(any))

    fromJS.Transcript = any => new Transcript(fromJS(any))
      .update('exons', exons => exons.map(fromJS.Exon))

    fromJS.Gene = any => new Gene(fromJS(any))
      .update('transcript', transcript => fromJS.Transcript(transcript))
      .update('transcripts', list => list.map(fromJS.Transcript))

    fromJS.State = any => new State(fromJS(any))
      .update('gene', gene => fromJS.Gene(gene))

    return fromJS
  }())

  return {
    State,
    Transcript,
    Gene,
    Exon,
    fromJS,
  }
}
