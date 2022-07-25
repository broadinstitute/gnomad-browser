
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

// To parse this data:
//
//   import { Convert, VariantDetailResponseV312 } from "./file";
//
//   const variantDetailResponseV312 = Convert.toVariantDetailResponseV312(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface VariantDetailResponseV312 {
    data: Data;
}

export interface Data {
    variant:         Variant;
    clinvar_variant: ClinvarVariant;
    liftover:        LiftoverElement[];
    meta:            Meta;
}

export interface ClinvarVariant {
    clinical_significance: string;
    clinvar_variation_id:  string;
    gold_stars:            number;
    last_evaluated:        Date;
    review_status:         string;
    submissions:           Submission[];
}

export interface Submission {
    clinical_significance: string;
    conditions:            Condition[];
    last_evaluated:        Date;
    review_status:         string;
    submitter_name:        string;
}

export interface Condition {
    name:      string;
    medgen_id: string;
}

export interface LiftoverElement {
    liftover: LiftoverLiftover;
    datasets: string[];
}

export interface LiftoverLiftover {
    variant_id:       string;
    reference_genome: string;
}

export interface Meta {
    clinvar_release_date: Date;
}

export interface Variant {
    variant_id:                string;
    reference_genome:          string;
    chrom:                     string;
    pos:                       number;
    ref:                       string;
    alt:                       string;
    caid:                      string;
    colocated_variants:        any[];
    coverage:                  Coverage;
    multi_nucleotide_variants: null;
    exome:                     VariantExome;
    genome:                    VariantExome;
    flags:                     any[];
    lof_curations:             LofCuration[];
    rsids:                     string[];
    transcript_consequences:   TranscriptConsequence[];
    in_silico_predictors:      null;
}

export interface Coverage {
    exome:  CoverageExome;
    genome: CoverageExome;
}

export interface CoverageExome {
    mean: number;
}

export interface VariantExome {
    ac:               number;
    an:               number;
    ac_hemi:          number;
    ac_hom:           number;
    faf95:            Faf95;
    filters:          any[];
    populations:      Population[];
    age_distribution: AgeDistribution;
    quality_metrics:  QualityMetrics;
}

export interface AgeDistribution {
    het: Het;
    hom: Het;
}

export interface Het {
    bin_edges: number[];
    bin_freq:  number[];
    n_smaller: number;
    n_larger:  number;
}

export interface Faf95 {
    popmax:            number;
    popmax_population: string;
}

export interface Population {
    id:      string;
    ac:      number;
    an:      number;
    ac_hemi: number | null;
    ac_hom:  number;
}

export interface QualityMetrics {
    allele_balance:       AlleleBalance;
    genotype_depth:       Genotype;
    genotype_quality:     Genotype;
    site_quality_metrics: SiteQualityMetric[];
}

export interface AlleleBalance {
    alt: Alt;
}

export interface Alt {
    bin_edges: number[];
    bin_freq:  number[];
    n_smaller: number;
    n_larger:  number;
}

export interface Genotype {
    all: Het;
    alt: Het;
}

export interface SiteQualityMetric {
    metric: string;
    value:  number | null;
}

export interface LofCuration {
    gene_id:     string;
    gene_symbol: string;
    verdict:     string;
    flags:       any[];
    project:     string;
}

export interface TranscriptConsequence {
    domains:                string[] | null;
    gene_id:                string;
    gene_version:           string;
    gene_symbol:            string;
    hgvs:                   string;
    hgvsc:                  string;
    hgvsp:                  null | string;
    is_canonical:           boolean | null;
    is_mane_select:         null;
    is_mane_select_version: null;
    lof:                    null | string;
    lof_flags:              null;
    lof_filter:             null;
    major_consequence:      string;
    polyphen_prediction:    null;
    sift_prediction:        null;
    transcript_id:          string;
    transcript_version:     string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toVariantDetailResponseV312(json: string): VariantDetailResponseV312 {
        return cast(JSON.parse(json), r("VariantDetailResponseV312"));
    }

