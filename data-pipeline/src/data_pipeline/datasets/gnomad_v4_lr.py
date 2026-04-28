import itertools
import hail as hl
from data_pipeline.helpers.xposition import x_position

from data_pipeline.data_types.variant.transcript_consequence.annotate_transcript_consequences import (
    OMIT_CONSEQUENCE_TERMS,
)
from data_pipeline.data_types.variant.transcript_consequence.vep import consequence_term_rank

from pprint import pp

#
#   INFO/allele_length: Allele length - positive for insertions, negative for deletions and 0 for SNVs.
#   INFO/allele_type: Allele type, which is one of the below.
#       snv: Single nucleotide variant.
#       ins: Insertion.
#       del: Deletion.
#       dup: Tandem duplication.
#       dup_interspersed: Interspersed duplication.
#       complex_dup: Complex duplication.
#       inv_dup: Inverted duplication.
#       numt: Nuclear-mitochondrial segment.
#       trv: Tandem repeat.
#       alu_ins: ALU insertion.
#       line_ins: LINE insertion.
#       sva_ins: SVA insertion.
#       alu_del: ALU deletion.
#       line_del: LINE deletion.
#       sva_del: SVA deletion.
#   SOURCE: Source of call, which is one of the below.
#       DeepVariant: SNV or indel call made by the DeepVariant pipeline.
#       HPRC_SV_Integration: Structural variant call made by the HPRC SV Integration pipeline.
#       TRGT: Tandem repeat call made by TRGT.
#   ORIGIN: Origin of duplicated sequence for duplications and NUMTs.
#   SUB_FAMILY: Sub-family for MEI calls.
#   TRID: TR identifier for TR calls, as well as non-TR calls that that are completely enveloped by a TR call.
#   Functional Annotations.
#       vep: Annotations from the Variant Effect Predictor (VEP).
#       PREDICTED_: Annotations from SVAnnotate, which are all prefixed by PREDICTED_.
#   gnomAD_V4 Benchmarking.
#       gnomAD_V4_match_type: Method for generating match, which is one of the below.
#           EXACT_MATCH: Exact match across CHROM, POS, REF and ALT.
#           TRUVARI_{X}: Truvari match requiring X% sequence similarity.
#           BEDTOOLS_CLOSEST: Bedtools closest match finetuned for SVs.
#       gnomAD_V4_match_ID: Variant ID of matched variant.
#       gnomAD_V4_match_source: Source of matched variant, which is one of the below.
#           SNV_indel: SNV & indel callset.
#           SV: SV callset.
#   Allele Frequencies.
#       AN: Count of alleles genotyped.
#       AC: Count of non-reference alleles.
#       AF: Proportion of alleles that are non-reference.
#       NCR: Proportion of alleles that don't have a genotype call.
#       AP_allele: Allele purity per-allele (multiallelic sites only).
#       MC_allele: Motif count per-allele (multiallelic sites only).
#       LPS_allele: Longest polymer sequence per-allele (multiallelic sites only).
#   Filters.
#       LARGE_SNV_INDEL: Variant with SOURCE = "DeepVariant" that has INFO/allele_length ≥ 50.
#       SMALL_SV: Variant with SOURCE = "HPRC_SV_Integration" that has INFO/allele_length < 50.
#       TRGT_OVERLAPPED: Variant with SOURCE != "TRGT" that is completely enveloped by a call with SOURCE = "TRGT".

FREQ_FIELDS = [
    "AN",
    "AC",
    "AF",
    # "n_bi_genos",
    "nhomref",
    "nhet",
    "nhomalt",
    "freq_homref",
    "freq_het",
    "freq_homalt",
    #   "cn_number",
    #   "cn_count",
    #   "cn_freq",
    #   "cn_nonref_count",
    #   "cn_nonref_freq",
]

POPULATIONS = ["afr", "amr", "asj", "eas", "nfe", "sas"]

