#!/usr/bin/env python

import argparse
import hail
from hail.expr import TInt, TDouble, TString
from pprint import pprint
from utils.elasticsearch_utils import export_kt_to_elasticsearch

p = argparse.ArgumentParser()
p.add_argument("-H", "--host", help="Elasticsearch node host or IP. To look this up, run: `kubectl describe nodes | grep Addresses`", required=True)
p.add_argument("-p", "--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("-i", "--index", help="Elasticsearch index name", default="my_index")
p.add_argument("-t", "--type", help="Elasticsearch index type", default="position")
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=100, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

# parse args
args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

FILE_PATH = 'gs://gnomad-browser/datasets/gtex_tissues_by_transcript_all_171012.csv'

types = {
    'adiposeSubcutaneous': TDouble(),
    'adiposeVisceralOmentum': TDouble(),
    'adrenalGland': TDouble(),
    'arteryAorta': TDouble(),
    'arteryCoronary': TDouble(),
    'arteryTibial': TDouble(),
    'bladder': TDouble(),
    'brainAmygdala': TDouble(),
    'brainAnteriorcingulatecortexBa24': TDouble(),
    'brainCaudateBasalganglia': TDouble(),
    'brainCerebellarhemisphere': TDouble(),
    'brainCerebellum': TDouble(),
    'brainCortex': TDouble(),
    'brainFrontalcortexBa9': TDouble(),
    'brainHippocampus': TDouble(),
    'brainHypothalamus': TDouble(),
    'brainNucleusaccumbensBasalganglia': TDouble(),
    'brainPutamenBasalganglia': TDouble(),
    'brainSpinalcordCervicalc1': TDouble(),
    'brainSubstantianigra': TDouble(),
    'breastMammarytissue': TDouble(),
    'cellsEbvTransformedlymphocytes': TDouble(),
    'cellsTransformedfibroblasts': TDouble(),
    'cervixEctocervix': TDouble(),
    'cervixEndocervix': TDouble(),
    'colonSigmoid': TDouble(),
    'colonTransverse': TDouble(),
    'esophagusGastroesophagealjunction': TDouble(),
    'esophagusMucosa': TDouble(),
    'esophagusMuscularis': TDouble(),
    'fallopianTube': TDouble(),
    'heartAtrialappendage': TDouble(),
    'heartLeftventricle': TDouble(),
    'kidneyCortex': TDouble(),
    'liver': TDouble(),
    'lung': TDouble(),
    'minorSalivaryGland': TDouble(),
    'muscleSkeletal': TDouble(),
    'nerveTibial': TDouble(),
    'ovary': TDouble(),
    'pancreas': TDouble(),
    'pituitary': TDouble(),
    'prostate': TDouble(),
    'skinNotsunexposedSuprapubic': TDouble(),
    'skinSunexposedLowerleg': TDouble(),
    'smallIntestineTerminalileum': TDouble(),
    'spleen': TDouble(),
    'stomach': TDouble(),
    'testis': TDouble(),
    'thyroid': TDouble(),
    'uterus': TDouble(),
    'vagina': TDouble(),
    'wholeBlood': TDouble(),
    'transcriptId': TString(),
    'geneId': TString(),
}

kt = hc.import_table(FILE_PATH, types=types, delimiter=',')

kt = kt.rename({
    '': 'index',
})

print(kt.schema)
print("======== Export CSV to elasticsearch ======")
export_kt_to_elasticsearch(
    kt,
    host=args.host,
    port=args.port,
    index_name=args.index,
    index_type_name=args.type,
    num_shards=args.num_shards,
    block_size=args.block_size,
    delete_index_before_exporting=True,
    verbose=True
)