    public static variantDetailResponseV312ToJson(value: VariantDetailResponseV312): string {
        return JSON.stringify(uncast(value, r("VariantDetailResponseV312")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "VariantDetailResponseV312": o([
        { json: "data", js: "data", typ: r("Data") },
    ], false),
    "Data": o([
        { json: "variant", js: "variant", typ: r("Variant") },
        { json: "clinvar_variant", js: "clinvar_variant", typ: r("ClinvarVariant") },
        { json: "liftover", js: "liftover", typ: a(r("LiftoverElement")) },
        { json: "meta", js: "meta", typ: r("Meta") },
    ], false),
    "ClinvarVariant": o([
        { json: "clinical_significance", js: "clinical_significance", typ: "" },
        { json: "clinvar_variation_id", js: "clinvar_variation_id", typ: "" },
        { json: "gold_stars", js: "gold_stars", typ: 0 },
        { json: "last_evaluated", js: "last_evaluated", typ: Date },
        { json: "review_status", js: "review_status", typ: "" },
        { json: "submissions", js: "submissions", typ: a(r("Submission")) },
    ], false),
    "Submission": o([
        { json: "clinical_significance", js: "clinical_significance", typ: "" },
        { json: "conditions", js: "conditions", typ: a(r("Condition")) },
        { json: "last_evaluated", js: "last_evaluated", typ: Date },
        { json: "review_status", js: "review_status", typ: "" },
        { json: "submitter_name", js: "submitter_name", typ: "" },
    ], false),
    "Condition": o([
        { json: "name", js: "name", typ: "" },
        { json: "medgen_id", js: "medgen_id", typ: "" },
    ], false),
    "LiftoverElement": o([
        { json: "liftover", js: "liftover", typ: r("LiftoverLiftover") },
        { json: "datasets", js: "datasets", typ: a("") },
    ], false),
    "LiftoverLiftover": o([
        { json: "variant_id", js: "variant_id", typ: "" },
        { json: "reference_genome", js: "reference_genome", typ: "" },
    ], false),
    "Meta": o([
        { json: "clinvar_release_date", js: "clinvar_release_date", typ: Date },
    ], false),
    "Variant": o([
        { json: "variant_id", js: "variant_id", typ: "" },
        { json: "reference_genome", js: "reference_genome", typ: "" },
        { json: "chrom", js: "chrom", typ: "" },
        { json: "pos", js: "pos", typ: 0 },
        { json: "ref", js: "ref", typ: "" },
        { json: "alt", js: "alt", typ: "" },
        { json: "caid", js: "caid", typ: "" },
        { json: "colocated_variants", js: "colocated_variants", typ: a("any") },
        { json: "coverage", js: "coverage", typ: r("Coverage") },
        { json: "multi_nucleotide_variants", js: "multi_nucleotide_variants", typ: null },
        { json: "exome", js: "exome", typ: r("VariantExome") },
        { json: "genome", js: "genome", typ: r("VariantExome") },
        { json: "flags", js: "flags", typ: a("any") },
        { json: "lof_curations", js: "lof_curations", typ: a(r("LofCuration")) },
        { json: "rsids", js: "rsids", typ: a("") },
        { json: "transcript_consequences", js: "transcript_consequences", typ: a(r("TranscriptConsequence")) },
        { json: "in_silico_predictors", js: "in_silico_predictors", typ: null },
    ], false),
    "Coverage": o([
        { json: "exome", js: "exome", typ: r("CoverageExome") },
        { json: "genome", js: "genome", typ: r("CoverageExome") },
    ], false),
    "CoverageExome": o([
        { json: "mean", js: "mean", typ: 3.14 },
    ], false),
    "VariantExome": o([
        { json: "ac", js: "ac", typ: 0 },
        { json: "an", js: "an", typ: 0 },
        { json: "ac_hemi", js: "ac_hemi", typ: 0 },
        { json: "ac_hom", js: "ac_hom", typ: 0 },
        { json: "faf95", js: "faf95", typ: r("Faf95") },
        { json: "filters", js: "filters", typ: a("any") },
        { json: "populations", js: "populations", typ: a(r("Population")) },
        { json: "age_distribution", js: "age_distribution", typ: r("AgeDistribution") },
        { json: "quality_metrics", js: "quality_metrics", typ: r("QualityMetrics") },
    ], false),
    "AgeDistribution": o([
        { json: "het", js: "het", typ: r("Het") },
        { json: "hom", js: "hom", typ: r("Het") },
    ], false),
    "Het": o([
        { json: "bin_edges", js: "bin_edges", typ: a(0) },
        { json: "bin_freq", js: "bin_freq", typ: a(0) },
        { json: "n_smaller", js: "n_smaller", typ: 0 },
        { json: "n_larger", js: "n_larger", typ: 0 },
    ], false),
    "Faf95": o([
        { json: "popmax", js: "popmax", typ: 3.14 },
        { json: "popmax_population", js: "popmax_population", typ: "" },
    ], false),
    "Population": o([
        { json: "id", js: "id", typ: "" },
        { json: "ac", js: "ac", typ: 0 },
        { json: "an", js: "an", typ: 0 },
        { json: "ac_hemi", js: "ac_hemi", typ: u(0, null) },
        { json: "ac_hom", js: "ac_hom", typ: 0 },
    ], false),
    "QualityMetrics": o([
        { json: "allele_balance", js: "allele_balance", typ: r("AlleleBalance") },
        { json: "genotype_depth", js: "genotype_depth", typ: r("Genotype") },
        { json: "genotype_quality", js: "genotype_quality", typ: r("Genotype") },
        { json: "site_quality_metrics", js: "site_quality_metrics", typ: a(r("SiteQualityMetric")) },
    ], false),
    "AlleleBalance": o([
        { json: "alt", js: "alt", typ: r("Alt") },
    ], false),
    "Alt": o([
        { json: "bin_edges", js: "bin_edges", typ: a(3.14) },
        { json: "bin_freq", js: "bin_freq", typ: a(0) },
        { json: "n_smaller", js: "n_smaller", typ: 0 },
        { json: "n_larger", js: "n_larger", typ: 0 },
    ], false),
    "Genotype": o([
        { json: "all", js: "all", typ: r("Het") },
        { json: "alt", js: "alt", typ: r("Het") },
    ], false),
    "SiteQualityMetric": o([
        { json: "metric", js: "metric", typ: "" },
        { json: "value", js: "value", typ: u(3.14, null) },
    ], false),
    "LofCuration": o([
        { json: "gene_id", js: "gene_id", typ: "" },
        { json: "gene_symbol", js: "gene_symbol", typ: "" },
        { json: "verdict", js: "verdict", typ: "" },
        { json: "flags", js: "flags", typ: a("any") },
        { json: "project", js: "project", typ: "" },
    ], false),
    "TranscriptConsequence": o([
        { json: "domains", js: "domains", typ: u(a(""), null) },
        { json: "gene_id", js: "gene_id", typ: "" },
        { json: "gene_version", js: "gene_version", typ: "" },
        { json: "gene_symbol", js: "gene_symbol", typ: "" },
        { json: "hgvs", js: "hgvs", typ: "" },
        { json: "hgvsc", js: "hgvsc", typ: "" },
        { json: "hgvsp", js: "hgvsp", typ: u(null, "") },
        { json: "is_canonical", js: "is_canonical", typ: u(true, null) },
        { json: "is_mane_select", js: "is_mane_select", typ: null },
        { json: "is_mane_select_version", js: "is_mane_select_version", typ: null },
        { json: "lof", js: "lof", typ: u(null, "") },
        { json: "lof_flags", js: "lof_flags", typ: null },
        { json: "lof_filter", js: "lof_filter", typ: null },
        { json: "major_consequence", js: "major_consequence", typ: "" },
        { json: "polyphen_prediction", js: "polyphen_prediction", typ: null },
        { json: "sift_prediction", js: "sift_prediction", typ: null },
        { json: "transcript_id", js: "transcript_id", typ: "" },
        { json: "transcript_version", js: "transcript_version", typ: "" },
    ], false),
};