DIVISIONS = list(itertools.chain.from_iterable([pop, f"{pop}_XX", f"{pop}_XY"] for pop in POPULATIONS)) + [
    "XX",
    "XY",
]


def annotate_with_transcripts(variants, transcripts_path):
    transcripts = hl.read_table(transcripts_path)
    transcripts = transcripts.select("refseq_id", "refseq_version", "gene_id", "gene_version", "transcript_version")
    variants_with_transcript = variants.filter(variants.transcript_vep.length() > 0)

    variants_with_transcript = variants_with_transcript.key_by("variant_id")
    variants_with_transcript = variants_with_transcript.select("transcript_vep")
    variants_with_transcript = variants_with_transcript.explode("transcript_vep")
    variants_with_transcript = variants_with_transcript.annotate(
        transcript_id=variants_with_transcript.transcript_vep[6]
    )
    variants_with_transcript = variants_with_transcript.key_by("transcript_id")
    variants_with_transcript = variants_with_transcript.join(transcripts)
    variants_with_transcript = variants_with_transcript.annotate(
        transcript_consequences=hl.struct(
            consequence_terms=variants_with_transcript.transcript_vep[1].split("&"),
            domains=[variants_with_transcript.transcript_vep[47]],
            gene_symbol=variants_with_transcript.transcript_vep[3],
            hgvsc=hl.or_missing(
                ~(variants_with_transcript.transcript_vep[9] == ""),
                variants_with_transcript.transcript_vep[9].split(":")[-1],
            ),
            hgvsp=hl.or_missing(
                ~(variants_with_transcript.transcript_vep[10] == ""),
                variants_with_transcript.transcript_vep[10].split(":")[-1],
            ),
            is_canonical=(variants_with_transcript.transcript_vep[27] == hl.literal("YES")),
            is_mane_select=False,
            is_mane_select_version=False,
            #            is_mane_select=(~(variants_with_transcript.transcript_vep[28] == hl.literal('')) & (variants_with_transcript.transcript_vep[28].split("\\.")[0] ==  variants_with_transcript.transcript_vep[6])), # TK
            # is_mane_select_version=False,  # TK
            polyphen_prediction=hl.or_missing(
                ~(variants_with_transcript.transcript_vep[46] == ""), variants_with_transcript.transcript_vep[46]
            ),
            refseq_id=variants_with_transcript.refseq_id,
            refseq_version=variants_with_transcript.refseq_version,
            sift_prediction=variants_with_transcript.transcript_vep[45],
            transcript_id=variants_with_transcript.transcript_vep[6],
            gene_id=variants_with_transcript.gene_id,
            gene_version=variants_with_transcript.gene_version,
            transcript_version=variants_with_transcript.transcript_version,
        )
    )
    variants_with_transcript = (
        variants_with_transcript.group_by(variants_with_transcript.variant_id)
        .aggregate(transcript_consequences=hl.agg.collect(variants_with_transcript.transcript_consequences))
        .key_by("variant_id")
    )
    variants_with_transcript = variants_with_transcript.select("transcript_consequences")
    variants_with_transcript = variants_with_transcript.annotate(
        transcript_consequences=variants_with_transcript.transcript_consequences.map(
            lambda c: c.annotate(
                consequence_terms=c.consequence_terms.filter(
                    lambda t: ~(OMIT_CONSEQUENCE_TERMS.contains(t))  # pylint: disable=invalid-unary-operand-type
                )
            )
        ).filter(lambda c: c.consequence_terms.length() > 0)
    )
    variants_with_transcript = variants_with_transcript.filter(
        variants_with_transcript.transcript_consequences.length() > 0
    )
    variants_with_transcript = variants_with_transcript.annotate(
        transcript_consequences=variants_with_transcript.transcript_consequences.map(
            lambda tc: tc.annotate(major_consequence=hl.sorted(tc.consequence_terms, key=consequence_term_rank)[0])
        )
    )

    variants = variants.join(variants_with_transcript, "left")
    variants = variants.drop("transcript_vep")
    # TK mark intergenic
    # TK what to do with motif and regulatory vep?
    return variants


def import_variants_from_vcfs(vcf_path, transcripts_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True, reference_genome="GRCh38", array_elements_required=False)
    ds = ds.rows()
    ds = ds.annotate(variant_id=ds.rsid.replace("^chr", ""))
    ds = ds.key_by(ds.variant_id)
    # Allele
    # Consequence
    # IMPACT
    # SYMBOL
    # Gene
    # Feature_type
    # Feature
    # BIOTYPE
    # EXON
    # INTRON
    # HGVSc
    # HGVSp
    # cDNA_position
    # CDS_position
    # Protein_position
    # Amino_acids
    # Codons
    # Existing_variation
    # ALLELE_NUM
    # DISTANCE
    # STRAND
    # FLAGS
    # PICK
    # VARIANT_CLASS
    # MINIMISED
    # SYMBOL_SOURCE
    # HGNC_ID
    # CANONICAL
    # MANE_SELECT
    # MANE_PLUS_CLINICAL
    # TSL
    # APPRIS
    # CCDS
    # ENSP
    # SWISSPROT
    # TREMBL
    # UNIPARC
    # UNIPROT_ISOFORM
    # REFSEQ_MATCH
    # SOURCE
    # REFSEQ_OFFSET
    # GIVEN_REF
    # USED_REF
    # BAM_EDIT
    # GENE_PHENO
    # SIFT
    # PolyPhen
    # DOMAINS
    # miRNA
    # HGVS_OFFSET
    # AF
    # AFR_AF
    # AMR_AF
    # EAS_AF
    # EUR_AF
    # SAS_AF
    # AA_AF
    # EA_AF
    # gnomAD_AF
    # gnomAD_AFR_AF
    # gnomAD_AMR_AF
    # gnomAD_ASJ_AF
    # gnomAD_EAS_AF
    # gnomAD_FIN_AF
    # gnomAD_NFE_AF
    # gnomAD_OTH_AF
    # gnomAD_SAS_AF
    # MAX_AF
    # MAX_AF_POPS
    # CLIN_SIG
    # SOMATIC
    # PHENO
    # PUBMED
    # MOTIF_NAME
    # MOTIF_POS
    # HIGH_INF_POS
    # MOTIF_SCORE_CHANGE
    # TRANSCRIPTION_FACTORS

    # VEP fields of note (0-indexed):

    # 1: Consequences (seperated with "&")
    # 3: gene symbol
    # 5: feature type (blank, Transcript, MotifFeature, or RegulatoryFeature
    # 6: feature ID
    # 10: HGVSc
    # 11: HGVSp
    # 22: PICK (i.e. this entry is to be used)
    # 27: CANONICAL
    # 28: MANE_SELECT
    # 45: Sift prediction
    # 46: PolyPhen prediction
    # 47: domains
    ds = ds.annotate(vep=ds.info.vep)

    # Split each VEP entry into an array and keep only those with the PICK bit set
    ds = ds.annotate(
        vep=ds.vep.map(lambda vep_string: vep_string.split("\\|")).filter(
            lambda vep_entry: vep_entry[22] == hl.literal("1")
        )
    )

    ds = ds.annotate(
        intergenic_vep=ds.vep.filter(lambda vep: vep[5] == hl.literal("")),
        transcript_vep=ds.vep.filter(lambda vep: vep[5] == hl.literal("Transcript")),
        motif_vep=ds.vep.filter(lambda vep: vep[5] == hl.literal("MotifFeature")),
        regulatory_vep=ds.vep.filter(lambda vep: vep[5] == hl.literal("RegulatoryFeature")),
    )
    ds = ds.drop("vep")

    ds = annotate_with_transcripts(ds, transcripts_path)

    ds = ds.annotate(
        reference_genome="GRCh38",
        chrom=ds.locus.contig.replace("chr", ""),
        pos=ds.locus.position,
        end=ds.info.END,
        length=ds.info.SVLEN,
        allele_type=ds.info.allele_type,
        ref=ds.alleles[0],
        alt=ds.alleles[1],
        genes=ds.transcript_consequences.map(lambda tc: tc.gene_id),  # TK de-dup
        short_read_match_type=hl.or_missing(
            ~hl.is_missing(ds.info.gnomAD_V4_match_type), ds.info.gnomAD_V4_match_type[0]
        ),
        short_read_match_id=hl.or_missing(~hl.is_missing(ds.info.gnomAD_V4_match_ID), ds.info.gnomAD_V4_match_ID[0]),
        short_read_match_source=hl.or_missing(
            ~hl.is_missing(ds.info.gnomAD_V4_match_source), ds.info.gnomAD_V4_match_source[0]
        ),
        enveloping_tr_id=hl.or_missing(ds.info.TR_ENVELOPED, ds.info.TRID.replace("chr", "")),
        is_likely_tr=ds.info.TR_PARSED,
        gene_region=ds.info.REGION,
        motifs=ds.info.MOTIFS,
        gnomad_str=ds.info.gnomAD_STR,
        filters=ds.filters,
        # TK coverage
        # TK trv spanning_depth
        # TK in silico
        # TK age dist
        # TK genotype quality metrics
        # TK site quality metrics
        # TK grpmax (ancestry group or none)
        # TK allele length
        # TK dbsnp
        # TK predicted
    )

    enveloped_ids_by_enveloping_id = (
        ds.filter(ds.info.TR_ENVELOPED).select("enveloping_tr_id").key_by("enveloping_tr_id").select_globals()
    )
    enveloped_ids_by_enveloping_id = enveloped_ids_by_enveloping_id.group_by("enveloping_tr_id").aggregate(
        enveloped_ids=hl.agg.collect(enveloped_ids_by_enveloping_id.variant_id)
    )
    ds = ds.join(enveloped_ids_by_enveloping_id, "left")

    ds = ds.annotate(
        xpos=x_position(ds.chrom, ds.pos),
        xend=x_position(ds.chrom, ds.end),
    )

    ds = ds.annotate(
        freq=hl.struct(
            **{field.lower(): ds.info[field] for field in FREQ_FIELDS},
            populations=[
                hl.struct(id=division, **{field.lower(): ds.info[f"{field}_{division}"] for field in FREQ_FIELDS})
                for division in DIVISIONS
            ],
        )
    )

    ds = ds.annotate(
        freq=ds.freq.annotate(
            ac=ds.freq.ac[0],
            af=ds.freq.af[0],
        )
    )

    ds = ds.annotate(
        freq=ds.freq.rename(
            {
                "nhomref": "homozygote_ref_count",
                "nhomalt": "homozygote_alt_count",
                "nhet": "heterozygote_count",
                "freq_homref": "homozygote_ref_freq",
                "freq_homalt": "homozygote_alt_freq",
                "freq_het": "heterozygote_freq",
            }
        )
    )

    ds = ds.annotate(
        freq=ds.freq.annotate(
            populations=ds.freq.populations.map(
                lambda pop_struct: pop_struct.annotate(ac=pop_struct.ac[0], af=pop_struct.af[0]).rename(
                    {
                        "nhomref": "homozygote_ref_count",
                        "nhomalt": "homozygote_alt_count",
                        "nhet": "heterozygote_count",
                        "freq_homref": "homozygote_ref_freq",
                        "freq_homalt": "homozygote_alt_freq",
                        "freq_het": "heterozygote_freq",
                    }
                )
            )
        )
    )
    ds = ds.annotate(freq=hl.struct(all=ds.freq))
    ds = ds.annotate(freq=ds.freq.annotate(populations=ds.freq.all.populations))
    ds = ds.annotate(freq=ds.freq.annotate(all=ds.freq.all.drop("populations")))

    ds = ds.annotate(rsids=[ds.rsid])

    ds = ds.drop("alleles", "info")
    return ds
